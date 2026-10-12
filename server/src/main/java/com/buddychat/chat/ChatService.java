package com.buddychat.chat;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.common.ApiException;
import com.buddychat.room.RoomAccess;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.bson.types.ObjectId;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class ChatService {

    public static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_CLIENT_MESSAGE_ID_LENGTH = 64;

    private final MessageRepository messages;
    private final ReactiveMongoTemplate mongo;
    private final Clock clock;
    private final RoomAccess access;
    private final UserService userService;

    ChatService(
            MessageRepository messages,
            ReactiveMongoTemplate mongo,
            Clock clock,
            RoomAccess access,
            UserService userService) {
        this.messages = messages;
        this.mongo = mongo;
        this.clock = clock;
        this.access = access;
        this.userService = userService;
    }

    /** {@code created} is false when this was a resend of an already stored message. */
    public record SendResult(Message message, boolean created) {}

    public record MessagePage(List<Message> messages, boolean hasMore) {}

    /**
     * Stores a text message in the sender's room. Sending the same {@code clientMessageId} again
     * (a retry after a dropped connection) returns the stored message instead of a duplicate.
     */
    public Mono<SendResult> send(User sender, String clientMessageId, String rawText) {
        String roomId = sender.roomId();
        if (roomId == null) return Mono.error(new ApiException(HttpStatus.CONFLICT, "ROOM_NOT_FOUND"));
        String text = rawText == null ? "" : rawText.strip();
        if (clientMessageId == null
                || clientMessageId.isBlank()
                || clientMessageId.length() > MAX_CLIENT_MESSAGE_ID_LENGTH
                || text.isEmpty()
                || text.length() > Message.MAX_TEXT_LENGTH) {
            return Mono.error(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MESSAGE"));
        }
        Message message = Message.text(roomId, sender.id(), clientMessageId, text, Instant.now(clock));
        return access.requireMember(roomId, sender.id())
                .then(messages.insert(message)
                        .map(saved -> new SendResult(saved, true))
                        .onErrorResume(
                                DuplicateKeyException.class,
                                e -> messages.findByRoomIdAndSenderIdAndClientMessageId(
                                                roomId, sender.id(), clientMessageId)
                                        .map(existing -> new SendResult(existing, false))))
                .flatMap(result -> access.requireMember(roomId, sender.id())
                        .thenReturn(result)
                        .onErrorResume(
                                ApiException.class,
                                e -> (result.created()
                                                ? messages.deleteById(
                                                        result.message().id())
                                                : Mono.<Void>empty())
                                        .then(Mono.error(e))));
    }

    /**
     * Adds a buddy event (fed, pooped, …) to a room's timeline. Emits the message only when it is
     * new; a key recorded before (e.g. the same poop noticed again) completes empty.
     */
    public Mono<Message> recordBuddyEvent(String roomId, String event, @Nullable String actorId, String key) {
        return recordBuddyEvent(roomId, event, null, actorId, key);
    }

    /** As above, with a detail kept in {@code text} (the new level for LEVELED_UP). */
    public Mono<Message> recordBuddyEvent(
            String roomId, String event, @Nullable String detail, @Nullable String actorId, String key) {
        return access.isOpen(roomId)
                .flatMap(open -> open
                        ? messages.insert(Message.buddyEvent(roomId, event, detail, actorId, key, Instant.now(clock)))
                                .flatMap(this::keepInOpenRoom)
                                .onErrorResume(DuplicateKeyException.class, e -> Mono.empty())
                        : Mono.empty());
    }

    /** Adds a system entry (e.g. a member left) to a room's timeline. */
    public Mono<Message> recordSystemEvent(String roomId, String event, String actorId, @Nullable String actorName) {
        Instant now = Instant.now(clock);
        String key = "system:" + event + ":" + actorId + ":" + now.toEpochMilli();
        return access.isOpen(roomId)
                .zipWith(actorCanBeNamed(actorId))
                .flatMap(allowed -> allowed.getT1() && allowed.getT2()
                        ? messages.insert(Message.system(roomId, event, actorId, actorName, key, now))
                                .flatMap(this::keepInOpenRoom)
                        : Mono.empty());
    }

    // An event started before removal may finish after the old timeline has been deleted.
    private Mono<Message> keepInOpenRoom(Message message) {
        return access.isOpen(message.roomId())
                .flatMap(open -> open
                        ? Mono.just(message)
                        : messages.deleteById(message.id()).then(Mono.empty()))
                .flatMap(saved -> {
                    if (saved.type() == Message.Type.SYSTEM && saved.actorId() != null) {
                        // The row is inserted before this check. If deletion begins afterwards its
                        // purge sees it; if it already began, the durable fence removes it.
                        return actorCanBeNamed(saved.actorId())
                                .flatMap(allowed -> allowed
                                        ? Mono.just(saved)
                                        : messages.deleteById(saved.id())
                                                // A history request may have observed the brief insertion
                                                // window. Invalidate this room even if the main purge did
                                                // not collect it, so online and offline caches discard it.
                                                .then(access.invalidateHistory(
                                                        List.of(saved.roomId()), saved.actorId()))
                                                .then(Mono.empty()));
                    }
                    if (saved.type() != Message.Type.BUDDY_EVENT || saved.actorId() == null) return Mono.just(saved);
                    // A care request that started before departure may insert its event after the
                    // account purge. Do not restore the departed actor's identifier then.
                    return access.requireMember(saved.roomId(), saved.actorId())
                            .thenReturn(saved)
                            .onErrorResume(
                                    ApiException.class,
                                    error -> mongo.updateFirst(
                                                    query(where("_id").is(saved.id())),
                                                    new Update().unset("actorId"),
                                                    Message.class)
                                            .then(access.invalidateHistory(List.of(saved.roomId()), saved.actorId()))
                                            .thenReturn(saved.withoutActor()));
                });
    }

    private Mono<Boolean> actorCanBeNamed(String userId) {
        return mongo.exists(query(where("_id").is(userId)), HistoryDeletion.class)
                .flatMap(deleting -> deleting ? Mono.just(false) : userService.exists(userId));
    }

    /** Fence late named events before any room membership or authored history is removed. */
    public Mono<Void> beginAccountDeletion(String userId) {
        return mongo.upsert(
                        query(where("_id").is(userId)),
                        new Update().setOnInsert("roomIds", List.of()),
                        HistoryDeletion.class)
                .then();
    }

    /** The user document must be gone before removing the deletion fence. */
    public Mono<Void> finishAccountDeletion(String userId) {
        return mongo.remove(query(where("_id").is(userId)), HistoryDeletion.class)
                .then();
    }

    /** A failed final cleanup can outlive the user; retries then create a different user ID. */
    public Mono<Void> cleanupFinishedDeletions() {
        return mongo.find(new Query(), HistoryDeletion.class)
                .concatMap(deletion -> userService
                        .exists(deletion.id())
                        .flatMap(exists -> exists ? Mono.<Void>empty() : finishAccountDeletion(deletion.id())))
                .then();
    }

    /** Removes a deleted room's timeline and read marks. */
    public Mono<Void> deleteRoomHistory(String roomId) {
        return Mono.when(
                mongo.remove(query(where("roomId").is(roomId)), Message.class),
                mongo.remove(query(where("roomId").is(roomId)), ReadMark.class));
    }

    /** Removes how far the user has read, in any room (account deletion). */
    public Mono<Void> deleteReadMarksOf(String userId) {
        return mongo.remove(query(where("userId").is(userId)), ReadMark.class).then();
    }

    /** Deletes authored text and named system notes in every room, not just the current one. */
    public Mono<Void> deleteUserHistory(String userId) {
        Criteria authored = new Criteria()
                .orOperator(where("senderId").is(userId), where("actorId").is(userId));
        return mongo.find(query(authored), Message.class)
                .map(Message::roomId)
                .distinct()
                .collectList()
                // Keep the affected rooms until notification succeeds. A failed final step must
                // still invalidate caches on retry after the authored messages have already gone.
                .flatMap(roomIds -> mongo.upsert(
                                query(where("_id").is(userId)),
                                new Update().addToSet("roomIds").each(roomIds.toArray()),
                                HistoryDeletion.class)
                        .then(mongo.findById(userId, HistoryDeletion.class)))
                .flatMap(deletion -> mongo.remove(
                                query(new Criteria()
                                        .orOperator(
                                                where("senderId").is(userId),
                                                where("type")
                                                        .is(Message.Type.SYSTEM)
                                                        .and("actorId")
                                                        .is(userId))),
                                Message.class)
                        .then(mongo.updateMulti(
                                query(where("actorId").is(userId)), new Update().unset("actorId"), Message.class))
                        .then(access.forgetTalker(userId))
                        .then(access.invalidateHistory(deletion.roomIds(), userId))
                        .then());
    }

    /** A bounded copy for a report, kept separately before the conversation is deleted. */
    public Mono<List<Message>> reportEvidence(String roomId) {
        return mongo.find(
                        query(where("roomId").is(roomId).and("type").is(Message.Type.TEXT))
                                .with(Sort.by(Sort.Direction.DESC, "_id"))
                                .limit(50),
                        Message.class)
                .collectList()
                .map(List::reversed);
    }

    /**
     * A page of the user's room timeline, newest first. {@code before} pages back through history;
     * {@code after} fetches what was missed while disconnected (repeat while {@code hasMore}).
     */
    public Mono<MessagePage> history(User user, @Nullable String before, @Nullable String after, int limit) {
        String roomId = user.roomId();
        if (roomId == null) return Mono.error(new ApiException(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND"));
        if (limit < 1 || limit > MAX_PAGE_SIZE || (before != null && after != null)) return Mono.error(invalid());
        Criteria criteria = where("roomId").is(roomId);
        Sort sort = Sort.by(Sort.Direction.DESC, "_id");
        if (before != null) {
            criteria = criteria.and("_id").lt(objectId(before));
        } else if (after != null) {
            // Oldest missed messages first, so repeated calls walk forward without gaps.
            criteria = criteria.and("_id").gt(objectId(after));
            sort = Sort.by(Sort.Direction.ASC, "_id");
        }
        boolean forward = after != null;
        return access.requireMember(roomId, user.id())
                .then(mongo.find(query(criteria).with(sort).limit(limit + 1), Message.class)
                        .collectList()
                        .map(found -> {
                            boolean hasMore = found.size() > limit;
                            List<Message> page = hasMore ? found.subList(0, limit) : found;
                            return new MessagePage(forward ? page.reversed() : page, hasMore);
                        }));
    }

    /**
     * Records that the user has read their room up to {@code messageId}. Emits true when that moved
     * their read mark forward, false when it was already there or further (an older or repeated
     * read, or a race with another of their devices).
     */
    public Mono<Boolean> markRead(User user, String messageId) {
        String roomId = user.roomId();
        if (roomId == null) return Mono.error(new ApiException(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND"));
        if (messageId == null || !ObjectId.isValid(messageId)) return Mono.error(invalid());
        String id = ReadMark.key(roomId, user.id());
        return access.requireMember(roomId, user.id())
                .then(mongo.exists(
                                query(where("_id")
                                        .is(new ObjectId(messageId))
                                        .and("roomId")
                                        .is(roomId)),
                                Message.class)
                        .flatMap(exists -> {
                            if (!exists) return Mono.error(invalid());
                            // Only an older mark matches (ids compare in timeline order). With no match the
                            // upsert tries to insert the same _id and hits a duplicate key. That means the
                            // mark exists, but not that it is newer: concurrent first reads race to create it,
                            // and an older one may have won. So try once more against the existing mark.
                            Query older =
                                    query(where("_id").is(id).and("messageId").lt(messageId));
                            Update mark = new Update()
                                    .set("roomId", roomId)
                                    .set("userId", user.id())
                                    .set("messageId", messageId)
                                    .set("updatedAt", Instant.now(clock));
                            return mongo.upsert(older, mark, ReadMark.class)
                                    .thenReturn(true)
                                    .onErrorResume(
                                            DuplicateKeyException.class,
                                            e -> mongo.updateFirst(older, mark, ReadMark.class)
                                                    .map(result -> result.getModifiedCount() == 1));
                        }));
    }

    /** Each member's read mark in the room: user id → newest message id they have read. */
    public Mono<Map<String, String>> readMarks(String roomId) {
        return mongo.find(query(where("roomId").is(roomId)), ReadMark.class)
                .collectMap(ReadMark::userId, ReadMark::messageId);
    }

    private static ObjectId objectId(String cursor) {
        if (!ObjectId.isValid(cursor)) throw invalid();
        return new ObjectId(cursor);
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
    }
}
