package com.buddychat.room;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.common.ApiException;
import com.buddychat.realtime.RoomHub;
import com.buddychat.realtime.ServerEvent;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
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
    private static final int CODE_LENGTH = 8;

    private final InvitationRepository invitations;
    private final RoomService roomService;
    private final UserService userService;
    private final ReactiveMongoTemplate mongo;
    private final RoomHub hub;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    InvitationService(
            InvitationRepository invitations,
            RoomService roomService,
            UserService userService,
            ReactiveMongoTemplate mongo,
            RoomHub hub,
            Clock clock) {
        this.invitations = invitations;
        this.roomService = roomService;
        this.userService = userService;
        this.mongo = mongo;
        this.hub = hub;
        this.clock = clock;
    }

    Mono<Invitation> create(User user) {
        return roomService.findMine(user).flatMap(room -> {
            if (room.isFull()) return Mono.error(new ApiException(HttpStatus.CONFLICT, "ROOM_FULL"));
            Instant now = Instant.now(clock);
            // A new random code per attempt; the unique index catches the rare collision.
            return Mono.defer(() -> invitations.insert(new Invitation(
                            null, room.id(), newCode(), user.id(), now, now.plus(VALIDITY), null, null, null)))
                    .retryWhen(Retry.max(3).filter(DuplicateKeyException.class::isInstance));
        });
    }

    /**
     * Joins the invitation's room. A user who already has a solo room must confirm leaving it
     * ({@code leaveCurrentRoom}); that room and its buddy are deleted (docs/server-design.md).
     *
     * <p>The steps are separate updates (no transactions). If one fails midway, the same user
     * accepting the same code again picks up where it stopped instead of being told the code is
     * used, so a half-done accept never leaves a ghost member holding the room's last slot.
     */
    Mono<RoomView> accept(User user, String rawCode, boolean leaveCurrentRoom) {
        String code = rawCode.trim().toUpperCase(Locale.ROOT);
        Instant now = Instant.now(clock);
        return invitations
                .findByCode(code)
                .switchIfEmpty(Mono.error(new ApiException(HttpStatus.NOT_FOUND, "INVITATION_NOT_FOUND")))
                .flatMap(invitation -> {
                    boolean resuming = user.id().equals(invitation.usedBy());
                    boolean alreadyHere = invitation.roomId().equals(user.roomId());
                    if (alreadyHere && !resuming) {
                        return Mono.error(new ApiException(HttpStatus.CONFLICT, "ALREADY_MEMBER"));
                    }
                    if (!resuming && invitation.usedAt() != null) return Mono.error(invitationUsed());
                    if (!resuming && !invitation.expiresAt().isAfter(now))
                        return Mono.error(new ApiException(HttpStatus.GONE, "INVITATION_EXPIRED"));
                    return (alreadyHere ? Mono.<Void>empty() : checkCanLeaveCurrentRoom(user, leaveCurrentRoom))
                            .then(claim(invitation, user, now))
                            .flatMap(claimed -> reserve(claimed, user)
                                    .then(joinOrRelease(claimed, user))
                                    .then(finish(claimed, user))
                                    .then(cleanPreviousRoom(claimed, user))
                                    .then(joined(claimed, user)));
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
                .flatMap(roomService::toView)
                .doOnNext(room ->
                        hub.publish(room.id(), new ServerEvent.MemberJoined(user.id(), user.displayName()), null));
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

    // The room can still be full when another code for it was accepted at the same moment. Then
    // the claimed invitation is handed back, since nobody actually used it.
    private Mono<Void> joinOrRelease(Invitation invitation, User user) {
        return roomService.join(invitation.roomId(), user.id()).flatMap(joined -> {
            if (joined) return Mono.<Void>empty();
            return release(invitation, user).then(Mono.error(new ApiException(HttpStatus.CONFLICT, "ROOM_FULL")));
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
