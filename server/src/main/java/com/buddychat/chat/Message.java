package com.buddychat.chat;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A timeline entry. {@code clientMessageId} is always set (server-generated for events the server
 * creates), so {@code roomId + senderId + clientMessageId} can be a plain unique index.
 *
 * @param systemEvent for SYSTEM entries, what happened (e.g. MEMBER_LEFT); {@code text} then holds the
 *     actor's name at the time, since they may no longer be a member. Null on entries stored before.
 * @param text for TEXT, the message; for SYSTEM, the actor's name; for the buddy event LEVELED_UP, the
 *     new level (e.g. "3"); otherwise null.
 * @param reactions on TEXT and PHOTO, each member's reaction (user id → one of {@link #REACTIONS}). Null on
 *     entries nobody has reacted to.
 * @param photo for PHOTO, the stored file (docs/PROJECT.md, 사진); otherwise null.
 */
@Document("messages")
public record Message(
        @Id @Nullable String id,
        String roomId,
        @Nullable String senderId,
        Type type,
        @Nullable String text,
        @Nullable String buddyEvent,
        @Nullable String systemEvent,
        @Nullable String actorId,
        String clientMessageId,
        Instant createdAt,
        @Nullable Map<String, String> reactions,
        @Nullable Photo photo) {

    public static final int MAX_TEXT_LENGTH = 2000;

    /** 👍, 😢, 😮. A member has at most one reaction on a message. */
    public static final Set<String> REACTIONS = Set.of("LIKE", "SAD", "WOW");

    public enum Type {
        TEXT,
        PHOTO,
        SYSTEM,
        BUDDY_EVENT
    }

    /** A WebP file at {@code <photos>/<roomId>/<id>.webp}, {@code width} × {@code height} pixels. */
    public record Photo(String id, int width, int height) {}

    /** {@code key} makes the event idempotent: recording the same key twice stores it once. */
    static Message buddyEvent(
            String roomId, String event, @Nullable String detail, @Nullable String actorId, String key, Instant now) {
        return new Message(null, roomId, null, Type.BUDDY_EVENT, detail, event, null, actorId, key, now, null, null);
    }

    static Message system(
            String roomId, String event, String actorId, @Nullable String actorName, String key, Instant now) {
        return new Message(null, roomId, null, Type.SYSTEM, actorName, null, event, actorId, key, now, null, null);
    }

    static Message text(String roomId, String senderId, String clientMessageId, String text, Instant now) {
        return new Message(null, roomId, senderId, Type.TEXT, text, null, null, null, clientMessageId, now, null, null);
    }

    static Message photo(String roomId, String senderId, String clientMessageId, Photo photo, Instant now) {
        return new Message(
                null, roomId, senderId, Type.PHOTO, null, null, null, null, clientMessageId, now, null, photo);
    }

    Message withoutActor() {
        return new Message(
                id,
                roomId,
                senderId,
                type,
                text,
                buddyEvent,
                systemEvent,
                null,
                clientMessageId,
                createdAt,
                reactions,
                photo);
    }
}
