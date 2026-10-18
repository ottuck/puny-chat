package com.buddychat.room;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.chat.ChatService;
import com.buddychat.common.ApiException;
import com.buddychat.notification.NotificationService;
import com.buddychat.realtime.RoomHub;
import com.buddychat.realtime.ServerEvent;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

@Service
class InvitationService {

    static final Duration VALIDITY = Duration.ofHours(24);
    // No 0/O or 1/I/L: codes are read aloud and typed by hand.
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    // Short enough to type from a chat bubble that cannot be copied in part. Few codes are live at a
    // time (24 hours, single use), and wrong guesses are limited below.
    private static final int CODE_LENGTH = 4;
    // Kept in memory: there is one server. A restart only resets the count.
    static final int MAX_MISSES = 10;
    private static final Duration MISS_WINDOW = Duration.ofMinutes(10);

    private final InvitationRepository invitations;
    private final RoomService roomService;
    private final UserService userService;
    private final ChatService chatService;
    private final NotificationService notifications;
    private final ReactiveMongoTemplate mongo;
    private final RoomHub hub;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Misses> misses = new ConcurrentHashMap<>();

    private record Misses(Instant since, int count) {}

    InvitationService(
            InvitationRepository invitations,
            RoomService roomService,
            UserService userService,
            ChatService chatService,
            NotificationService notifications,
            ReactiveMongoTemplate mongo,
            RoomHub hub,
            Clock clock) {
        this.invitations = invitations;
        this.roomService = roomService;
        this.userService = userService;
        this.chatService = chatService;
        this.notifications = notifications;
        this.mongo = mongo;
        this.hub = hub;
        this.clock = clock;
    }

    /**
     * A code for the room. {@code self}: for the user making it, to go on somewhere else (their
     * seat). Otherwise, in a full room, for the other member to come back from somewhere else.
     */
    Mono<Invitation> create(User user, boolean self) {
        return roomService.findMine(user).flatMap(room -> {
            String replaces = self
                    ? user.id()
                    : room.isFull()
                            ? room.memberIds().stream()
                                    .filter(id -> !id.equals(user.id()))
                                    .findFirst()
                                    .orElse(null)
                            : null;
            Instant now = Instant.now(clock);
            // A new random code per attempt; the unique index catches the rare collision.
            return Mono.defer(() -> invitations.insert(new Invitation(
                            null,
                            room.id(),
                            newCode(),
                            user.id(),
                            now,
                            now.plus(VALIDITY),
                            null,
                            null,
                            null,
                            replaces)))
                    .retryWhen(Retry.max(3).filter(DuplicateKeyException.class::isInstance));
        });
    }

    /**
     * Joins the invitation's room. A user who already has a solo room must confirm leaving it
     * ({@code leaveCurrentRoom}); that room and its buddy are deleted (docs/PROJECT.md).
     *
     * <p>The steps are separate updates (no transactions). If one fails midway, the same user
     * accepting the same code again picks up where it stopped instead of being told the code is
     * used, so a half-done accept never leaves a ghost member holding the room's last slot.
     */
    Mono<RoomView> accept(User user, String rawCode, boolean leaveCurrentRoom, boolean takeSeat) {
        String code = rawCode.trim().toUpperCase(Locale.ROOT);
        Instant now = Instant.now(clock);
        if (tooManyMisses(user.id(), now)) {
            return Mono.error(new ApiException(HttpStatus.TOO_MANY_REQUESTS, "INVITATION_RATE_LIMIT"));
        }
        return invitations
                .findByCode(code)
                .switchIfEmpty(Mono.defer(() -> {
                    miss(user.id(), now);
                    return Mono.error(new ApiException(HttpStatus.NOT_FOUND, "INVITATION_NOT_FOUND"));
                }))
                .flatMap(invitation -> {
                    boolean resuming = user.id().equals(invitation.usedBy());
                    boolean alreadyHere = invitation.roomId().equals(user.roomId());
                    if (alreadyHere && !resuming) {
                        return Mono.error(new ApiException(HttpStatus.CONFLICT, "ALREADY_MEMBER"));
                    }
                    if (!resuming && invitation.usedAt() != null) return Mono.error(invitationUsed());
                    if (!resuming && !invitation.expiresAt().isAfter(now))
                        return Mono.error(new ApiException(HttpStatus.GONE, "INVITATION_EXPIRED"));
                    return (resuming ? Mono.<Void>empty() : checkTakesSeat(invitation, takeSeat))
                            .then(alreadyHere ? Mono.<Void>empty() : checkCanLeaveCurrentRoom(user, leaveCurrentRoom))
                            .then(claim(invitation, user, now))
                            .flatMap(claimed -> reserve(claimed, user)
                                    .then(seat(claimed, user))
                                    .flatMap(seat -> finish(claimed, user)
                                            .then(cleanPreviousRoom(claimed, user))
                                            .then(inherit(claimed, user, seat == Seat.TOOK_SEAT))
                                            .then(seat == Seat.NEW ? announceJoin(claimed, user) : Mono.empty())
                                            .then(joined(claimed, user)))
                                    .onErrorResume(
                                            ApiException.class,
                                            e -> "ROOM_NOT_FOUND".equals(e.code())
                                                    ? roomService
                                                            .leaveFromRoom(claimed.roomId(), user)
                                                            .then(release(claimed, user))
                                                            .then(Mono.error(e))
                                                    : Mono.error(e)));
                });
    }

    private Mono<Void> reserve(Invitation invitation, User user) {
        return userService
                .reserveRoomJoin(user.id(), user.roomId(), invitation.id())
                .flatMap(reserved -> reserved ? Mono.just(true) : userService.isInRoom(user.id(), invitation.roomId()))
                .flatMap(reserved -> reserved
                        ? Mono.<Void>empty()
                        : releaseInvitation(invitation, user).then(Mono.error(alreadyInRoom())));
    }

    private Mono<Void> finish(Invitation invitation, User user) {
        return userService
                .finishRoomJoin(user.id(), user.roomId(), invitation.roomId(), invitation.id())
                .flatMap(finished -> finished ? Mono.just(true) : userService.isInRoom(user.id(), invitation.roomId()))
                .flatMap(finished -> finished
                        ? Mono.<Void>empty()
                        // E.g. another device left the old room during this join. Do not leave a
                        // member behind in the target or overwrite the user's newer room.
                        : roomService
                                .leaveFromRoom(invitation.roomId(), user)
                                .then(release(invitation, user))
                                .then(Mono.error(alreadyInRoom())));
    }

    private Mono<Void> cleanPreviousRoom(Invitation invitation, User user) {
        String previous = invitation.previousRoomId();
        return previous == null || previous.equals(invitation.roomId())
                ? Mono.empty()
                : roomService.leaveFromRoom(previous, user);
    }

    private Mono<RoomView> joined(Invitation invitation, User user) {
        return roomService
                .findById(invitation.roomId())
                .filter(room -> room.closureId() == null && room.memberIds().contains(user.id()))
                .switchIfEmpty(Mono.error(new ApiException(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND")))
                .flatMap(roomService::toView)
                .doOnNext(room ->
                        hub.publish(room.id(), new ServerEvent.MemberJoined(user.id(), user.displayName()), null));
    }

    // A code for someone's seat is said out loud first: whoever uses it takes over that person (e.g.
    // using one's own code for the partner by mistake would push the partner out). The name goes
    // with the error so the app can ask "come in as them?".
    private Mono<Void> checkTakesSeat(Invitation invitation, boolean takeSeat) {
        String replaced = invitation.replacesId();
        if (replaced == null || takeSeat) return Mono.empty();
        return userService
                .findAllById(List.of(replaced))
                .next()
                .map(User::displayName)
                .defaultIfEmpty("")
                .flatMap(name -> Mono.error(new ApiException(HttpStatus.CONFLICT, "SEAT_CONFIRMATION_REQUIRED", name)));
    }

    private Mono<Void> checkCanLeaveCurrentRoom(User user, boolean leaveCurrentRoom) {
        if (user.roomId() == null) return Mono.empty();
        return roomService.findMine(user).flatMap(current -> {
            // Leaving a room with another member in it is not part of the MVP.
            if (current.memberCount() > 1) return Mono.error(new ApiException(HttpStatus.CONFLICT, "ALREADY_IN_ROOM"));
            if (!leaveCurrentRoom)
                return Mono.error(new ApiException(HttpStatus.CONFLICT, "LEAVE_CONFIRMATION_REQUIRED"));
            return Mono.<Void>empty();
        });
    }

    // Keep the old room on the invitation, including after roomId was changed: a retry can
    // still finish old-room cleanup. Existing used invitations have no previousRoomId yet.
    private Mono<Invitation> claim(Invitation invitation, User user, Instant now) {
        return mongo.findAndModify(
                        query(where("_id")
                                .is(invitation.id())
                                .and("usedAt")
                                .is(null)
                                .and("expiresAt")
                                .gt(now)),
                        new Update().set("usedAt", now).set("usedBy", user.id()).set("previousRoomId", user.roomId()),
                        FindAndModifyOptions.options().returnNew(true),
                        Invitation.class)
                .switchIfEmpty(Mono.defer(() -> invitations
                        .findById(invitation.id())
                        .filter(current -> user.id().equals(current.usedBy()))))
                .switchIfEmpty(Mono.error(invitationUsed()))
                .flatMap(claimed -> {
                    if (claimed.previousRoomId() != null
                            || user.roomId() == null
                            || user.roomId().equals(claimed.roomId())) return Mono.just(claimed);
                    return mongo.findAndModify(
                                    query(where("_id")
                                            .is(claimed.id())
                                            .and("usedBy")
                                            .is(user.id())
                                            .and("previousRoomId")
                                            .is(null)),
                                    Update.update("previousRoomId", user.roomId()),
                                    FindAndModifyOptions.options().returnNew(true),
                                    Invitation.class)
                            .switchIfEmpty(invitations.findById(claimed.id()));
                });
    }

    // How this call placed the user: in a free slot, in the other member's seat, or neither because
    // an earlier try of the same accept already did. Only the first two are said in the timeline.
    private enum Seat {
        NEW,
        TOOK_SEAT,
        AGAIN
    }

    /**
     * A place in the room: a free slot, or with a code made for the other member, that member's seat.
     * If that member left meanwhile, the code fills the free slot; if the one who made it left, it is
     * no longer valid.
     */
    private Mono<Seat> seat(Invitation invitation, User user) {
        String replaced = invitation.replacesId();
        if (replaced == null) return joinOrRelease(invitation, user);
        return roomService
                .takeSeat(invitation.roomId(), replaced, invitation.createdBy(), user.id())
                .flatMap(took -> took
                        ? Mono.just(Seat.TOOK_SEAT)
                        : roomService.findById(invitation.roomId()).flatMap(room -> {
                            if (room.memberIds().contains(user.id())) return Mono.just(Seat.AGAIN);
                            if (room.memberIds().contains(replaced)) {
                                return release(invitation, user)
                                        .then(Mono.error(new ApiException(HttpStatus.GONE, "INVITATION_EXPIRED")));
                            }
                            return joinOrRelease(invitation, user);
                        }));
    }

    // A friend came in with an invite: said once in the timeline, and the one who invited them is
    // told (docs/PROJECT.md, 참가 알림). A seat taken over says MEMBER_RETURNED instead (handOver).
    private Mono<Void> announceJoin(Invitation invitation, User user) {
        return chatService
                .recordSystemEvent(invitation.roomId(), "MEMBER_JOINED", user.id(), user.displayName())
                .doOnNext(message -> {
                    hub.publish(invitation.roomId(), new ServerEvent.NewMessage(message), null);
                    notifications.onMemberJoined(message, user);
                })
                .then();
    }

    // With a code made for a member: their history follows them to this account. Safe to repeat.
    private Mono<Void> inherit(Invitation invitation, User user, boolean announce) {
        String replaced = invitation.replacesId();
        return replaced == null ? Mono.empty() : roomService.handOver(invitation.roomId(), replaced, user, announce);
    }

    // The room can still be full when another code for it was accepted at the same moment. Then
    // the claimed invitation is handed back, since nobody actually used it.
    private Mono<Seat> joinOrRelease(Invitation invitation, User user) {
        return roomService.join(invitation.roomId(), user.id()).flatMap(joined -> switch (joined) {
            case ADDED -> Mono.just(Seat.NEW);
            case ALREADY_MEMBER -> Mono.just(Seat.AGAIN);
            case FULL -> release(invitation, user).then(Mono.error(new ApiException(HttpStatus.CONFLICT, "ROOM_FULL")));
        });
    }

    private Mono<Void> release(Invitation invitation, User user) {
        return userService.releaseRoomJoin(user.id(), invitation.id()).then(releaseInvitation(invitation, user));
    }

    private Mono<Void> releaseInvitation(Invitation invitation, User user) {
        return mongo.updateFirst(
                        query(where("_id").is(invitation.id()).and("usedBy").is(user.id())),
                        new Update().unset("usedAt").unset("usedBy").unset("previousRoomId"),
                        Invitation.class)
                .then();
    }

    private static ApiException alreadyInRoom() {
        return new ApiException(HttpStatus.CONFLICT, "ALREADY_IN_ROOM");
    }

    private boolean tooManyMisses(String userId, Instant now) {
        Misses current = misses.get(userId);
        return current != null && current.since().plus(MISS_WINDOW).isAfter(now) && current.count() >= MAX_MISSES;
    }

    private void miss(String userId, Instant now) {
        if (misses.size() > 10_000) {
            misses.values().removeIf(m -> !m.since().plus(MISS_WINDOW).isAfter(now));
        }
        misses.compute(
                userId,
                (id, current) ->
                        current == null || !current.since().plus(MISS_WINDOW).isAfter(now)
                                ? new Misses(now, 1)
                                : new Misses(current.since(), current.count() + 1));
    }

    private String newCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }

    private static ApiException invitationUsed() {
        return new ApiException(HttpStatus.GONE, "INVITATION_USED");
    }
}
