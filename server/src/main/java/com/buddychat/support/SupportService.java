package com.buddychat.support;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.chat.ChatService;
import com.buddychat.common.ApiException;
import com.buddychat.room.RoomService;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.bson.types.ObjectId;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class SupportService {
    public static final Duration RETENTION = Duration.ofDays(90);
    private static final Logger log = LoggerFactory.getLogger(SupportService.class);
    private final ReactiveMongoTemplate mongo;
    private final RoomService rooms;
    private final UserService users;
    private final ChatService chat;
    private final Clock clock;

    SupportService(ReactiveMongoTemplate mongo, RoomService rooms, UserService users, ChatService chat, Clock clock) {
        this.mongo = mongo;
        this.rooms = rooms;
        this.users = users;
        this.chat = chat;
        this.clock = clock;
    }

    public record Receipt(String id) {}

    Mono<Receipt> inquire(User user, String id, String description, @Nullable String replyEmail) {
        return existing(user, id)
                .switchIfEmpty(Mono.defer(() -> checkLimit(user).then(Mono.defer(() -> {
                    Instant now = Instant.now(clock);
                    return insert(new SupportTicket(
                            id,
                            SupportTicket.Kind.INQUIRY,
                            user.id(),
                            user.displayName(),
                            replyEmail,
                            null,
                            description.strip(),
                            null,
                            null,
                            null,
                            null,
                            null,
                            List.of(),
                            now,
                            now.plus(RETENTION),
                            now,
                            false,
                            "PENDING",
                            0,
                            now));
                }))))
                .flatMap(ticket -> {
                    if (ticket.kind() != SupportTicket.Kind.INQUIRY
                            || !ticket.description().equals(description.strip())) return Mono.error(conflict());
                    return Mono.just(new Receipt(ticket.id()));
                });
    }

    Mono<Receipt> remove(
            User user,
            String id,
            String roomId,
            String targetId,
            boolean report,
            SupportTicket.@Nullable Reason reason,
            String description,
            @Nullable String replyEmail) {
        if (report && reason == null) return Mono.error(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST"));
        var kind = report ? SupportTicket.Kind.REPORT : SupportTicket.Kind.REMOVE;
        return existing(user, id)
                .switchIfEmpty(Mono.defer(() -> rooms.removalSnapshot(user, roomId, targetId)
                        .flatMap(room -> users.findAllById(List.of(targetId))
                                .next()
                                .flatMap(target -> (report
                                                ? chat.reportEvidence(room.id())
                                                : Mono.just(List.<com.buddychat.chat.Message>of()))
                                        .flatMap(evidence -> {
                                            Instant now = Instant.now(clock);
                                            return insert(new SupportTicket(
                                                    id,
                                                    kind,
                                                    user.id(),
                                                    user.displayName(),
                                                    replyEmail,
                                                    reason,
                                                    description.strip(),
                                                    room.id(),
                                                    room,
                                                    targetId,
                                                    target.displayName(),
                                                    new ObjectId().toHexString(),
                                                    evidence,
                                                    now,
                                                    now.plus(RETENTION),
                                                    null,
                                                    false,
                                                    report ? "PENDING" : "NONE",
                                                    0,
                                                    now));
                                        })))))
                .flatMap(ticket -> {
                    if (ticket.kind() != kind || !targetId.equals(ticket.targetId()) || !roomId.equals(ticket.roomId()))
                        return Mono.error(conflict());
                    return complete(ticket).map(done -> new Receipt(done.id()));
                });
    }

    private Mono<SupportTicket> existing(User user, String id) {
        return mongo.findById(id, SupportTicket.class)
                .flatMap(ticket -> ticket.reporterId().equals(user.id()) ? Mono.just(ticket) : Mono.error(conflict()));
    }

    // Bounds accidental repeats and authenticated mail abuse. Retries with the same id do not count.
    private Mono<Void> checkLimit(User user) {
        return mongo.count(
                        query(where("reporterId")
                                .is(user.id())
                                .and("createdAt")
                                .gte(Instant.now(clock).minus(Duration.ofHours(1)))),
                        SupportTicket.class)
                .flatMap(count -> count < 5
                        ? Mono.empty()
                        : Mono.error(new ApiException(HttpStatus.TOO_MANY_REQUESTS, "SUPPORT_RATE_LIMIT")));
    }

    private Mono<SupportTicket> insert(SupportTicket ticket) {
        return mongo.insert(ticket)
                .onErrorResume(
                        DuplicateKeyException.class,
                        e -> mongo.findById(ticket.id(), SupportTicket.class)
                                .flatMap(existing -> existing.reporterId().equals(ticket.reporterId())
                                        ? Mono.just(existing)
                                        : Mono.error(conflict())));
    }

    private Mono<SupportTicket> complete(SupportTicket ticket) {
        if (ticket.completedAt() != null) return Mono.just(ticket);
        Mono<SupportTicket> claimed = ticket.closureConfirmed()
                ? Mono.just(ticket)
                : rooms.claimRemoval(ticket.id(), ticket.roomSnapshot(), ticket.reporterId())
                        .flatMap(snapshot -> mongo.findAndModify(
                                query(where("_id").is(ticket.id())),
                                new Update().set("closureConfirmed", true).set("roomSnapshot", snapshot),
                                FindAndModifyOptions.options().returnNew(true),
                                SupportTicket.class));
        return claimed.flatMap(ready -> rooms.removePartner(
                        ready.id(), ready.roomSnapshot(), ready.reporterId(), ready.targetId(), ready.nextRoomId()))
                .then(mongo.findAndModify(
                        query(where("_id").is(ticket.id())),
                        new Update().set("completedAt", Instant.now(clock)).unset("roomSnapshot"),
                        FindAndModifyOptions.options().returnNew(true),
                        SupportTicket.class));
    }

    // A server restart or lost HTTP response must not leave a half-finished removal forever.
    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    void resumeRemovals() {
        resume().subscribe(count -> {}, e -> log.warn("Pending conversation cleanup will retry", e));
    }

    Mono<Long> resume() {
        return mongo.find(
                        query(where("completedAt")
                                        .is(null)
                                        .and("roomSnapshot")
                                        .ne(null)
                                        .and("createdAt")
                                        .lt(Instant.now(clock).minusSeconds(30)))
                                .limit(20),
                        SupportTicket.class)
                .concatMap(ticket -> complete(ticket)
                        .onErrorResume(
                                ApiException.class,
                                e -> mongo.findAndModify(
                                        query(where("_id").is(ticket.id())),
                                        new Update()
                                                .set("completedAt", Instant.now(clock))
                                                .set("emailStatus", "NONE")
                                                .unset("roomSnapshot")
                                                .set("evidence", List.of()),
                                        FindAndModifyOptions.options().returnNew(true),
                                        SupportTicket.class)))
                .count();
    }

    private static ApiException conflict() {
        return new ApiException(HttpStatus.CONFLICT, "PARTNER_CHANGED");
    }
}
