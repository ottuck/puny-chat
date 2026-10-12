package com.buddychat.account;

import static com.buddychat.TestJwtConfiguration.token;
import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.TestJwtConfiguration;
import com.buddychat.TestSocket;
import com.buddychat.TestcontainersConfiguration;
import com.buddychat.chat.Message;
import com.buddychat.room.Room;
import com.buddychat.user.User;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({TestcontainersConfiguration.class, TestJwtConfiguration.class})
class AccountDeletionFlowTest {

    @LocalServerPort
    int port;

    @Autowired
    JsonMapper json;

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    com.buddychat.chat.ChatService chatService;

    @Autowired
    com.buddychat.buddy.BuddyService buddyService;

    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    com.buddychat.user.UserService userService;

    private final List<TestSocket> sockets = new ArrayList<>();
    private WebTestClient http;

    @BeforeEach
    void setUp() {
        Flux.just(Room.class, User.class, Message.class)
                .flatMap(type -> mongo.remove(new Query(), type))
                .thenMany(Flux.just("reads", "invitations", "push_tokens", "history_deletions")
                        .flatMap(collection -> mongo.remove(new Query(), collection)))
                .blockLast();
        http = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @AfterEach
    void closeSockets() {
        sockets.forEach(TestSocket::close);
    }

    @Test
    void deletingKeepsThePartnersRoomAndMessagesButRemovesAuthoredHistory() {
        String roomId = duoRoom("henry", "yuki");
        String yukiId = user("yuki").id();
        TestSocket henry = connect("henry");
        TestSocket yuki = connect("yuki");
        mongo.insert(new Message(
                        null,
                        roomId,
                        user("henry").id(),
                        Message.Type.TEXT,
                        "my message",
                        null,
                        null,
                        null,
                        "h-1",
                        java.time.Instant.now()))
                .block();
        yuki.send(Map.of("type", "send", "clientMessageId", "c-1", "text", "bye"))
                .expect("ack");
        henry.expect("message");
        yuki.send(Map.of("type", "read", "messageId", lastMessageId(roomId)));
        awaitCount("reads", "userId", yukiId, 1);
        http.post()
                .uri("/api/me/push-tokens")
                .header("Authorization", "Bearer " + token("yuki"))
                .bodyValue(Map.of("token", "ExponentPushToken[yuki-phone]"))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();

        delete("yuki").expectStatus().isNoContent();

        // Henry keeps their room, buddy and own text, and is told to drop cached history.
        assertThat(henry.expect("left").get("userId").asString()).isEqualTo(yukiId);
        assertThat(henry.expect("historyChanged").get("historyVersion").asLong())
                .isEqualTo(1L);
        assertThat(mongo.findById(roomId, Room.class).block().memberIds())
                .containsExactly(user("henry").id());
        assertThat(count("messages", "senderId", yukiId)).isZero();
        assertThat(count("messages", "actorId", yukiId)).isZero();
        assertThat(count("messages", "senderId", user("henry").id())).isEqualTo(1);
        assertThat(mongo.findById(roomId, Room.class).block().buddy().name()).isEqualTo("Mugi");
        assertThat(mongo.count(new Query(), "history_deletions").block()).isZero();
        // Nothing of yuki's own is left.
        assertThat(user("yuki")).isNull();
        assertThat(count("reads", "userId", yukiId)).isZero();
        assertThat(count("push_tokens", "userId", yukiId)).isZero();
    }

    @Test
    void deletionCoversPreviouslyLeftRoomsAndAnonymizesBuddyEvents() {
        String oldRoom = duoRoom("henry", "yuki");
        String yukiId = user("yuki").id();
        TestSocket yuki = connect("yuki");
        yuki.send(Map.of("type", "send", "clientMessageId", "old", "text", "old private text"))
                .expect("ack");
        http.post()
                .uri("/api/rooms/me/leave")
                .header("Authorization", "Bearer " + token("yuki"))
                .exchange()
                .expectStatus()
                .isNoContent();
        TestSocket henry = connect("henry");
        String currentRoom = duoRoom("third", "yuki");
        TestSocket third = connect("third");
        connect("yuki")
                .send(Map.of("type", "send", "clientMessageId", "current", "text", "current private text"))
                .expect("ack");
        third.expect("message");
        mongo.insert(new Message(
                        null,
                        oldRoom,
                        null,
                        Message.Type.BUDDY_EVENT,
                        null,
                        "FED",
                        null,
                        yukiId,
                        "care-event",
                        java.time.Instant.now()))
                .block();

        delete("yuki").expectStatus().isNoContent();

        henry.expect("historyChanged");
        assertThat(count("messages", "senderId", yukiId)).isZero();
        assertThat(count("messages", "actorId", yukiId)).isZero();
        assertThat(mongo.findOne(Query.query(Criteria.where("clientMessageId").is("care-event")), Message.class)
                        .block()
                        .actorId())
                .isNull();
        assertThat(mongo.findById(oldRoom, Room.class).block().historyVersion()).isEqualTo(1L);
        assertThat(mongo.findById(currentRoom, Room.class).block().historyVersion())
                .isEqualTo(1L);
        // A device offline during deletion receives the changed version when it reconnects.
        TestSocket reconnected = new TestSocket(URI.create("ws://localhost:" + port + "/ws"), json);
        sockets.add(reconnected);
        reconnected.expect("hello");
        assertThat(reconnected
                        .send(Map.of("type", "auth", "token", token("henry")))
                        .expect("ready")
                        .get("historyVersion")
                        .asLong())
                .isEqualTo(1L);
    }

    @Test
    void retriesNotifyRoomsEvenWhenMessagesWereAlreadyRemoved() {
        String roomId = duoRoom("henry", "yuki");
        String yukiId = user("yuki").id();
        http.post()
                .uri("/api/rooms/me/leave")
                .header("Authorization", "Bearer " + token("yuki"))
                .exchange()
                .expectStatus()
                .isNoContent();
        mongo.remove(Query.query(Criteria.where("actorId").is(yukiId)), Message.class)
                .block();
        mongo.insert(
                        new Document("_id", new org.bson.types.ObjectId(yukiId)).append("roomIds", List.of(roomId)),
                        "history_deletions")
                .block();
        TestSocket henry = connect("henry");

        delete("yuki").expectStatus().isNoContent();

        henry.expect("historyChanged");
        assertThat(mongo.findById(roomId, Room.class).block().historyVersion()).isEqualTo(1L);
        assertThat(mongo.count(new Query(), "history_deletions").block()).isZero();
    }

    @Test
    void lateCareAndTalkUpdatesCannotRestoreADeletedActor() {
        String roomId = duoRoom("henry", "yuki");
        String yukiId = user("yuki").id();
        delete("yuki").expectStatus().isNoContent();

        Message late =
                chatService.recordBuddyEvent(roomId, "FED", yukiId, "late-care").block();
        buddyService.talked(roomId, yukiId).block();

        assertThat(late.actorId()).isNull();
        assertThat(count("messages", "actorId", yukiId)).isZero();
        assertThat(mongo.findById(roomId, Room.class).block().buddy().talkers()).isNullOrEmpty();
        assertThat(chatService
                        .recordSystemEvent(roomId, "MEMBER_LEFT", yukiId, "deleted name")
                        .block())
                .isNull();
        assertThat(count("messages", "actorId", yukiId)).isZero();
    }

    @Test
    void deletionFencePreventsNamedEventsWhileTheUserStillExists() {
        String roomId = duoRoom("henry", "yuki");
        String yukiId = user("yuki").id();
        TestSocket henry = connect("henry");
        chatService.beginAccountDeletion(yukiId).block();

        assertThat(chatService
                        .recordSystemEvent(roomId, "MEMBER_LEFT", yukiId, "deleted name")
                        .block())
                .isNull();
        assertThat(user("yuki")).isNotNull();
        assertThat(count("messages", "actorId", yukiId)).isZero();
        delete("yuki").expectStatus().isNoContent();
        henry.expect("left");
        assertThat(user("yuki")).isNull();
        assertThat(mongo.count(new Query(), "history_deletions").block()).isZero();
    }

    @Test
    void aRejectedLateSystemInsertionAlsoInvalidatesAnyHistoryThatObservedIt() {
        String roomId = duoRoom("henry", "yuki");
        String yukiId = user("yuki").id();
        TestSocket henry = connect("henry");
        var checks = new java.util.concurrent.atomic.AtomicInteger();
        org.mockito.Mockito.doAnswer(invocation -> checks.incrementAndGet() == 1
                        ? reactor.core.publisher.Mono.just(true)
                        : mongo.count(Query.query(Criteria.where("actorId").is(yukiId)), Message.class)
                                .doOnNext(count -> assertThat(count).isEqualTo(1L))
                                .then(chatService.beginAccountDeletion(yukiId))
                                .thenReturn(false))
                .when(userService)
                .exists(yukiId);

        assertThat(chatService
                        .recordSystemEvent(roomId, "MEMBER_LEFT", yukiId, "late private name")
                        .block())
                .isNull();

        JsonNode changed = henry.expect("historyChanged");
        assertThat(changed.get("deletedUserId").asString()).isEqualTo(yukiId);
        assertThat(changed.get("historyVersion").asLong()).isEqualTo(1L);
        assertThat(count("messages", "actorId", yukiId)).isZero();
        assertThat(mongo.findById(roomId, Room.class).block().historyVersion()).isEqualTo(1L);
    }

    @Test
    void deletingASoloAccountRemovesTheRoomAndItsInviteCodes() {
        createRoom("henry");
        String roomId = user("henry").roomId();
        String code = invite("henry");

        delete("henry").expectStatus().isNoContent();

        assertThat(mongo.findById(roomId, Room.class).block()).isNull();
        assertThat(count("messages", "roomId", roomId)).isZero();
        assertThat(count("invitations", "code", code)).isZero();
        assertThat(user("henry")).isNull();
    }

    @Test
    void deletingAgainIsHarmless() {
        createRoom("henry");
        delete("henry").expectStatus().isNoContent();

        delete("henry").expectStatus().isNoContent();

        assertThat(user("henry")).isNull();
    }

    // --- helpers ---

    private long count(String collection, String field, String value) {
        return mongo.count(Query.query(Criteria.where(field).is(value)), collection)
                .block();
    }

    private void awaitCount(String collection, String field, String value, long expected) {
        for (int i = 0; i < 50 && count(collection, field, value) != expected; i++) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        assertThat(count(collection, field, value)).isEqualTo(expected);
    }

    private String lastMessageId(String roomId) {
        return mongo.findOne(
                        Query.query(Criteria.where("roomId").is(roomId))
                                .with(Sort.by("_id").descending()),
                        Document.class,
                        "messages")
                .block()
                .getObjectId("_id")
                .toHexString();
    }

    private User user(String uid) {
        return mongo.findOne(Query.query(Criteria.where("firebaseUid").is(uid)), User.class)
                .block();
    }

    private TestSocket connect(String uid) {
        TestSocket socket = new TestSocket(URI.create("ws://localhost:" + port + "/ws"), json)
                .ignoring("buddy", "presence", "read", "typing");
        sockets.add(socket);
        socket.expect("hello");
        socket.send(Map.of("type", "auth", "token", token(uid))).expect("ready");
        return socket;
    }

    private void createRoom(String uid) {
        post(uid, "/api/rooms", Map.of("buddyName", "Mugi")).expectStatus().isCreated();
    }

    private String invite(String uid) {
        return post(uid, "/api/rooms/me/invitations", Map.of())
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("code")
                .asString();
    }

    private String duoRoom(String owner, String friend) {
        createRoom(owner);
        String code = invite(owner);
        post(friend, "/api/invitations/" + code + "/accept", Map.of())
                .expectStatus()
                .isOk();
        return user(owner).roomId();
    }

    private WebTestClient.ResponseSpec delete(String uid) {
        return http.delete()
                .uri("/api/me")
                .header("Authorization", "Bearer " + token(uid))
                .exchange();
    }

    private WebTestClient.ResponseSpec post(String uid, String path, Object body) {
        return http.post()
                .uri(path)
                .header("Authorization", "Bearer " + token(uid))
                .bodyValue(body)
                .exchange();
    }
}
