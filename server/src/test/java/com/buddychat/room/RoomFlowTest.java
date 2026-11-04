package com.buddychat.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers.mockJwt;
import static org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers.springSecurity;

import com.buddychat.FlowTest;
import com.buddychat.chat.ChatService;
import com.buddychat.chat.Message;
import com.buddychat.common.ApiException;
import com.buddychat.realtime.RoomHub;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.reactive.server.EntityExchangeResult;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@FlowTest
class RoomFlowTest {

    // Bound to the application rather than the port, so mockJwt() can stand in for a token.
    WebTestClient client;

    @Autowired
    void bind(ApplicationContext context) {
        client = WebTestClient.bindToApplicationContext(context)
                .apply(springSecurity())
                .configureClient()
                .build();
    }

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    RoomRepository rooms;

    @Autowired
    InvitationRepository invitations;

    @Autowired
    UserService userService;

    @Autowired
    RoomService roomService;

    @Autowired
    InvitationService invitationService;

    @Autowired
    ChatService chatService;

    @Autowired
    RoomHub hub;

    record Error(String code) {}

    record SeatError(String code, String detail) {}

    record Invite(String code, Instant expiresAt) {}

    @BeforeEach
    void clean() {
        // Keeps the indexes created at startup; only the documents go.
        Flux.just(Room.class, Invitation.class, User.class)
                .flatMap(type -> mongo.remove(new Query(), type))
                .blockLast();
    }

    @Test
    void createsSoloRoomWithAnEgg() {
        RoomView room = createRoom("henry", "Mugi");

        assertThat(room.members()).extracting(RoomView.Member::displayName).containsExactly("henry");
        assertThat(room.buddy().name()).isEqualTo("Mugi");
        assertThat(room.buddy().exp()).isZero();
        assertThat(get("henry", "/api/rooms/me")
                        .expectBody(RoomView.class)
                        .returnResult()
                        .getResponseBody()
                        .id())
                .isEqualTo(room.id());
    }

    @Test
    void userCannotCreateASecondRoom() {
        createRoom("henry", "Mugi");
        assertError(
                post("henry", "/api/rooms", Map.of("buddyName", "Mochi")), HttpStatus.CONFLICT, "ROOM_ALREADY_EXISTS");
    }

    @Test
    void concurrentCreatesLeaveExactlyOneRoom() {
        userService.getOrCreate("henry", "henry").block(); // user exists before the race
        List<Integer> statuses = race(
                6,
                i -> post("henry", "/api/rooms", Map.of("buddyName", "Mugi"))
                        .returnResult(Void.class)
                        .getStatus()
                        .value());

        assertThat(statuses).containsOnlyOnce(201);
        assertThat(rooms.count().block()).isEqualTo(1);
    }

    @Test
    void roomInsertFailureDoesNotAttachAMissingRoomAndCanBeRetried() {
        User user = userService.getOrCreate("henry", "henry").block();
        RoomRepository failingRooms = mock(RoomRepository.class);
        when(failingRooms.insert(any(Room.class))).thenReturn(Mono.error(new IllegalStateException("insert failed")));
        RoomService failingService =
                new RoomService(failingRooms, userService, mongo, chatService, hub, Clock.systemUTC());

        assertThatThrownBy(() -> failingService.create(user, "Mugi").block()).hasMessage("insert failed");
        assertThat(userService.getOrCreate("henry", "henry").block().roomId()).isNull();
        assertThat(rooms.count().block()).isZero();
        createRoom("henry", "Mugi");
    }

    @Test
    void failedRoomAssignmentRemovesTheCandidate() {
        User user = userService.getOrCreate("henry", "henry").block();
        UserService failingUsers = mock(UserService.class);
        when(failingUsers.assignRoomIfNone(any(), any()))
                .thenReturn(Mono.error(new IllegalStateException("assign failed")));
        when(failingUsers.isInRoom(any(), any())).thenReturn(Mono.just(false));
        RoomService failingService = new RoomService(rooms, failingUsers, mongo, chatService, hub, Clock.systemUTC());

        assertThatThrownBy(() -> failingService.create(user, "Mugi").block()).hasMessage("assign failed");
        assertThat(rooms.count().block()).isZero();
        assertThat(userService.getOrCreate("henry", "henry").block().roomId()).isNull();
        createRoom("henry", "Mugi");
    }

    @Test
    void staleConcurrentCreateDoesNotDeleteTheWinningRoom() {
        User stale = userService.getOrCreate("henry", "henry").block();
        RoomView winner = roomService.create(stale, "Mugi").block();

        assertThatThrownBy(() -> roomService.create(stale, "Other").block())
                .isInstanceOf(ApiException.class)
                .hasMessage("ROOM_ALREADY_EXISTS");
        assertThat(rooms.count().block()).isEqualTo(1);
        assertThat(rooms.existsById(winner.id()).block()).isTrue();
    }

    @Test
    void aLostAssignmentResponseDoesNotDeleteTheAttachedRoom() {
        User user = userService.getOrCreate("henry", "henry").block();
        UserService lostResponseUsers = mock(UserService.class);
        when(lostResponseUsers.assignRoomIfNone(any(), any()))
                .thenAnswer(invocation -> userService
                        .assignRoomIfNone(invocation.getArgument(0), invocation.getArgument(1))
                        .then(Mono.error(new IllegalStateException("response lost"))));
        when(lostResponseUsers.isInRoom(any(), any()))
                .thenAnswer(invocation -> userService.isInRoom(invocation.getArgument(0), invocation.getArgument(1)));
        RoomService failingService =
                new RoomService(rooms, lostResponseUsers, mongo, chatService, hub, Clock.systemUTC());

        assertThatThrownBy(() -> failingService.create(user, "Mugi").block()).hasMessage("response lost");
        User after = userService.getOrCreate("henry", "henry").block();
        assertThat(rooms.existsById(after.roomId()).block()).isTrue();
        get("henry", "/api/rooms/me").expectStatus().isOk();
    }

    @Test
    void rejectsBlankOrLongBuddyName() {
        assertError(post("henry", "/api/rooms", Map.of("buddyName", " ")), HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
        assertError(
                post("henry", "/api/rooms", Map.of("buddyName", "x".repeat(13))),
                HttpStatus.BAD_REQUEST,
                "INVALID_REQUEST");
    }

    @Test
    void roomNotFoundBeforeCreating() {
        assertError(get("henry", "/api/rooms/me"), HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND");
    }

    @Test
    void friendJoinsWithInviteCode() {
        RoomView created = createRoom("henry", "Mugi");
        String code = invite("henry");

        RoomView joined = accept("yuki", code, false)
                .expectStatus()
                .isOk()
                .expectBody(RoomView.class)
                .returnResult()
                .getResponseBody();

        assertThat(joined.id()).isEqualTo(created.id());
        assertThat(joined.members()).extracting(RoomView.Member::displayName).containsExactly("henry", "yuki");
        assertThat(joined.buddy().name()).isEqualTo("Mugi"); // the buddy carries over from solo to duo
        assertThat(systemEvents(created.id())).containsExactly(tuple("MEMBER_JOINED", userId("yuki"), "yuki"));
    }

    @Test
    void codeIsCaseInsensitive() {
        createRoom("henry", "Mugi");
        accept("yuki", invite("henry").toLowerCase(), false).expectStatus().isOk();
    }

    @Test
    void invitationIsSingleUse() {
        createRoom("henry", "Mugi");
        String code = invite("henry");
        accept("yuki", code, false).expectStatus().isOk();

        assertError(accept("mika", code, false), HttpStatus.GONE, "INVITATION_USED");
    }

    @Test
    void aCodeMadeInAFullRoomHandsThePartnersSeatAndHistoryOver() {
        RoomView room = createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        User henry = userService.getOrCreate("henry", "henry").block();
        User yuki = userService.getOrCreate("yuki", "yuki").block();
        Message hello = chatService.send(henry, "c-1", "hi").block().message();
        chatService.send(yuki, "c-2", "hello").block();
        chatService.markRead(yuki, hello.id()).block();
        String code = invite("henry");
        assertError(accept("yuki", code, false), HttpStatus.CONFLICT, "ALREADY_MEMBER");

        // Yuki started over in another app (a new guest with a new egg), then used the code.
        createRoom("yuki2", "Egg");
        RoomView joined = acceptSeat("yuki2", code, true)
                .expectStatus()
                .isOk()
                .expectBody(RoomView.class)
                .returnResult()
                .getResponseBody();

        String newId = userService.getOrCreate("yuki2", "yuki2").block().id();
        assertThat(joined.id()).isEqualTo(room.id());
        assertThat(joined.members()).extracting(RoomView.Member::displayName).containsExactly("henry", "yuki2");
        assertThat(joined.buddy().name()).isEqualTo("Mugi");
        assertThat(rooms.count().block()).isEqualTo(1); // the new egg's room is gone
        get("yuki", "/api/rooms/me").expectStatus().isNotFound();

        List<Message> timeline = mongo.find(Query.query(Criteria.where("roomId").is(room.id())), Message.class)
                .collectList()
                .block();
        assertThat(timeline)
                .filteredOn(m -> m.type() == Message.Type.TEXT)
                .extracting(Message::text, Message::senderId)
                .containsExactlyInAnyOrder(tuple("hi", henry.id()), tuple("hello", newId));
        assertThat(timeline)
                .filteredOn(m -> "MEMBER_RETURNED".equals(m.systemEvent()))
                .extracting(Message::actorId, Message::text)
                .containsExactly(tuple(newId, "yuki2"));
        // Coming back in a seat is not a new friend joining: the one line is from when yuki first came
        // in, and like the rest of yuki's history it now names the new account.
        assertThat(timeline)
                .filteredOn(m -> "MEMBER_JOINED".equals(m.systemEvent()))
                .extracting(Message::actorId)
                .containsExactly(newId);
        assertThat(chatService.readMarks(room.id()).block())
                .containsEntry(newId, hello.id())
                .doesNotContainKey(yuki.id());
        assertError(accept("mika", code, false), HttpStatus.GONE, "INVITATION_USED");
    }

    @Test
    void aCodeForSomeonesSeatAsksWhoseItIsFirst() {
        createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        String code = invite("henry");

        // Henry, in another browser, about to use his own code for yuki by mistake.
        EntityExchangeResult<SeatError> asked = accept("henry2", code, false)
                .expectStatus()
                .isEqualTo(HttpStatus.CONFLICT)
                .expectBody(SeatError.class)
                .returnResult();

        assertThat(asked.getResponseBody()).isEqualTo(new SeatError("SEAT_CONFIRMATION_REQUIRED", "yuki"));
        assertThat(rooms.findAll().blockFirst().memberIds()).containsExactly(userId("henry"), userId("yuki"));
        assertThat(invitations.findByCode(code).block().usedBy()).isNull();
    }

    @Test
    void aCodeForOneselfMovesOnlyTheOneWhoMadeIt() {
        RoomView room = createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        String code = post("yuki", "/api/rooms/me/invitations", Map.of("self", true))
                .expectStatus()
                .isCreated()
                .expectBody(Invite.class)
                .returnResult()
                .getResponseBody()
                .code();

        assertError(accept("yuki2", code, false), HttpStatus.CONFLICT, "SEAT_CONFIRMATION_REQUIRED");
        acceptSeat("yuki2", code, false).expectStatus().isOk();

        assertThat(rooms.findById(room.id()).block().memberIds()).containsExactly(userId("henry"), userId("yuki2"));
        get("yuki", "/api/rooms/me").expectStatus().isNotFound();
        get("henry", "/api/rooms/me").expectStatus().isOk();
    }

    @Test
    void aCodeForOneselfAlsoMovesASoloRoom() {
        RoomView room = createRoom("henry", "Mugi");
        String code = post("henry", "/api/rooms/me/invitations", Map.of("self", true))
                .expectBody(Invite.class)
                .returnResult()
                .getResponseBody()
                .code();

        acceptSeat("henry2", code, false).expectStatus().isOk();

        assertThat(rooms.findById(room.id()).block().memberIds()).containsExactly(userId("henry2"));
        get("henry", "/api/rooms/me").expectStatus().isNotFound();
    }

    @Test
    void ofTwoCodesForTheSameSeatOnlyOneGetsIt() {
        for (int round = 0; round < 5; round++) {
            clean();
            createRoom("henry", "Mugi");
            accept("yuki", invite("henry"), false).expectStatus().isOk();
            List<String> codes = List.of(invite("henry"), invite("henry"));

            List<Integer> statuses = race(
                    2,
                    i -> acceptSeat("new" + i, codes.get(i), false)
                            .returnResult(Void.class)
                            .getStatus()
                            .value());

            assertThat(statuses).as("round %d", round).containsExactlyInAnyOrder(200, 409);
            Room room = rooms.findAll().blockFirst();
            assertThat(room.memberIds()).hasSize(2).doesNotContain(userId("yuki"));
            assertThat(room.memberCount()).isEqualTo(2);
        }
    }

    @Test
    void aCodeForThePartnerIsVoidOnceItsMakerHasLeft() {
        createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        String code = invite("henry");
        post("henry", "/api/rooms/me/leave", null).expectStatus().isNoContent();

        assertError(acceptSeat("yuki2", code, false), HttpStatus.GONE, "INVITATION_EXPIRED");
        assertThat(rooms.findAll().blockFirst().memberIds()).containsExactly(userId("yuki"));
        // Handed back, like any code that was not used.
        assertThat(invitations.findByCode(code).block().usedBy()).isNull();
    }

    @Test
    void aCodeForAPartnerWhoHasLeftFillsTheFreeSlotWithTheirHistory() {
        RoomView room = createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        chatService
                .send(userService.getOrCreate("yuki", "yuki").block(), "c-1", "hello")
                .block();
        String code = invite("henry");
        post("yuki", "/api/rooms/me/leave", null).expectStatus().isNoContent();

        acceptSeat("yuki2", code, false).expectStatus().isOk();

        assertThat(rooms.findById(room.id()).block().memberIds()).containsExactly(userId("henry"), userId("yuki2"));
        assertThat(mongo.find(
                                Query.query(Criteria.where("roomId")
                                        .is(room.id())
                                        .and("type")
                                        .is(Message.Type.TEXT)),
                                Message.class)
                        .map(Message::senderId)
                        .collectList()
                        .block())
                .containsExactly(userId("yuki2"));
    }

    @Test
    void aGuestNeedsAnAccountToInviteSomeone() {
        postAsGuest("guest", "/api/rooms", Map.of("buddyName", "Mugi"))
                .expectStatus()
                .isCreated();

        assertError(postAsGuest("guest", "/api/rooms/me/invitations", null), HttpStatus.FORBIDDEN, "ACCOUNT_REQUIRED");
        assertError(
                postAsGuest("guest", "/api/rooms/me/invitations", Map.of("self", false)),
                HttpStatus.FORBIDDEN,
                "ACCOUNT_REQUIRED");
        assertThat(invitations.count().block()).isZero();
        // Moving one's own seat to another device stays open to guests.
        postAsGuest("guest", "/api/rooms/me/invitations", Map.of("self", true))
                .expectStatus()
                .isCreated();

        // Linking Google keeps the uid; the next request is no longer a guest's.
        invite("guest");
    }

    @Test
    void aGuestInAFullRoomNeedsAnAccountToCallThePartnerBack() {
        createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        // E.g. joined before connecting needed an account.
        mongo.updateFirst(
                        Query.query(Criteria.where("firebaseUid").is("yuki")), Update.update("guest", true), User.class)
                .block();

        assertError(postAsGuest("yuki", "/api/rooms/me/invitations", null), HttpStatus.FORBIDDEN, "ACCOUNT_REQUIRED");
        postAsGuest("yuki", "/api/rooms/me/invitations", Map.of("self", true))
                .expectStatus()
                .isCreated();
    }

    @Test
    void aGuestNeedsAnAccountToJoinSomeoneAndTheCodeStillWorksAfterLinking() {
        RoomView room = createRoom("henry", "Mugi");
        String code = invite("henry");
        postAsGuest("guest", "/api/rooms", Map.of("buddyName", "Mochi"))
                .expectStatus()
                .isCreated();

        assertError(acceptAsGuest("guest", code), HttpStatus.FORBIDDEN, "ACCOUNT_REQUIRED");
        // Unknown codes say so as before.
        assertError(acceptAsGuest("guest", "ZZZZ"), HttpStatus.NOT_FOUND, "INVITATION_NOT_FOUND");

        // Nothing was claimed or reserved: not the code, not the user, not the room.
        Invitation untouched = invitations.findByCode(code).block();
        assertThat(untouched.usedBy()).isNull();
        assertThat(untouched.usedAt()).isNull();
        assertThat(untouched.previousRoomId()).isNull();
        User guest = mongo.findOne(Query.query(Criteria.where("firebaseUid").is("guest")), User.class)
                .block();
        assertThat(guest.roomJoinId()).isNull();
        assertThat(guest.roomId()).isNotEqualTo(room.id());
        assertThat(rooms.findById(room.id()).block().memberIds()).containsExactly(userId("henry"));

        // After linking an account, the same code lets them in.
        accept("guest", code, true).expectStatus().isOk();
        assertThat(rooms.findById(room.id()).block().memberIds()).containsExactly(userId("henry"), userId("guest"));
    }

    @Test
    void aGuestCannotTakeThePartnersSeatEither() {
        createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        String forYuki = invite("henry"); // a full room: the code is for yuki's seat

        assertError(
                postAsGuest("guest", "/api/invitations/" + forYuki + "/accept", Map.of("takeSeat", true)),
                HttpStatus.FORBIDDEN,
                "ACCOUNT_REQUIRED");
        assertThat(invitations.findByCode(forYuki).block().usedBy()).isNull();
    }

    @Test
    void aGuestCanStillMoveTheirOwnSeat() {
        RoomView room = postAsGuest("guest", "/api/rooms", Map.of("buddyName", "Mugi"))
                .expectStatus()
                .isCreated()
                .expectBody(RoomView.class)
                .returnResult()
                .getResponseBody();
        String code = postAsGuest("guest", "/api/rooms/me/invitations", Map.of("self", true))
                .expectBody(Invite.class)
                .returnResult()
                .getResponseBody()
                .code();

        postAsGuest("guest-new-phone", "/api/invitations/" + code + "/accept", Map.of("takeSeat", true))
                .expectStatus()
                .isOk();

        assertThat(rooms.findById(room.id()).block().memberIds()).containsExactly(userId("guest-new-phone"));
    }

    @Test
    void unknownAndExpiredCodesAreRejected() {
        RoomView room = createRoom("henry", "Mugi");
        Instant past = Instant.now().minusSeconds(60);
        invitations
                .insert(new Invitation(
                        null, room.id(), "EXPIRED2", "x", past.minusSeconds(60), past, null, null, null, null))
                .block();

        assertError(accept("yuki", "NOPE2345", false), HttpStatus.NOT_FOUND, "INVITATION_NOT_FOUND");
        assertError(accept("yuki", "EXPIRED2", false), HttpStatus.GONE, "INVITATION_EXPIRED");
    }

    @Test
    void guessingCodesIsCutOffAfterAFewMisses() {
        createRoom("henry", "Mugi");
        String code = invite("henry");
        for (int i = 0; i < InvitationService.MAX_MISSES; i++) {
            assertError(accept("guesser", "NOPE" + i, false), HttpStatus.NOT_FOUND, "INVITATION_NOT_FOUND");
        }

        // Even the right code waits now.
        assertError(accept("guesser", code, false), HttpStatus.TOO_MANY_REQUESTS, "INVITATION_RATE_LIMIT");
        accept("yuki", code, false).expectStatus().isOk();
    }

    @Test
    void memberCannotAcceptOwnRoomInvitation() {
        createRoom("henry", "Mugi");
        assertError(accept("henry", invite("henry"), false), HttpStatus.CONFLICT, "ALREADY_MEMBER");
    }

    @Test
    void leavingOwnSoloRoomNeedsConfirmationAndDeletesIt() {
        createRoom("henry", "Mugi");
        RoomView yukisRoom = createRoom("yuki", "Pico");
        String code = invite("henry");

        assertError(accept("yuki", code, false), HttpStatus.CONFLICT, "LEAVE_CONFIRMATION_REQUIRED");
        accept("yuki", code, true).expectStatus().isOk();

        assertThat(rooms.existsById(yukisRoom.id()).block()).isFalse();
        assertThat(rooms.count().block()).isEqualTo(1);
    }

    @Test
    void acceptThatFailedAfterJoiningCanBeFinishedByAcceptingAgain() {
        RoomView henrysRoom = createRoom("henry", "Mugi");
        RoomView yukisRoom = createRoom("yuki", "Pico");
        String code = invite("henry");
        // State left by an accept that failed right after joining: the code is used and yuki
        // holds the last slot, but yuki's user still points at the old room.
        String yuki = userId("yuki");
        mongo.updateFirst(
                        Query.query(Criteria.where("code").is(code)),
                        new Update().set("usedAt", Instant.now()).set("usedBy", yuki),
                        Invitation.class)
                .block();
        mongo.updateFirst(
                        Query.query(Criteria.where("_id").is(henrysRoom.id())),
                        new Update().push("memberIds", yuki).inc("memberCount", 1),
                        Room.class)
                .block();

        RoomView joined = accept("yuki", code, true)
                .expectStatus()
                .isOk()
                .expectBody(RoomView.class)
                .returnResult()
                .getResponseBody();

        assertThat(joined.id()).isEqualTo(henrysRoom.id());
        assertThat(joined.members()).extracting(RoomView.Member::displayName).containsExactly("henry", "yuki");
        assertThat(rooms.findById(henrysRoom.id()).block().memberCount()).isEqualTo(2);
        assertThat(rooms.existsById(yukisRoom.id()).block()).isFalse();
        assertThat(get("yuki", "/api/rooms/me")
                        .expectStatus()
                        .isOk()
                        .expectBody(RoomView.class)
                        .returnResult()
                        .getResponseBody()
                        .id())
                .isEqualTo(henrysRoom.id());
        // Still single use for anyone else.
        assertError(accept("mika", code, false), HttpStatus.GONE, "INVITATION_USED");
        // The join was made by the try that failed; finishing it says nothing new.
        assertThat(systemEvents(henrysRoom.id())).isEmpty();
    }

    @Test
    void acceptThatFailedAfterMovingSucceedsWhenAcceptedAgain() {
        RoomView henrysRoom = createRoom("henry", "Mugi");
        String code = invite("henry");
        accept("yuki", code, false).expectStatus().isOk();

        // A retry whose first attempt actually finished (e.g. the response was lost).
        accept("yuki", code, false).expectStatus().isOk();

        assertThat(rooms.findById(henrysRoom.id()).block().memberCount()).isEqualTo(2);
    }

    @Test
    void memberOfADuoRoomCannotJoinAnother() {
        createRoom("henry", "Mugi");
        accept("yuki", invite("henry"), false).expectStatus().isOk();
        createRoom("mika", "Pico");

        assertError(accept("yuki", invite("mika"), true), HttpStatus.CONFLICT, "ALREADY_IN_ROOM");
    }

    @Test
    void concurrentAcceptsOfTheSameCodeLetOnlyOneIn() {
        RoomView room = createRoom("henry", "Mugi");
        String code = invite("henry");

        List<Integer> statuses = race(
                6,
                i -> accept("friend-" + i, code, false)
                        .returnResult(Void.class)
                        .getStatus()
                        .value());

        assertThat(statuses).containsOnlyOnce(200);
        assertThat(rooms.findById(room.id()).block().memberCount()).isEqualTo(2);
    }

    @Test
    void concurrentAcceptsOfDifferentCodesForTheLastSlotLetOnlyOneIn() {
        RoomView room = createRoom("henry", "Mugi");
        List<String> codes =
                List.of(invite("henry"), invite("henry"), invite("henry"), invite("henry"), invite("henry"));

        List<Integer> statuses = race(
                codes.size(),
                i -> accept("friend-" + i, codes.get(i), false)
                        .returnResult(Void.class)
                        .getStatus()
                        .value());

        assertThat(statuses).containsOnlyOnce(200);
        Room after = rooms.findById(room.id()).block();
        assertThat(after.memberCount()).isEqualTo(2);
        assertThat(after.memberIds()).hasSize(2);
        // Losers got their invitation back rather than burning it.
        Map<Boolean, Long> usedCounts = invitations
                .findAll()
                .collect(Collectors.partitioningBy(inv -> inv.usedAt() != null, Collectors.counting()))
                .block();
        assertThat(usedCounts.get(true)).isEqualTo(1);
    }

    @Test
    void oneUserAcceptingDifferentRoomsConcurrentlyJoinsOnlyOne() {
        List<String> codes = java.util.stream.IntStream.range(0, 6)
                .mapToObj(i -> {
                    String owner = "owner-" + i;
                    createRoom(owner, "Mugi");
                    return invite(owner);
                })
                .toList();
        // Both HTTP requests may have read this same snapshot before either accept starts.
        User stale = userService.getOrCreate("yuki", "yuki").block();
        List<String> results = Flux.fromIterable(codes)
                .flatMap(code -> invitationService
                        .accept(stale, code, false, false)
                        .map(RoomView::id)
                        .onErrorResume(ApiException.class, e -> Mono.just(e.code())))
                .collectList()
                .block();

        assertThat(results.stream().filter(id -> !id.equals("ALREADY_IN_ROOM")).count())
                .isEqualTo(1);
        User after = userService.getOrCreate("yuki", "yuki").block();
        assertThat(after.roomJoinId()).isNull();
        List<Room> memberships = mongo.find(
                        Query.query(Criteria.where("memberIds").is(after.id())), Room.class)
                .collectList()
                .block();
        assertThat(memberships).hasSize(1);
        assertThat(memberships.getFirst().id()).isEqualTo(after.roomId());
        assertThat(invitations
                        .findAll()
                        .filter(inv -> inv.usedAt() != null)
                        .count()
                        .block())
                .isEqualTo(1);
    }

    @Test
    void soloUserAcceptingTwoRoomsConcurrentlyLeavesOnlyTheWinningMembership() {
        RoomView previous = createRoom("yuki", "Pico");
        createRoom("henry", "Mugi");
        createRoom("mika", "Mochi");
        List<String> codes = List.of(invite("henry"), invite("mika"));
        User stale = userService.getOrCreate("yuki", "yuki").block();
        List<String> results = Flux.fromIterable(codes)
                .flatMap(code -> invitationService
                        .accept(stale, code, true, false)
                        .map(RoomView::id)
                        .onErrorResume(ApiException.class, e -> Mono.just(e.code())))
                .collectList()
                .block();

        assertThat(results).containsOnlyOnce("ALREADY_IN_ROOM");
        assertThat(rooms.existsById(previous.id()).block()).isFalse();
        User after = userService.getOrCreate("yuki", "yuki").block();
        assertThat(mongo.find(Query.query(Criteria.where("memberIds").is(after.id())), Room.class)
                        .count()
                        .block())
                .isEqualTo(1);
        assertThat(after.roomJoinId()).isNull();
    }

    @Test
    void staleRetryOfACompletedAcceptKeepsTheInvitationSingleUse() {
        createRoom("henry", "Mugi");
        String code = invite("henry");
        User stale = userService.getOrCreate("yuki", "yuki").block();
        invitationService.accept(stale, code, false, false).block();

        invitationService.accept(stale, code, false, false).block();
        assertThat(invitations.findByCode(code).block().usedBy()).isEqualTo(stale.id());
        assertError(accept("mika", code, false), HttpStatus.GONE, "INVITATION_USED");
    }

    @Test
    void retryAfterUserMovedStillRemovesThePreviousSoloRoom() {
        createRoom("henry", "Mugi");
        RoomView previous = createRoom("yuki", "Pico");
        String code = invite("henry");
        accept("yuki", code, true).expectStatus().isOk();
        // Simulates a failure after the user was moved but before the previous room was removed.
        rooms.insert(Room.solo(
                        previous.id(),
                        userId("yuki"),
                        com.buddychat.buddy.Buddy.hatch("Pico", Instant.now()),
                        Instant.now()))
                .block();

        accept("yuki", code, true).expectStatus().isOk();
        assertThat(rooms.existsById(previous.id()).block()).isFalse();
    }

    @Test
    void fullRoomReleasesTheUsersReservationAndTheInvite() {
        createRoom("henry", "Mugi");
        String loserCode = invite("henry");
        String winnerCode = invite("henry");
        accept("mika", winnerCode, false).expectStatus().isOk();
        assertError(accept("yuki", loserCode, false), HttpStatus.CONFLICT, "ROOM_FULL");

        User after = userService.getOrCreate("yuki", "yuki").block();
        assertThat(after.roomId()).isNull();
        assertThat(after.roomJoinId()).isNull();
        Invitation released = invitations.findByCode(loserCode).block();
        assertThat(released.usedBy()).isNull();
        assertThat(released.usedAt()).isNull();
        createRoom("yuki", "Pico");
    }

    @Test
    void anInterruptedReservationCanResumeButCannotJoinAnotherRoom() {
        createRoom("henry", "Mugi");
        createRoom("mika", "Pico");
        String code = invite("henry");
        String otherCode = invite("mika");
        User user = userService.getOrCreate("yuki", "yuki").block();
        Invitation claimed = invitations.findByCode(code).block();
        mongo.updateFirst(
                        Query.query(Criteria.where("_id").is(claimed.id())),
                        new Update().set("usedAt", Instant.now()).set("usedBy", user.id()),
                        Invitation.class)
                .block();
        userService.reserveRoomJoin(user.id(), null, claimed.id()).block();

        assertError(accept("yuki", otherCode, false), HttpStatus.CONFLICT, "ALREADY_IN_ROOM");
        assertError(post("yuki", "/api/rooms", Map.of("buddyName", "Egg")), HttpStatus.CONFLICT, "ROOM_ALREADY_EXISTS");
        accept("yuki", code, false).expectStatus().isOk();
        assertThat(userService.getOrCreate("yuki", "yuki").block().roomJoinId()).isNull();
    }

    // --- helpers ---

    private String userId(String uid) {
        return mongo.findOne(Query.query(Criteria.where("firebaseUid").is(uid)), User.class)
                .block()
                .id();
    }

    private RoomView createRoom(String uid, String buddyName) {
        return post(uid, "/api/rooms", Map.of("buddyName", buddyName))
                .expectStatus()
                .isCreated()
                .expectBody(RoomView.class)
                .returnResult()
                .getResponseBody();
    }

    private String invite(String uid) {
        return post(uid, "/api/rooms/me/invitations", null)
                .expectStatus()
                .isCreated()
                .expectBody(Invite.class)
                .returnResult()
                .getResponseBody()
                .code();
    }

    private WebTestClient.ResponseSpec accept(String uid, String code, boolean leave) {
        return post(uid, "/api/invitations/" + code + "/accept", Map.of("leaveCurrentRoom", leave));
    }

    // Having said yes to coming in as the one whose seat the code is for.
    private WebTestClient.ResponseSpec acceptSeat(String uid, String code, boolean leave) {
        return post(uid, "/api/invitations/" + code + "/accept", Map.of("leaveCurrentRoom", leave, "takeSeat", true));
    }

    private WebTestClient.ResponseSpec acceptAsGuest(String uid, String code) {
        return postAsGuest(uid, "/api/invitations/" + code + "/accept", Map.of("leaveCurrentRoom", true));
    }

    // Signed in anonymously, with no account linked (UserService.isGuest).
    private WebTestClient.ResponseSpec postAsGuest(String uid, String path, Object body) {
        var request = client.mutateWith(mockJwt()
                        .jwt(jwt -> jwt.subject(uid)
                                .claim("firebase", Map.of("sign_in_provider", "anonymous", "identities", Map.of()))))
                .post()
                .uri(path);
        return (body == null ? request : request.bodyValue(body)).exchange();
    }

    private WebTestClient.ResponseSpec get(String uid, String path) {
        return as(uid).get().uri(path).exchange();
    }

    private WebTestClient.ResponseSpec post(String uid, String path, Object body) {
        var request = as(uid).post().uri(path);
        return (body == null ? request : request.bodyValue(body)).exchange();
    }

    // The uid doubles as the display name so assertions can read member names.
    private WebTestClient as(String uid) {
        return client.mutateWith(mockJwt().jwt(jwt -> jwt.subject(uid).claim("name", uid)));
    }

    private List<Tuple> systemEvents(String roomId) {
        return mongo.find(
                        Query.query(
                                Criteria.where("roomId").is(roomId).and("type").is(Message.Type.SYSTEM)),
                        Message.class)
                .map(m -> tuple(m.systemEvent(), m.actorId(), m.text()))
                .collectList()
                .block();
    }

    private static void assertError(WebTestClient.ResponseSpec response, HttpStatus status, String code) {
        EntityExchangeResult<Error> result = response.expectStatus()
                .isEqualTo(status)
                .expectBody(Error.class)
                .returnResult();
        assertThat(result.getResponseBody().code()).isEqualTo(code);
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
