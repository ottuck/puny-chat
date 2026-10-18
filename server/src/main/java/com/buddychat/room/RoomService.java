package com.buddychat.room;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.buddy.Buddy;
import com.buddychat.buddy.BuddyView;
import com.buddychat.chat.ChatService;
import com.buddychat.common.ApiException;
import com.buddychat.realtime.RoomHub;
import com.buddychat.realtime.ServerEvent;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.bson.types.ObjectId;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class RoomService {

    private final RoomRepository rooms;
    private final UserService userService;
    private final ReactiveMongoTemplate mongo;
    private final ChatService chatService;
    private final RoomHub hub;
    private final Clock clock;

    RoomService(
            RoomRepository rooms,
            UserService userService,
            ReactiveMongoTemplate mongo,
            ChatService chatService,
            RoomHub hub,
            Clock clock) {
        this.rooms = rooms;
        this.userService = userService;
        this.mongo = mongo;
        this.chatService = chatService;
        this.hub = hub;
        this.clock = clock;
    }

    /**
     * Saves the room before attaching it to the user, so an insert failure leaves no dangling
     * roomId. Only one concurrent create can attach its room; the other candidates are removed.
     */
    public Mono<RoomView> create(User user, String buddyName) {
        if (user.roomId() != null || user.roomJoinId() != null) return Mono.error(roomAlreadyExists());
        String roomId = new ObjectId().toHexString();
        Instant now = Instant.now(clock);
        return rooms.insert(Room.solo(roomId, user.id(), Buddy.hatch(buddyName, now), now))
                .flatMap(room -> userService
                        .assignRoomIfNone(user.id(), roomId)
                        .flatMap(claimed -> claimed ? toView(room) : Mono.error(roomAlreadyExists())))
                .onErrorResume(error -> userService
                        .isInRoom(user.id(), roomId)
                        // A write may have succeeded even though its response was lost.
                        .flatMap(attached -> attached ? Mono.<Void>empty() : deleteIfSolo(roomId, user.id()))
                        .onErrorResume(cleanupError -> {
                            error.addSuppressed(cleanupError);
                            return Mono.empty();
                        })
                        .then(Mono.error(error)));
    }

    /** Who is in the room (empty if it no longer exists). */
    public Mono<List<String>> memberIds(String roomId) {
        return rooms.findById(roomId).filter(room -> room.closureId() == null).map(Room::memberIds);
    }

    public Mono<RoomView> getMine(User user) {
        return findMine(user).flatMap(this::toView);
    }

    /**
     * Leaves the user's room (docs/PROJECT.md, Room·초대 규칙). The other member keeps the room
     * and its buddy and is told right away; a room left empty is deleted with its history. The user's
     * other devices are disconnected. Separate updates, no transaction: leaving again finishes a leave
     * that failed midway.
     */
    public Mono<Void> leave(User user) {
        String roomId = user.roomId();
        if (roomId == null) return Mono.error(roomNotFound());
        return leaveFromRoom(roomId, user);
    }

    // Also finishes cleanup of the old room after an invitation changed the user's roomId.
    Mono<Void> leaveFromRoom(String roomId, User user) {
        Mono<Boolean> removed = mongo.updateFirst(
                        query(where("_id").is(roomId).and("memberIds").is(user.id())),
                        new Update().pull("memberIds", user.id()).inc("memberCount", -1),
                        Room.class)
                .map(result -> result.getModifiedCount() == 1);
        return removed.flatMap(wasMember -> userService
                .leaveRoom(user.id(), roomId)
                .then(Mono.fromRunnable(
                        () -> hub.disconnect(roomId, user.id(), new ServerEvent.Error("ROOM_NOT_FOUND", null))))
                .then(afterLeaving(roomId, user, wasMember)));
    }

    // Both members may leave at once; whoever finds the room empty deletes it. The one who remains
    // is told, once: a retried leave (announce = false) only tidies up.
    private Mono<Void> afterLeaving(String roomId, User user, boolean announce) {
        return mongo.remove(query(where("_id").is(roomId).and("memberCount").is(0)), Room.class)
                .flatMap(result -> {
                    if (result.getDeletedCount() == 1) return chatService.deleteRoomHistory(roomId);
                    if (!announce) return Mono.<Void>empty();
                    return chatService
                            .recordSystemEvent(roomId, "MEMBER_LEFT", user.id(), user.displayName())
                            .doOnSuccess(message -> {
                                hub.publish(roomId, new ServerEvent.MemberLeft(user.id()), null);
                                if (message != null) hub.publish(roomId, new ServerEvent.NewMessage(message), null);
                            })
                            // The last member may have left meanwhile and deleted the history before
                            // this note was stored; then it goes too.
                            .then(rooms.existsById(roomId))
                            .flatMap(exists -> exists ? Mono.<Void>empty() : chatService.deleteRoomHistory(roomId));
                });
    }

    /** Removes the invite codes the user made, used or not (account deletion). */
    public Mono<Void> deleteInvitationsBy(String userId) {
        return mongo.remove(query(where("createdBy").is(userId)), Invitation.class)
                .then();
    }

    Mono<Room> findMine(User user) {
        if (user.roomId() == null) return Mono.error(roomNotFound());
        return rooms.findById(user.roomId())
                .filter(room -> room.closureId() == null && room.memberIds().contains(user.id()))
                .switchIfEmpty(Mono.error(roomNotFound()));
    }

    Mono<Room> findById(String roomId) {
        return rooms.findById(roomId).switchIfEmpty(Mono.error(roomNotFound()));
    }

    /** How {@link #join} went: added now, already in (an earlier accept got this far), or no room for them. */
    enum Join {
        ADDED,
        ALREADY_MEMBER,
        FULL
    }

    /**
     * Adds a member in one conditional update: only if the room still has a free slot and the
     * user is not already in it. Of any number of concurrent joins, at most the free slots succeed.
     * A user who is already a member counts as joined (an earlier accept got this far, then failed).
     */
    Mono<Join> join(String roomId, String userId) {
        return mongo.updateFirst(
                        query(where("_id")
                                .is(roomId)
                                .and("memberCount")
                                .lt(Room.MAX_MEMBERS)
                                .and("closureId")
                                .is(null)
                                .and("memberIds")
                                .ne(userId)),
                        new Update().push("memberIds", userId).inc("memberCount", 1),
                        Room.class)
                .flatMap(result -> result.getModifiedCount() == 1
                        ? Mono.just(Join.ADDED)
                        : mongo.exists(
                                        query(where("_id")
                                                .is(roomId)
                                                .and("memberIds")
                                                .is(userId)
                                                .and("closureId")
                                                .is(null)),
                                        Room.class)
                                .map(member -> member ? Join.ALREADY_MEMBER : Join.FULL));
    }

    /**
     * Gives a member's seat to another user in one conditional update: only while the room still
     * holds exactly the two who shared it when the code was made, and is not being closed. The seat
     * keeps its place in the member order.
     */
    Mono<Boolean> takeSeat(String roomId, String replacedId, String keeperId, String userId) {
        return mongo.updateFirst(
                        query(where("_id")
                                .is(roomId)
                                .and("closureId")
                                .is(null)
                                .and("memberIds")
                                .all(replacedId, keeperId)),
                        new Update()
                                .set("memberIds.$[seat]", userId)
                                .filterArray(where("seat").is(replacedId)),
                        Room.class)
                .map(result -> result.getModifiedCount() == 1);
    }

    /**
     * After {@code to} came in with a code made for {@code fromId}: the old account loses the room
     * (its devices are told, {@code SEAT_TAKEN}) and its codes, and its messages, notes, read mark
     * and today's talk move to the new one. Every step can run again; only the note is said once.
     */
    Mono<Void> handOver(String roomId, String fromId, User to, boolean announce) {
        Mono<Void> note = chatService
                .recordSystemEvent(roomId, "MEMBER_RETURNED", to.id(), to.displayName())
                .doOnNext(message -> hub.publish(roomId, new ServerEvent.NewMessage(message), null))
                .then();
        return userService
                .leaveRoom(fromId, roomId)
                .then(Mono.fromRunnable(
                        () -> hub.disconnect(roomId, fromId, new ServerEvent.Error("SEAT_TAKEN", null))))
                .then(mongo.remove(
                        query(where("roomId")
                                .is(roomId)
                                .and("createdBy")
                                .is(fromId)
                                .and("usedAt")
                                .is(null)),
                        Invitation.class))
                .then(mongo.updateFirst(
                        query(where("_id")
                                .is(roomId)
                                .and("buddy.talkers")
                                .in(fromId)
                                .nin(to.id())),
                        new Update().set("buddy.talkers.$", to.id()),
                        Room.class))
                .then(mongo.updateFirst(
                        query(where("_id").is(roomId)), new Update().pull("buddy.talkers", fromId), Room.class))
                .then(chatService.handOverHistory(roomId, fromId, to.id()))
                .then(announce ? note : Mono.empty());
    }

    public Mono<Room> removalSnapshot(User user, String expectedRoomId, String targetId) {
        if (!expectedRoomId.equals(user.roomId()) || targetId.equals(user.id()))
            return Mono.error(new ApiException(HttpStatus.CONFLICT, "PARTNER_CHANGED"));
        return findMine(user)
                .filter(room -> room.memberIds().contains(targetId))
                .switchIfEmpty(Mono.error(new ApiException(HttpStatus.CONFLICT, "PARTNER_CHANGED")));
    }

    /** Only one of two simultaneous removal requests may own a conversation's closure. */
    public Mono<Room> claimRemoval(String operationId, Room snapshot, String ownerId) {
        var originalOrSolo = where("_id")
                .is(snapshot.id())
                .and("closureId")
                .is(null)
                .orOperator(
                        where("memberIds").is(snapshot.memberIds()),
                        where("memberIds").is(List.of(ownerId)));
        return mongo.findAndModify(
                        query(originalOrSolo),
                        Update.update("closureId", operationId),
                        FindAndModifyOptions.options().returnNew(true),
                        Room.class)
                .switchIfEmpty(rooms.findById(snapshot.id())
                        .flatMap(room -> operationId.equals(room.closureId())
                                ? Mono.just(room)
                                : Mono.error(new ApiException(HttpStatus.CONFLICT, "PARTNER_CHANGED"))))
                .switchIfEmpty(Mono.error(new ApiException(HttpStatus.CONFLICT, "PARTNER_CHANGED")));
    }

    /** Called only after the support record durably confirms ownership of the closure. */
    public Mono<Void> removePartner(
            String operationId, Room snapshot, String ownerId, String targetId, String newRoomId) {
        Mono<Room> close = rooms.findById(snapshot.id())
                .flatMap(room -> operationId.equals(room.closureId())
                        ? Mono.just(room)
                        : Mono.error(new ApiException(HttpStatus.CONFLICT, "PARTNER_CHANGED")))
                .defaultIfEmpty(snapshot);
        return close.flatMap(closed -> rooms.insert(new Room(
                                newRoomId,
                                List.of(ownerId),
                                1,
                                closed.buddy(),
                                closed.createdAt(),
                                closed.album(),
                                null,
                                null))
                        .onErrorResume(DuplicateKeyException.class, e -> rooms.findById(newRoomId)))
                .then(userService.replaceRoom(ownerId, snapshot.id(), newRoomId))
                .flatMap(attached -> attached ? Mono.<Void>empty() : deleteIfSolo(newRoomId, ownerId))
                .then(userService.leaveRoom(targetId, snapshot.id()))
                .then(mongo.find(query(where("roomId").is(snapshot.id())), Invitation.class)
                        .map(Invitation::id)
                        .collectList()
                        .flatMap(userService::releaseJoins))
                .then(mongo.remove(query(where("roomId").is(snapshot.id())), Invitation.class))
                .then(mongo.remove(
                        query(where("_id").is(snapshot.id()).and("closureId").is(operationId)), Room.class))
                .then(chatService.deleteRoomHistory(snapshot.id()))
                .then(Mono.fromRunnable(() -> {
                    hub.disconnect(snapshot.id(), targetId, new ServerEvent.Error("ROOM_NOT_FOUND", null));
                    hub.disconnect(snapshot.id(), ownerId, new ServerEvent.Error("ROOM_NOT_FOUND", null));
                }));
    }

    /** Deletes a room, with its history, only while the given user is still its only member. */
    Mono<Void> deleteIfSolo(String roomId, String userId) {
        return mongo.remove(
                        query(where("_id")
                                .is(roomId)
                                .and("memberCount")
                                .is(1)
                                .and("memberIds")
                                .is(List.of(userId))),
                        Room.class)
                .flatMap(result ->
                        result.getDeletedCount() == 1 ? chatService.deleteRoomHistory(roomId) : Mono.<Void>empty());
    }

    Mono<RoomView> toView(Room room) {
        return userService
                .findAllById(room.memberIds())
                .collectMap(User::id, Function.identity())
                .map(byId -> new RoomView(
                        room.id(),
                        members(room, byId),
                        BuddyView.of(room.buddy(), Instant.now(clock)),
                        room.createdAt(),
                        room.album() != null ? room.album() : List.of()));
    }

    // Keeps join order (the room's creator first).
    private static List<RoomView.Member> members(Room room, Map<String, User> byId) {
        return room.memberIds().stream()
                .map(id -> new RoomView.Member(
                        id, byId.containsKey(id) ? byId.get(id).displayName() : null))
                .toList();
    }

    private static ApiException roomAlreadyExists() {
        return new ApiException(HttpStatus.CONFLICT, "ROOM_ALREADY_EXISTS");
    }

    private static ApiException roomNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND");
    }
}
