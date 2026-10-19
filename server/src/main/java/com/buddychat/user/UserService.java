package com.buddychat.user;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.common.ApiException;
import com.buddychat.stats.StatsService;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class UserService {

    static final int MAX_GUIDE_VERSION = 1000;

    private final UserRepository users;
    private final ReactiveMongoTemplate mongo;
    private final StatsService stats;
    private final Clock clock;

    UserService(UserRepository users, ReactiveMongoTemplate mongo, StatsService stats, Clock clock) {
        this.users = users;
        this.mongo = mongo;
        this.stats = stats;
        this.clock = clock;
    }

    /**
     * The signed-in user, identified only by the token's subject (Firebase uid). Also notes whether
     * they are a guest and that they were here today, for the weekly clean-up of guests Firebase has
     * deleted (account/GuestCleanup) and the count of users coming back (stats/StatsService).
     */
    public Mono<User> current(Jwt jwt) {
        boolean guest = isGuest(jwt);
        // "name" is present for Google/Apple sign-in and absent for anonymous users.
        return getOrCreate(jwt.getSubject(), jwt.getClaimAsString("name"), guest)
                .flatMap(user -> noteSeen(user, guest));
    }

    /**
     * A guest signed in anonymously and has linked no account. Linking Google keeps the uid and the
     * sign-in method but adds an identity, so it counts as a guest no more.
     */
    static boolean isGuest(Jwt jwt) {
        Map<String, Object> firebase = jwt.getClaimAsMap("firebase");
        if (firebase == null || !"anonymous".equals(firebase.get("sign_in_provider"))) return false;
        return !(firebase.get("identities") instanceof Map<?, ?> identities) || identities.isEmpty();
    }

    // At most one write a day (Japan's day) per user, or right away when they stop being a guest.
    // The first request of a day also counts the user as back (stats/StatsService).
    private Mono<User> noteSeen(User user, boolean guest) {
        Instant now = Instant.now(clock);
        Instant today = StatsService.startOfDay(now);
        Instant seen = user.lastSeenAt();
        boolean newDay = seen == null || seen.isBefore(today);
        boolean becameLinked = !guest && !Boolean.FALSE.equals(user.guest());
        if (!becameLinked && !newDay) return Mono.just(user);
        Query which = query(where("_id").is(user.id()));
        // Only one of two requests racing into a new day writes it, so a day is counted once.
        if (!becameLinked) {
            which.addCriteria(new Criteria()
                    .orOperator(
                            where("lastSeenAt").isNull(), where("lastSeenAt").lt(today)));
        }
        Update note = new Update().set("lastSeenAt", now);
        // A token from before linking stays valid for an hour and may arrive from another device.
        // Only creation sets guest=true; later requests may only clear it. Not writing true here
        // also protects against a stale request racing with the request that recorded the link.
        if (!guest) note.set("guest", false);
        return mongo.findAndModify(which, note, FindAndModifyOptions.options().returnNew(true), User.class)
                .flatMap(updated ->
                        newDay ? stats.cameBack(updated.createdAt(), now).thenReturn(updated) : Mono.just(updated))
                .defaultIfEmpty(user);
    }

    /**
     * Returns the user for a Firebase uid, creating it on first sign-in. Two concurrent first
     * requests may both try to insert; the unique index lets one win and the other re-reads it.
     */
    public Mono<User> getOrCreate(String firebaseUid, @Nullable String displayName) {
        return getOrCreate(firebaseUid, displayName, false);
    }

    private Mono<User> getOrCreate(String firebaseUid, @Nullable String displayName, boolean guest) {
        return users.findByFirebaseUid(firebaseUid)
                .switchIfEmpty(Mono.defer(() -> users.save(
                                User.create(firebaseUid, displayName, guest, Instant.now(clock)))
                        .flatMap(created -> stats.joined(created.createdAt()).thenReturn(created))))
                .onErrorResume(DuplicateKeyException.class, e -> users.findByFirebaseUid(firebaseUid));
    }

    /** Guests created before {@code createdBefore} and not seen since {@code seenBefore}. */
    public Flux<User> findIdleGuests(Instant createdBefore, Instant seenBefore) {
        return mongo.find(
                query(where("guest")
                        .is(true)
                        .and("createdAt")
                        .lt(createdBefore)
                        .and("lastSeenAt")
                        .lt(seenBefore)),
                User.class);
    }

    /** Guests created in this window, oldest first (the days-left pushes). */
    public Flux<User> findGuestsCreatedBetween(Instant after, Instant before) {
        return mongo.find(
                query(where("guest").is(true).and("createdAt").gt(after).lte(before))
                        .with(Sort.by("createdAt")),
                User.class);
    }

    /**
     * Notes that the push for {@code days} left goes out now; false if it (or a later one) already
     * went. Only one of two overlapping runs sends it.
     */
    public Mono<Boolean> claimGuestNotice(String userId, int days) {
        return mongo.updateFirst(
                        query(where("_id")
                                .is(userId)
                                .orOperator(
                                        where("guestNoticeDays").isNull(),
                                        where("guestNoticeDays").gt(days))),
                        Update.update("guestNoticeDays", days),
                        User.class)
                .map(result -> result.getModifiedCount() == 1);
    }

    public Flux<User> findAllById(Collection<String> ids) {
        return users.findAllById(ids);
    }

    /**
     * Sets the user's room only if they have none yet. Returns false if another request got
     * there first, so a user never ends up owning two rooms.
     */
    public Mono<Boolean> assignRoomIfNone(String userId, String roomId) {
        return mongo.updateFirst(
                        query(where("_id")
                                .is(userId)
                                .and("roomId")
                                .is(null)
                                .and("roomJoinId")
                                .is(null)),
                        Update.update("roomId", roomId),
                        User.class)
                .map(result -> result.getModifiedCount() == 1);
    }

    /**
     * Sets the name others see. Guests (anonymous sign-in) start without one; signing in with
     * Google only fills it in on the first request, so a name chosen here stays.
     */
    public Mono<User> rename(User user, @Nullable String rawName) {
        String name = rawName == null ? "" : rawName.strip();
        if (name.isEmpty() || name.codePointCount(0, name.length()) > User.MAX_NAME_LENGTH) {
            return Mono.error(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST"));
        }
        return mongo.findAndModify(
                query(where("_id").is(user.id())),
                Update.update("displayName", name),
                FindAndModifyOptions.options().returnNew(true),
                User.class);
    }

    /**
     * Notes that the user has opened the guide card of {@code version}. Only ever raises the
     * value, so a late request from another device cannot bring the card back.
     */
    public Mono<User> markGuideSeen(User user, int version) {
        if (version < 1 || version > MAX_GUIDE_VERSION) {
            return Mono.error(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST"));
        }
        return mongo.findAndModify(
                query(where("_id").is(user.id())),
                new Update().max("guideSeenVersion", version),
                FindAndModifyOptions.options().returnNew(true),
                User.class);
    }

    /** Clears the user's room, only if it is still that room (leaving twice is harmless). */
    public Mono<Void> leaveRoom(String userId, String roomId) {
        return mongo.updateFirst(
                        query(where("_id").is(userId).and("roomId").is(roomId)),
                        new Update().unset("roomId"),
                        User.class)
                .then();
    }

    /** Moves only the old room pointer; never reattaches an account that left or was deleted. */
    public Mono<Boolean> replaceRoom(String userId, String oldRoomId, String newRoomId) {
        return mongo.updateFirst(
                        query(where("_id").is(userId).and("roomId").is(oldRoomId)),
                        new Update().set("roomId", newRoomId).unset("roomJoinId"),
                        User.class)
                .map(result -> result.getMatchedCount() == 1)
                .flatMap(moved -> moved ? Mono.just(true) : isInRoom(userId, newRoomId));
    }

    public Mono<Void> releaseJoins(Collection<String> invitationIds) {
        if (invitationIds.isEmpty()) return Mono.empty();
        return mongo.updateMulti(
                        query(where("roomJoinId").in(invitationIds)), new Update().unset("roomJoinId"), User.class)
                .then();
    }

    /** Removes the user (account deletion). Removing twice is harmless. */
    public Mono<Void> delete(String userId) {
        return mongo.remove(query(where("_id").is(userId)), User.class).then();
    }

    public Mono<Boolean> exists(String userId) {
        return users.existsById(userId);
    }

    /** Reserves one invitation per user, without exposing the target room before joining it. */
    public Mono<Boolean> reserveRoomJoin(String userId, @Nullable String expectedRoomId, String invitationId) {
        return mongo.updateFirst(
                        query(where("_id")
                                .is(userId)
                                .and("roomId")
                                .is(expectedRoomId)
                                .orOperator(
                                        where("roomJoinId").is(null),
                                        where("roomJoinId").is(invitationId))),
                        Update.update("roomJoinId", invitationId),
                        User.class)
                .map(result -> result.getMatchedCount() == 1);
    }

    /** Finishes only the reserved join against the room observed before it started. */
    public Mono<Boolean> finishRoomJoin(
            String userId, @Nullable String expectedRoomId, String roomId, String invitationId) {
        return mongo.updateFirst(
                        query(where("_id")
                                .is(userId)
                                .and("roomId")
                                .is(expectedRoomId)
                                .and("roomJoinId")
                                .is(invitationId)),
                        new Update().set("roomId", roomId).unset("roomJoinId"),
                        User.class)
                .map(result -> result.getMatchedCount() == 1);
    }

    public Mono<Void> releaseRoomJoin(String userId, String invitationId) {
        return mongo.updateFirst(
                        query(where("_id").is(userId).and("roomJoinId").is(invitationId)),
                        new Update().unset("roomJoinId"),
                        User.class)
                .then();
    }

    public Mono<Boolean> isInRoom(String userId, String roomId) {
        return mongo.exists(query(where("_id").is(userId).and("roomId").is(roomId)), User.class);
    }
}
