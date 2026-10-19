package com.buddychat.buddy;

import static com.buddychat.TestJwtConfiguration.token;
import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.FlowTest;
import com.buddychat.MutableClock;
import com.buddychat.TestSocket;
import com.buddychat.chat.Message;
import com.buddychat.room.Invitation;
import com.buddychat.room.Room;
import com.buddychat.room.RoomView;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@FlowTest
class BuddyFlowTest {

    @LocalServerPort
    int port;

    @Autowired
    MutableClock clock;

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    BuddyService buddyService;

    @Autowired
    JsonMapper json;

    @Autowired
    UserService userService;

    @Autowired
    BuddyExpScale expScale;

    private WebTestClient http;
    private final List<TestSocket> sockets = new ArrayList<>();

    record Care(BuddyView buddy, boolean changed) {}

    @BeforeEach
    void setUp() {
        clock.reset();
        Flux.just(Room.class, Invitation.class, User.class, Message.class)
                .flatMap(type -> mongo.remove(new Query(), type))
                .blockLast();
        http = WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .responseTimeout(Duration.ofSeconds(20))
                .build();
    }

    @AfterEach
    void closeSockets() {
        sockets.forEach(TestSocket::close);
    }

    @Test
    void newBuddyIsAFullCleanEgg() {
        BuddyView buddy = createRoom("henry").buddy();

        assertThat(buddy.stage()).isEqualTo(BuddyRules.Stage.EGG);
        assertThat(buddy.level()).isEqualTo(1);
        assertThat(buddy.fullness()).isEqualTo(100);
        assertThat(buddy.poops()).isZero();
        assertThat(buddy.canFeed()).isFalse();
        assertThat(buddy.canClean()).isFalse();
    }

    @Test
    void feedingANotHungryBuddyChangesNothing() {
        createRoom("henry");

        Care care = care("henry", "feed");

        assertThat(care.changed()).isFalse();
        assertThat(care.buddy().exp()).isZero();
        assertThat(timeline("henry")).isEmpty();
    }

    @Test
    void getsHungryOverTimeAndIsNoticedOnce() {
        createRoom("henry");
        clock.advance(BuddyRules.hungryAfter());

        BuddyView buddy = room("henry").buddy();
        room("henry"); // looking again does not repeat the event

        assertThat(buddy.hungry()).isTrue();
        assertThat(buddy.canFeed()).isTrue();
        assertThat(buddy.fullness()).isLessThanOrEqualTo(30);
        // Poops came meanwhile too, each once.
        long poops = Math.min(3, BuddyRules.hungryAfter().dividedBy(BuddyRules.poopEvery()));
        assertThat(timeline("henry")).containsOnlyOnce("HUNGRY");
        assertThat(timeline("henry")).filteredOn("POOPED"::equals).hasSize((int) poops);
    }

    @Test
    void feedingRestoresFullnessGivesExpAndLeavesATimelineEvent() {
        createRoom("henry");
        clock.advance(BuddyRules.hungryAfter());

        Care care = care("henry", "feed");

        assertThat(care.changed()).isTrue();
        assertThat(care.buddy().fullness()).isEqualTo(100);
        assertThat(care.buddy().exp()).isEqualTo(BuddyRules.FEED_EXP);
        assertThat(timeline("henry")).containsExactly("FED");
    }

    @Test
    void bothMembersFeedingAtOnceFeedsItOnce() {
        duoRoom("henry", "yuki");
        clock.advance(BuddyRules.hungryAfter());

        List<Boolean> changed =
                race(8, i -> care(i % 2 == 0 ? "henry" : "yuki", "feed").changed());

        assertThat(changed).containsOnlyOnce(true);
        assertThat(room("henry").buddy().exp()).isEqualTo(BuddyRules.FEED_EXP);
        assertThat(timeline("henry")).containsOnlyOnce("FED");
    }

    @Test
    void eachTapCleansOnePoopAndTheLastLeavesOneLine() {
        duoRoom("henry", "yuki");
        clock.advance(BuddyRules.poopEvery().multipliedBy(2).plusMinutes(1)); // two poops
        assertThat(room("henry").buddy().poops()).isEqualTo(2);

        Care first = care("henry", "clean");
        room("henry"); // looking again does not bring the cleaned poop back
        Care second = care("yuki", "clean");
        Care third = care("henry", "clean");

        assertThat(first.changed()).isTrue();
        assertThat(first.buddy().poops()).isEqualTo(1);
        assertThat(second.changed()).isTrue();
        assertThat(second.buddy().poops()).isZero();
        assertThat(third.changed()).isFalse();
        assertThat(room("henry").buddy().exp()).isEqualTo(2 * BuddyRules.CLEAN_EXP);
        assertThat(timeline("henry")).filteredOn("POOPED"::equals).hasSize(2);
        assertThat(timeline("henry")).containsOnlyOnce("CLEANED");

        // A clean floor starts over: the next poop comes a full period later.
        clock.advance(BuddyRules.poopEvery().minusMinutes(1));
        assertThat(room("henry").buddy().poops()).isZero();
        clock.advance(Duration.ofMinutes(2));
        assertThat(room("henry").buddy().poops()).isEqualTo(1);
    }

    @Test
    void aGrownUpNoLongerPoopsAndEarnsFromWorkOnceAnHour() {
        String roomId = duoRoom("henry", "yuki");
        setExp(roomId, BuddyRules.minExp(BuddyRules.ADULT_AT));
        clock.advance(BuddyRules.poopEvery().multipliedBy(3));
        assertThat(room("henry").buddy().poops()).isZero();
        assertThat(timeline("henry")).doesNotContain("POOPED");
        int before = room("henry").buddy().exp();

        Care first = care("henry", "work");
        Care tooSoon = care("yuki", "work");

        assertThat(first.changed()).isTrue();
        assertThat(tooSoon.changed()).isFalse(); // it may work, but EXP comes once an hour
        assertThat(room("henry").buddy().exp()).isEqualTo(before + BuddyRules.WORK_EXP);
        assertThat(timeline("henry")).containsOnlyOnce("WORKED");

        clock.advance(BuddyRules.WORK_EVERY);
        assertThat(care("yuki", "work").changed()).isTrue();
        assertThat(room("henry").buddy().exp()).isEqualTo(before + 2 * BuddyRules.WORK_EXP);
    }

    @Test
    void aTripToTheHotSpringAfterAWhileGivesExpOnce() {
        String roomId = duoRoom("henry", "yuki");
        assertThat(care("henry", "bath").changed()).isFalse(); // an egg does not go
        setExp(roomId, BuddyRules.minExp(BuddyRules.BABY_AT));
        int before = room("henry").buddy().exp();

        Care first = care("henry", "bath");
        Care again = care("yuki", "bath");

        assertThat(first.changed()).isTrue();
        assertThat(again.changed()).isFalse(); // it was there just now, for either member
        assertThat(room("henry").buddy().exp()).isEqualTo(before + BuddyRules.BATH_EXP);
        assertThat(timeline("henry")).containsOnlyOnce("BATHED");

        clock.advance(BuddyRules.BATH_EVERY.minusMinutes(1));
        assertThat(care("yuki", "bath").changed()).isFalse();
        clock.advance(Duration.ofMinutes(1));
        assertThat(care("yuki", "bath").changed()).isTrue();
        assertThat(room("henry").buddy().exp()).isEqualTo(before + 2 * BuddyRules.BATH_EXP);
    }

    @Test
    void bothGoingToTheHotSpringAtOnceGivesExpOnce() {
        String roomId = duoRoom("henry", "yuki");
        setExp(roomId, BuddyRules.minExp(BuddyRules.BABY_AT));
        int before = room("henry").buddy().exp();

        List<Boolean> changed =
                race(4, i -> care(i % 2 == 0 ? "henry" : "yuki", "bath").changed());

        assertThat(changed).containsOnlyOnce(true);
        assertThat(room("henry").buddy().exp()).isEqualTo(before + BuddyRules.BATH_EXP);
    }

    @Test
    void workInTheChatSendsAGrownUpToWorkAndIsJustAMessageBefore() {
        String roomId = duoRoom("henry", "yuki");
        TestSocket henry = connect("henry");
        henry.send(Map.of("type", "send", "clientMessageId", "w-1", "text", "일"))
                .expect("ack");
        await(() -> room("henry").buddy().exp() == 1); // a child has no station: just a message
        assertThat(timeline("henry")).doesNotContain("WORKED");

        setExp(roomId, BuddyRules.minExp(BuddyRules.ADULT_AT));
        int before = room("henry").buddy().exp();
        henry.send(Map.of("type", "send", "clientMessageId", "w-2", "text", "일!"));
        await(() -> timeline("henry").contains("WORKED"));
        assertThat(room("henry").buddy().exp()).isEqualTo(before + 1 + BuddyRules.WORK_EXP);
    }

    @Test
    void tapsOnTheSamePoopAtOnceCleanItOnce() {
        duoRoom("henry", "yuki");
        clock.advance(BuddyRules.poopEvery().plusMinutes(1)); // one poop

        List<Boolean> changed =
                race(6, i -> care(i % 2 == 0 ? "henry" : "yuki", "clean").changed());

        assertThat(changed).containsOnlyOnce(true);
        assertThat(room("henry").buddy().exp()).isEqualTo(BuddyRules.CLEAN_EXP);
    }

    @Test
    void theTopLevelSaysThanksOnceAndStaysThere() {
        String roomId = createRoom("henry").id();
        int almost = (BuddyRules.MAX_LEVEL - 1) * BuddyRules.expPerLevel() - 1;
        mongo.updateFirst(
                        Query.query(Criteria.where("_id").is(new ObjectId(roomId))),
                        new Update().set("buddy.exp", almost),
                        "rooms")
                .block();

        buddyService.onMessageSent(roomId).block();
        buddyService.onMessageSent(roomId).block();

        BuddyView buddy = room("henry").buddy();
        assertThat(buddy.level()).isEqualTo(BuddyRules.MAX_LEVEL);
        assertThat(buddy.levelProgress()).isEqualTo(1.0);
        assertThat(buddy.grown()).isTrue();
        assertThat(timeline("henry")).containsExactly("MAX_LEVEL");
    }

    @Test
    void expKeepsCountingAtTheTopLevel() {
        String roomId = createRoom("henry").id();
        setExp(roomId, BuddyRules.minExp(BuddyRules.MAX_LEVEL));

        buddyService.onMessageSent(roomId).block();

        BuddyView buddy = room("henry").buddy();
        assertThat(buddy.level()).isEqualTo(BuddyRules.MAX_LEVEL);
        assertThat(buddy.exp()).isEqualTo(BuddyRules.minExp(BuddyRules.MAX_LEVEL) + BuddyRules.MESSAGE_EXP);
        assertThat(timeline("henry")).isEmpty();
    }

    @Test
    void growingUpSaysSoOnceButItGoesItsOwnWayOnlyAtTheTopLevel() {
        String roomId = createRoom("henry").id();
        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_CHANGE_FROM) - 1);

        buddyService.onMessageSent(roomId).block();
        buddyService.onMessageSent(roomId).block();

        BuddyView buddy = room("henry").buddy();
        assertThat(buddy.level()).isEqualTo(BuddyRules.JOB_CHANGE_FROM);
        assertThat(buddy.grown()).isFalse();
        assertThat(timeline("henry")).containsExactly("GROWN");
        assertThat(BuddyRules.GRADUATE_AT).isEqualTo(BuddyRules.MAX_LEVEL);

        setExp(roomId, BuddyRules.minExp(BuddyRules.MAX_LEVEL) - 1);
        assertThat(room("henry").buddy().grown()).isFalse();
        post("henry", "/api/rooms/me/buddy/graduate", Map.of("buddyName", "Mochi"))
                .expectStatus()
                .isEqualTo(409);
    }

    @Test
    void messageExpIsCappedPerDayEvenWhenSentConcurrently() {
        String roomId = createRoom("henry").id();

        race(
                BuddyRules.MESSAGE_EXP_DAILY_CAP + 15,
                i -> buddyService.onMessageSent(roomId).thenReturn(true).block());
        assertThat(room("henry").buddy().exp()).isEqualTo(BuddyRules.MESSAGE_EXP_DAILY_CAP);

        clock.advance(Duration.ofDays(1));
        buddyService.onMessageSent(roomId).block();
        assertThat(room("henry").buddy().exp()).isEqualTo(BuddyRules.MESSAGE_EXP_DAILY_CAP + 1);
    }

    @Test
    void hatchesWhenReachingTheBabyStage() {
        String roomId = createRoom("henry").id();
        setExp(roomId, BuddyRules.minExp(BuddyRules.BABY_AT) - 1);
        assertThat(room("henry").buddy().stage()).isEqualTo(BuddyRules.Stage.EGG);

        buddyService.onMessageSent(roomId).block();

        BuddyView buddy = room("henry").buddy();
        assertThat(buddy.level()).isEqualTo(BuddyRules.BABY_AT);
        assertThat(buddy.stage()).isEqualTo(BuddyRules.Stage.BABY);
        assertThat(timeline("henry")).containsExactly("EVOLVED");
    }

    @Test
    void stagesComeAtTheirLevels() {
        assertThat(BuddyRules.stage(BuddyRules.BABY_AT - 1)).isEqualTo(BuddyRules.Stage.EGG);
        assertThat(BuddyRules.stage(BuddyRules.CHILD_AT - 1)).isEqualTo(BuddyRules.Stage.BABY);
        assertThat(BuddyRules.stage(BuddyRules.CHILD_AT)).isEqualTo(BuddyRules.Stage.CHILD);
        assertThat(BuddyRules.stage(BuddyRules.ADULT_AT - 1)).isEqualTo(BuddyRules.Stage.CHILD);
        assertThat(BuddyRules.stage(BuddyRules.ADULT_AT)).isEqualTo(BuddyRules.Stage.ADULT);
    }

    @Test
    void aNewLevelIsInTheTimelineButAnEvolutionIsOneLine() {
        String roomId = createRoom("henry").id();

        // Level 2 (still an egg), then level 3 (hatching, an evolution).
        for (int i = 0; i < 2 * BuddyRules.expPerLevel(); i++)
            buddyService.onMessageSent(roomId).block();

        assertThat(timeline("henry")).containsExactly("LEVELED_UP", "EVOLVED");
        JsonNode levelUp = http.get()
                .uri("/api/rooms/me/messages?limit=2")
                .header("Authorization", "Bearer " + token("henry"))
                .exchange()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("messages")
                .get(1);
        assertThat(levelUp.get("text").asString()).isEqualTo("2");
    }

    @Test
    void bothTalkingOnTheSameDayGivesTheBonusOnceADay() {
        duoRoom("henry", "yuki");
        RoomView room = room("henry");
        String henry = room.members().get(0).id();
        String yuki = room.members().get(1).id();

        buddyService.talked(room.id(), henry).block();
        buddyService.talked(room.id(), henry).block();
        BuddyView alone = room("yuki").buddy();
        assertThat(alone.talkedToday()).containsExactly(henry);
        assertThat(alone.togetherToday()).isFalse();
        assertThat(alone.exp()).isZero();

        buddyService.talked(room.id(), yuki).block();
        buddyService.talked(room.id(), yuki).block();
        BuddyView both = room("henry").buddy();
        assertThat(both.talkedToday()).containsExactlyInAnyOrder(henry, yuki);
        assertThat(both.togetherToday()).isTrue();
        assertThat(both.exp()).isEqualTo(BuddyRules.TOGETHER_EXP);
        assertThat(timeline("henry")).containsOnlyOnce("TOGETHER");

        // A new day starts over.
        clock.advance(Duration.ofDays(1));
        BuddyView nextDay = room("henry").buddy();
        assertThat(nextDay.talkedToday()).isEmpty();
        assertThat(nextDay.togetherToday()).isFalse();
        buddyService.talked(room.id(), yuki).block();
        buddyService.talked(room.id(), henry).block();
        assertThat(room("henry").buddy().exp()).isEqualTo(2 * BuddyRules.TOGETHER_EXP);
        assertThat(timeline("henry")).filteredOn("TOGETHER"::equals).hasSize(2);
    }

    @Test
    void bothFirstMessagesAtOnceGiveTheBonusOnce() {
        duoRoom("henry", "yuki");
        RoomView room = room("henry");
        List<String> members = room.members().stream().map(RoomView.Member::id).toList();

        // Day after day, both first messages at once: each day's bonus comes once. Several days, as
        // one day's race does not always end with both in the list before either checks it.
        int days = 15;
        for (int day = 0; day < days; day++) {
            race(
                    6,
                    i -> buddyService
                            .talked(room.id(), members.get(i % 2))
                            .thenReturn(true)
                            .block());
            clock.advance(Duration.ofDays(1));
        }

        assertThat(room("henry").buddy().exp()).isEqualTo(days * BuddyRules.TOGETHER_EXP);
        assertThat(timeline("henry")).filteredOn("TOGETHER"::equals).hasSize(days);
    }

    @Test
    void talkingAloneGivesNoBonus() {
        String roomId = createRoom("henry").id();
        String henry = room("henry").members().get(0).id();

        buddyService.talked(roomId, henry).block();

        BuddyView buddy = room("henry").buddy();
        assertThat(buddy.talkedToday()).containsExactly(henry);
        assertThat(buddy.togetherToday()).isFalse();
        assertThat(buddy.exp()).isZero();
    }

    @Test
    void changingTheExpPerLevelKeepsEveryLevel() {
        String roomId = createRoom("henry").id();
        // Earned under 3 EXP per level: level 10, two thirds of the way to 11.
        int exp = 3 * 9 + 2;
        setExp(roomId, exp);
        mongo.save(new BuddyExpScale.Setting(BuddyExpScale.ID, 3), BuddyExpScale.SETTINGS)
                .block();

        expScale.run(new DefaultApplicationArguments());
        expScale.run(new DefaultApplicationArguments()); // scaled once, not again

        BuddyView buddy = room("henry").buddy();
        assertThat(buddy.exp()).isEqualTo(exp * BuddyRules.expPerLevel() / 3);
        assertThat(buddy.level()).isEqualTo(10);
        assertThat(buddy.levelProgress()).isBetween(0.6, 0.7);
    }

    @Test
    void careWordsInTheChatFeedAndCleanButSentencesDoNot() {
        duoRoom("henry", "yuki");
        clock.advance(BuddyRules.hungryAfter()); // hungry, and poops by now
        room("henry");
        TestSocket henry = connect("henry");
        TestSocket yuki = connect("yuki");

        henry.send(Map.of("type", "send", "clientMessageId", "c-1", "text", "밥 먹었어?"))
                .expect("ack");
        await(() -> room("henry").buddy().exp() == 1); // the sentence was counted as a message
        assertThat(room("henry").buddy().hungry()).isTrue(); // and did not feed
        henry.send(Map.of("type", "send", "clientMessageId", "c-2", "text", "밥!"));
        yuki.send(Map.of("type", "send", "clientMessageId", "c-3", "text", "🧹"));

        await(() -> timeline("henry").containsAll(List.of("FED", "CLEANED")));
        BuddyView buddy = room("henry").buddy();
        assertThat(buddy.hungry()).isFalse();
        assertThat(buddy.poops()).isZero();
        assertThat(timeline("henry")).containsOnlyOnce("FED");
    }

    @Test
    void onlyATopLevelBuddyCanGoItsOwnWay() {
        createRoom("henry");

        post("henry", "/api/rooms/me/buddy/graduate", Map.of("buddyName", "Mochi"))
                .expectStatus()
                .isEqualTo(409)
                .expectBody(JsonNode.class)
                .value(body -> assertThat(body.get("code").asString()).isEqualTo("BUDDY_NOT_GROWN"));
    }

    @Test
    void goingItsOwnWayKeepsItInTheAlbumAndANewEggGrowsAgain() {
        String roomId = createRoom("henry").id();
        hatch(roomId); // EVOLVED
        setExp(roomId, BuddyRules.minExp(BuddyRules.GRADUATE_AT));
        clock.advance(Duration.ofMinutes(1)); // the new egg is born later than the first

        post("henry", "/api/rooms/me/buddy/graduate", Map.of("buddyName", "Mochi"))
                .expectStatus()
                .isOk();

        JsonNode room = roomJson("henry");
        assertThat(room.get("buddy").get("name").asString()).isEqualTo("Mochi");
        assertThat(room.get("buddy").get("stage").asString()).isEqualTo("EGG");
        assertThat(room.get("album")).hasSize(1);
        assertThat(room.get("album").get(0).get("name").asString()).isEqualTo("Mugi");
        // The new egg hatches with its own line, not blocked by the first one's.
        hatch(roomId);
        assertThat(timeline("henry")).containsExactly("EVOLVED", "GRADUATED", "EVOLVED");
    }

    @Test
    void bothGraduatingAtOnceGraduatesOnce() {
        duoRoom("henry", "yuki");
        String roomId = room("henry").id();
        setExp(roomId, BuddyRules.minExp(BuddyRules.GRADUATE_AT));

        List<Integer> statuses = race(
                6,
                i -> post(i % 2 == 0 ? "henry" : "yuki", "/api/rooms/me/buddy/graduate", Map.of("buddyName", "Egg" + i))
                        .returnResult(Void.class)
                        .getStatus()
                        .value());

        assertThat(statuses).containsOnlyOnce(200);
        assertThat(roomJson("henry").get("album")).hasSize(1);
        assertThat(timeline("henry")).containsOnlyOnce("GRADUATED");
    }

    @Test
    void partnerSeesCareLive() {
        duoRoom("henry", "yuki");
        clock.advance(BuddyRules.hungryAfter());
        room("henry"); // notices hunger now, so the socket below only sees the feeding
        TestSocket yuki = connect("yuki");

        care("henry", "feed");

        JsonNode fed = yuki.expect("message").get("message");
        assertThat(fed.get("buddyEvent").asString()).isEqualTo("FED");
        assertThat(fed.get("actorId").asString()).isNotBlank();
        JsonNode buddy = yuki.expect("buddy").get("buddy");
        assertThat(buddy.get("fullness").asInt()).isEqualTo(100);
    }

    @Test
    void partnerSeesAPoopTheMomentItIsNoticed() {
        duoRoom("henry", "yuki");
        TestSocket yuki = connect("yuki");
        clock.advance(BuddyRules.poopEvery().plusMinutes(1)); // one poop, not hungry yet

        room("henry");

        assertThat(yuki.expect("message").get("message").get("buddyEvent").asString())
                .isEqualTo("POOPED");
        assertThat(yuki.expect("buddy").get("buddy").get("poops").asInt()).isEqualTo(1);
        room("henry"); // nothing new to tell
        assertThat(yuki.next()).isNull();
    }

    @Test
    void sendingAMessageGrowsTheBuddyLive() {
        duoRoom("henry", "yuki");
        TestSocket henry = connect("henry");
        TestSocket yuki = connect("yuki");

        henry.send(Map.of("type", "send", "clientMessageId", "c-1", "text", "hi"))
                .expect("ack");

        yuki.expect("message");
        assertThat(yuki.expect("buddy").get("buddy").get("exp").asInt()).isEqualTo(1);
        assertThat(henry.expect("buddy").get("buddy").get("exp").asInt()).isEqualTo(1);
    }

    @Test
    void roomsCreatedBeforeBuddyCareStillWork() {
        // A room as S2–S4 stored it: no care timestamps, no daily EXP counter.
        Instant bornAt = clock.instant().minus(Duration.ofHours(9));
        String roomId = new ObjectId().toHexString();
        User user = userService.getOrCreate("old-timer", "old-timer").block();
        mongo.getCollection("rooms")
                .flatMap(rooms -> Mono.from(rooms.insertOne(new Document("_id", new ObjectId(roomId))
                        .append("memberIds", List.of(user.id()))
                        .append("memberCount", 1)
                        .append(
                                "buddy",
                                new Document("name", "Mugi").append("exp", 0).append("bornAt", Date.from(bornAt)))
                        .append("createdAt", Date.from(bornAt)))))
                .block();
        userService.assignRoomIfNone(user.id(), roomId).block();

        assertThat(room("old-timer").buddy().hungry()).isTrue();
        assertThat(care("old-timer", "feed").changed()).isTrue();
        buddyService.onMessageSent(roomId).block();
        assertThat(room("old-timer").buddy().exp()).isEqualTo(BuddyRules.FEED_EXP + BuddyRules.MESSAGE_EXP);
    }

    @Test
    void mealsAndCleaningAreCounted() {
        String roomId = createRoom("henry").id();
        clock.advance(BuddyRules.hungryAfter()); // hungry, and one poop

        care("henry", "feed");
        care("henry", "clean");

        Document buddy = buddyDocument(roomId);
        assertThat(buddy.getInteger("fedCount")).isEqualTo(1);
        assertThat(buddy.getInteger("cleanedCount")).isEqualTo(1);
    }

    @Test
    void nightMessagesLaughsAndLovesAreCountedAndOrdinaryOnesAreNot() {
        String roomId = createRoom("henry").id();
        TestSocket henry = connect("henry").ignoring("buddy", "presence");
        clock.set(Instant.parse("2026-01-10T03:00:00Z")); // noon in Japan
        say(henry, "c-1", "그거 진짜 웃겨 ㅋㅋ");
        say(henry, "c-2", "사랑해 ㅋㅋ"); // both: counted as love only
        say(henry, "c-3", "오늘 뭐 먹을까");
        await(() -> room("henry").buddy().exp() == 3); // all three are counted before the night comes
        clock.set(Instant.parse("2026-01-10T15:30:00Z")); // half past midnight in Japan
        say(henry, "c-4", "자야겠다");

        await(() -> {
            Document buddy = buddyDocument(roomId);
            return Integer.valueOf(1).equals(buddy.getInteger("nightCount"))
                    && Integer.valueOf(1).equals(buddy.getInteger("loveCount"))
                    && Integer.valueOf(1).equals(buddy.getInteger("laughCount"));
        });
    }

    @Test
    void theJobIsSettledAtTwelveFromHowTheyRaisedIt() {
        String roomId = createRoom("henry").id();
        setBuddy(roomId, new Update().set("buddy.fedCount", 7).set("buddy.cleanedCount", 3));
        setExp(roomId, BuddyRules.minExp(BuddyRules.CHILD_AT));
        assertThat(room("henry").buddy().job()).isNull();
        assertThat(room("henry").buddy().leaning()).isEqualTo(BuddyJob.CHEF);

        // Grown up: the new look first, the job not yet.
        setExp(roomId, BuddyRules.minExp(BuddyRules.ADULT_AT) - 1);
        buddyService.onMessageSent(roomId).block();
        BuddyView adult = room("henry").buddy();
        assertThat(adult.stage()).isEqualTo(BuddyRules.Stage.ADULT);
        assertThat(adult.job()).isNull();
        assertThat(adult.leaning()).isEqualTo(BuddyJob.CHEF);
        assertThat(adult.canChangeJob()).isFalse();
        assertThat(timeline("henry")).endsWith("EVOLVED");

        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_AT) - 1);
        buddyService.onMessageSent(roomId).block();
        BuddyView working = room("henry").buddy();
        assertThat(working.job()).isEqualTo(BuddyJob.CHEF);
        assertThat(working.leaning()).isNull();
        assertThat(working.canChangeJob()).isFalse();
        assertThat(working.jobChangeAt()).isEqualTo(BuddyRules.JOB_CHANGE_FROM);
        assertThat(timeline("henry")).endsWith("LEVELED_UP", "JOB");
    }

    @Test
    void theJobStaysWhateverTheyDoLaterAndGoesIntoTheAlbum() {
        String roomId = createRoom("henry").id();
        setBuddy(roomId, new Update().set("buddy.fedCount", 7));
        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_AT) - 1);
        buddyService.onMessageSent(roomId).block();
        assertThat(room("henry").buddy().job()).isEqualTo(BuddyJob.CHEF);

        setBuddy(
                roomId,
                new Update().set("buddy.laughCount", 300).set("buddy.exp", BuddyRules.minExp(BuddyRules.GRADUATE_AT)));
        buddyService.onMessageSent(roomId).block();
        assertThat(room("henry").buddy().job()).isEqualTo(BuddyJob.CHEF);

        clock.advance(Duration.ofMinutes(1));
        post("henry", "/api/rooms/me/buddy/graduate", Map.of("buddyName", "Mochi"))
                .expectStatus()
                .isOk();
        RoomView afterwards = room("henry");
        assertThat(afterwards.album().getFirst().job()).isEqualTo("CHEF");
        assertThat(afterwards.buddy().job()).isNull(); // the new egg has none yet
    }

    @Test
    void theJobCanBeChangedOnceAtTwentyThirtyAndFortyAndFreelyAtTheTop() {
        duoRoom("henry", "yuki");
        String roomId = room("henry").id();
        setBuddy(roomId, new Update().set("buddy.fedCount", 7));
        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_AT) - 1);
        buddyService.onMessageSent(roomId).block();
        assertThat(room("henry").buddy().job()).isEqualTo(BuddyJob.CHEF);
        changeJob("henry", "DJ").isEqualTo(409).expectBody(JsonNode.class).value(locked());

        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_CHANGE_FROM));
        assertThat(room("henry").buddy().canChangeJob()).isTrue();
        changeJob("henry", "DJ").isOk();
        BuddyView changed = room("yuki").buddy();
        assertThat(changed.job()).isEqualTo(BuddyJob.DJ);
        assertThat(changed.canChangeJob()).isFalse();
        assertThat(changed.jobChangeAt()).isEqualTo(30);
        assertThat(timeline("henry")).endsWith("JOB_CHANGED");
        changeJob("yuki", "WRITER").isEqualTo(409).expectBody(JsonNode.class).value(locked());

        setExp(roomId, BuddyRules.minExp(30));
        changeJob("yuki", "WRITER").isOk();
        changeJob("henry", "CHEF").isEqualTo(409);
        assertThat(room("henry").buddy().jobChangeAt()).isEqualTo(40);

        setExp(roomId, BuddyRules.minExp(40));
        changeJob("henry", "GARDENER").isOk();
        changeJob("yuki", "CHEF").isEqualTo(409);
        assertThat(room("henry").buddy().jobChangeAt()).isEqualTo(50);

        setExp(roomId, BuddyRules.minExp(50));
        changeJob("henry", "BARISTA").isOk();
        changeJob("yuki", "CHEF").isEqualTo(409);
        assertThat(room("henry").buddy().jobChangeAt()).isEqualTo(BuddyRules.MAX_LEVEL);

        setExp(roomId, BuddyRules.minExp(BuddyRules.MAX_LEVEL));
        changeJob("henry", "CHEF").isOk();
        changeJob("yuki", "DJ").isOk();
        assertThat(room("henry").buddy().job()).isEqualTo(BuddyJob.DJ);
        assertThat(room("henry").buddy().canChangeJob()).isTrue();
    }

    @Test
    void theJobCannotBeChangedBeforeItIsSettledToNothingKnownOrToItself() {
        String roomId = createRoom("henry").id();
        post("henry", "/api/rooms/me/buddy/job", Map.of("job", "CHEF"))
                .expectStatus()
                .isEqualTo(409)
                .expectBody(JsonNode.class)
                .value(body -> assertThat(body.get("code").asString()).isEqualTo("BUDDY_NOT_ADULT"));

        // Past the job's level without one (from before jobs, or a later update): it picks one any time.
        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_AT));
        assertThat(room("henry").buddy().job()).isNull();
        assertThat(room("henry").buddy().canChangeJob()).isTrue();
        post("henry", "/api/rooms/me/buddy/job", Map.of("job", "SINGER"))
                .expectStatus()
                .isBadRequest();
        changeJob("henry", "CHEF").isOk();
        post("henry", "/api/rooms/me/buddy/job", Map.of("job", "CHEF"))
                .expectStatus()
                .isEqualTo(409)
                .expectBody(JsonNode.class)
                .value(body -> assertThat(body.get("code").asString()).isEqualTo("JOB_UNCHANGED"));
    }

    @Test
    void bothChoosingAtOnceChangesTheJobOnce() {
        duoRoom("henry", "yuki");
        String roomId = room("henry").id();
        setBuddy(roomId, new Update().set("buddy.job", "CHEF"));
        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_CHANGE_FROM));

        List<Integer> statuses = race(
                6,
                i -> post(
                                i % 2 == 0 ? "henry" : "yuki",
                                "/api/rooms/me/buddy/job",
                                Map.of("job", i % 3 == 0 ? "DJ" : "GARDENER"))
                        .returnResult(Void.class)
                        .getStatus()
                        .value());

        assertThat(statuses).containsOnlyOnce(200);
        assertThat(timeline("henry")).containsOnlyOnce("JOB_CHANGED");
    }

    @Test
    void withNothingStandingOutItIsABarista() {
        String roomId = createRoom("henry").id();
        setBuddy(roomId, new Update().set("buddy.fedCount", 4).set("buddy.cleanedCount", 4));
        setExp(roomId, BuddyRules.minExp(BuddyRules.JOB_AT) - 1);

        buddyService.onMessageSent(roomId).block();

        assertThat(room("henry").buddy().job()).isEqualTo(BuddyJob.BARISTA);
    }

    @Test
    void eachHabitCountsAgainstItsUsualAmountAndOneThatStandsOutWins() {
        // Usual by the job's level: 5 meals, 4 poops, 6 night messages, 3 love messages.
        assertThat(BuddyJob.decide(counts(7, 0, 0, 0, 0))).isEqualTo(BuddyJob.CHEF);
        assertThat(BuddyJob.decide(counts(0, 5, 0, 0, 0))).isEqualTo(BuddyJob.GARDENER);
        assertThat(BuddyJob.decide(counts(0, 0, 8, 0, 0))).isEqualTo(BuddyJob.DJ);
        assertThat(BuddyJob.decide(counts(0, 0, 0, 0, 4))).isEqualTo(BuddyJob.WRITER);
        // Measured against the usual: six love messages (twice the usual) beat seven meals.
        assertThat(BuddyJob.decide(counts(7, 4, 6, 0, 6))).isEqualTo(BuddyJob.WRITER);
        // Nothing a quarter beyond the usual: the barista. Laughs are counted but make no job.
        assertThat(BuddyJob.decide(counts(6, 4, 7, 0, 3))).isEqualTo(BuddyJob.BARISTA);
        assertThat(BuddyJob.decide(counts(0, 0, 0, 30, 0))).isEqualTo(BuddyJob.BARISTA);
        assertThat(BuddyJob.leaning(counts(0, 0, 0, 0, 0))).isNull();
        assertThat(BuddyJob.leaning(counts(1, 0, 0, 0, 0))).isEqualTo(BuddyJob.BARISTA);
        assertThat(BuddyJob.leaning(counts(0, 0, 0, 0, 20))).isEqualTo(BuddyJob.WRITER);
    }

    @Test
    void equalHabitsGoByADrawThatStaysTheSameForTheBuddy() {
        Buddy tied = counts(10, 8, 0, 0, 0); // both twice the usual
        BuddyJob job = BuddyJob.decide(tied);
        assertThat(job).isIn(BuddyJob.CHEF, BuddyJob.GARDENER);
        assertThat(BuddyJob.decide(tied)).isEqualTo(job);
    }

    // --- helpers ---

    private org.springframework.test.web.reactive.server.StatusAssertions changeJob(String user, String job) {
        return post(user, "/api/rooms/me/buddy/job", Map.of("job", job)).expectStatus();
    }

    private static java.util.function.Consumer<JsonNode> locked() {
        return body -> assertThat(body.get("code").asString()).isEqualTo("JOB_CHANGE_LOCKED");
    }

    private static Buddy counts(int fed, int cleaned, int nights, int laughs, int loves) {
        Instant now = Instant.now();
        return new Buddy(
                "Mugi", 0, now, now, now, null, 0, 0, null, null, null, fed, cleaned, nights, laughs, loves, null, null,
                null, null);
    }

    private void say(TestSocket socket, String clientMessageId, String text) {
        socket.send(Map.of("type", "send", "clientMessageId", clientMessageId, "text", text))
                .expect("ack");
    }

    private Document buddyDocument(String roomId) {
        Document room = mongo.findOne(
                        Query.query(Criteria.where("_id").is(new ObjectId(roomId))), Document.class, "rooms")
                .block();
        return room.get("buddy", Document.class);
    }

    private void setBuddy(String roomId, Update update) {
        mongo.updateFirst(Query.query(Criteria.where("_id").is(new ObjectId(roomId))), update, "rooms")
                .block();
    }

    // One message short of hatching, then the message.
    private void hatch(String roomId) {
        setExp(roomId, BuddyRules.minExp(BuddyRules.BABY_AT) - 1);
        buddyService.onMessageSent(roomId).block();
    }

    private void setExp(String roomId, int exp) {
        mongo.updateFirst(
                        Query.query(Criteria.where("_id").is(new ObjectId(roomId))),
                        new Update().set("buddy.exp", exp),
                        "rooms")
                .block();
    }

    private JsonNode roomJson(String uid) {
        return http.get()
                .uri("/api/rooms/me")
                .header("Authorization", "Bearer " + token(uid))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody();
    }

    private static void await(java.util.function.BooleanSupplier done) {
        for (int i = 0; i < 50 && !done.getAsBoolean(); i++) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        assertThat(done.getAsBoolean()).isTrue();
    }

    private List<String> timeline(String uid) {
        JsonNode page = http.get()
                .uri("/api/rooms/me/messages?limit=50")
                .header("Authorization", "Bearer " + token(uid))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody();
        List<String> events = new ArrayList<>();
        page.get("messages").forEach(m -> events.add(m.get("buddyEvent").asString()));
        return events.reversed(); // oldest first
    }

    private Care care(String uid, String action) {
        return post(uid, "/api/rooms/me/buddy/" + action, Map.of())
                .expectStatus()
                .isOk()
                .expectBody(Care.class)
                .returnResult()
                .getResponseBody();
    }

    private RoomView room(String uid) {
        return http.get()
                .uri("/api/rooms/me")
                .header("Authorization", "Bearer " + token(uid))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(RoomView.class)
                .returnResult()
                .getResponseBody();
    }

    private RoomView createRoom(String uid) {
        return post(uid, "/api/rooms", Map.of("buddyName", "Mugi"))
                .expectStatus()
                .isCreated()
                .expectBody(RoomView.class)
                .returnResult()
                .getResponseBody();
    }

    private String duoRoom(String owner, String friend) {
        String roomId = createRoom(owner).id();
        String code = post(owner, "/api/rooms/me/invitations", Map.of())
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("code")
                .asString();
        post(friend, "/api/invitations/" + code + "/accept", Map.of())
                .expectStatus()
                .isOk();
        return roomId;
    }

    private TestSocket connect(String uid) {
        TestSocket socket = new TestSocket(URI.create("ws://localhost:" + port + "/ws"), json).ignoring("presence");
        sockets.add(socket);
        socket.expect("hello");
        socket.send(Map.of("type", "auth", "token", token(uid))).expect("ready");
        return socket;
    }

    private WebTestClient.ResponseSpec post(String uid, String path, Object body) {
        return http.post()
                .uri(path)
                .header("Authorization", "Bearer " + token(uid))
                .bodyValue(body)
                .exchange();
    }

    private static <T> List<T> race(int n, Function<Integer, T> call) {
        return Flux.range(0, n)
                .parallel(n)
                .runOn(Schedulers.boundedElastic())
                .map(call)
                .sequential()
                .collectList()
                .block();
    }
}
