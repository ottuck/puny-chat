package com.buddychat.stats;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.common.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.bson.Document;
import org.jspecify.annotations.Nullable;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Usage counts for the operator (docs/PROJECT.md, 이용 통계): how far new devices get through the
 * start, and how many users come back on the days after they joined. Only daily totals are kept,
 * never who did what. Days are Japan's (and Korea's: the same time zone).
 *
 * <p>One document per day and kind in {@code stats}: {@code steps:2026-10-19} holds
 * {@code {ios: {welcome: 3, ...}, web: {...}}}, and {@code joined:2026-10-19} holds how many users
 * joined that day ({@code joined}) and how many of them came back N days later ({@code d1}, ...).
 */
@Service
public class StatsService {

    public static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    /** The start in order: first screen, the tour, its start button, the name, the buddy woken. */
    static final List<String> STEPS = List.of("welcome", "demo", "start", "name", "wake");

    static final List<String> PLATFORMS = List.of("ios", "web", "android");

    // Coming back is counted up to this many days after joining.
    static final int MAX_DAY = 60;

    static final String COLLECTION = "stats";

    private final ReactiveMongoTemplate mongo;

    StatsService(ReactiveMongoTemplate mongo) {
        this.mongo = mongo;
    }

    public static LocalDate day(Instant at) {
        return LocalDate.ofInstant(at, ZONE);
    }

    /** The first moment of {@code at}'s day. */
    public static Instant startOfDay(Instant at) {
        return day(at).atStartOfDay(ZONE).toInstant();
    }

    /** A device reached a step of the start for the first time (the app sends each step once). */
    public Mono<Void> step(@Nullable String step, @Nullable String platform, Instant now) {
        if (step == null || platform == null || !STEPS.contains(step) || !PLATFORMS.contains(platform)) {
            return Mono.error(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST"));
        }
        return add("steps:" + day(now), platform + "." + step);
    }

    /** A user was created. */
    public Mono<Void> joined(Instant createdAt) {
        return add("joined:" + day(createdAt), "joined");
    }

    /** A user who joined at {@code createdAt} is here for the first time on {@code now}'s day. */
    public Mono<Void> cameBack(Instant createdAt, Instant now) {
        long days = ChronoUnit.DAYS.between(day(createdAt), day(now));
        if (days < 1 || days > MAX_DAY) return Mono.empty();
        return add("joined:" + day(createdAt), "d" + days);
    }

    private Mono<Void> add(String id, String field) {
        return mongo.upsert(query(where("_id").is(id)), new Update().inc(field, 1), COLLECTION)
                .then();
    }

    Flux<Document> find(Collection<String> ids) {
        return mongo.find(query(where("_id").in(ids)), Document.class, COLLECTION);
    }

    static Set<String> stepIds(LocalDate from, LocalDate until) {
        return ids("steps:", from, until);
    }

    static Set<String> joinedIds(LocalDate from, LocalDate until) {
        return ids("joined:", from, until);
    }

    // Days from {@code from} up to, not including, {@code until}.
    private static Set<String> ids(String prefix, LocalDate from, LocalDate until) {
        return from.datesUntil(until).map(date -> prefix + date).collect(Collectors.toSet());
    }
}
