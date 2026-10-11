package com.buddychat.support;

import com.buddychat.chat.Message;
import com.buddychat.room.Room;
import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Private operator records; no API exposes the evidence or other users' tickets. */
@Document("supportTickets")
public record SupportTicket(
        @Id String id,
        Kind kind,
        String reporterId,
        @Nullable String reporterName,
        @Nullable String replyEmail,
        @Nullable Reason reason,
        String description,
        @Nullable String roomId,
        @Nullable Room roomSnapshot,
        @Nullable String targetId,
        @Nullable String targetName,
        @Nullable String nextRoomId,
        List<Message> evidence,
        Instant createdAt,
        Instant expiresAt,
        @Nullable Instant completedAt,
        boolean closureConfirmed,
        String emailStatus,
        int emailAttempts,
        Instant nextEmailAttemptAt) {

    public enum Kind {
        INQUIRY,
        REPORT,
        REMOVE
    }

    public enum Reason {
        HARASSMENT,
        SEXUAL,
        THREATS,
        SPAM,
        OTHER
    }
}
