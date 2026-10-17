package com.buddychat.room;

import java.time.Instant;
import org.jspecify.annotations.Nullable;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A single-use invite code for a room.
 *
 * @param replacesId set on a code made in a full room: for the other member, who comes back from
 *     somewhere else (another app, browser or phone). Whoever accepts it takes that member's seat
 *     and history (docs/PROJECT.md, Room·초대 규칙). Null on ordinary codes and on codes from before.
 */
@Document("invitations")
public record Invitation(
        @Id @Nullable String id,
        String roomId,
        String code,
        String createdBy,
        Instant createdAt,
        Instant expiresAt,
        @Nullable Instant usedAt,
        @Nullable String usedBy,
        @Nullable String previousRoomId,
        @Nullable String replacesId) {}
