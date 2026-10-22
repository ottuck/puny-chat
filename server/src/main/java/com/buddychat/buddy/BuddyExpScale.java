package com.buddychat.buddy;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.mongodb.reactivestreams.client.MongoCollection;
import org.bson.Document;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Keeps every buddy's level when the EXP curve changes (docs/PROJECT.md, 레벨). The level is computed from
 * EXP, so a steeper curve would drop existing buddies' levels. At startup, if the curve differs from the
 * one recorded last time, every buddy's EXP is carried over: the same level, and as far into it. The first
 * start only records the curve. It runs once the beans are ready and before the web server opens (a runner
 * would come after), so no message changes a buddy halfway and no level is computed from EXP not carried
 * yet; a buddy that changed anyway (another server still running) is read again. Blocking is fine here.
 */
@Component
class BuddyExpScale implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(BuddyExpScale.class);
    static final String SETTINGS = "settings";
    static final String ID = "buddy";
    static final String ROOMS = "rooms";

    // `expPerLevelAfterJob` is missing from the setting of a single EXP per level, from before the curve.
    record Setting(@Id String id, int expPerLevel, @Nullable Integer expPerLevelAfterJob) {

        static Setting of(ExpCurve curve) {
            return new Setting(ID, curve.early(), curve.late());
        }

        ExpCurve curve() {
            return new ExpCurve(expPerLevel, expPerLevelAfterJob == null ? expPerLevel : expPerLevelAfterJob);
        }
    }

    private final ReactiveMongoTemplate mongo;

    BuddyExpScale(ReactiveMongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public void afterSingletonsInstantiated() {
        carryOver();
    }

    void carryOver() {
        ExpCurve curve = BuddyRules.CURVE;
        Setting recorded = mongo.findById(ID, Setting.class, SETTINGS).block();
        if (recorded == null) {
            mongo.save(Setting.of(curve), SETTINGS).block();
            return;
        }
        ExpCurve previous = recorded.curve();
        if (previous.equals(curve)) return;
        // Record the new curve first: if carrying then fails, levels are lower but never carried
        // twice. Of two servers starting at once, one does it.
        Setting claimed = mongo.findAndModify(
                        query(where("_id")
                                .is(ID)
                                .and("expPerLevel")
                                .is(recorded.expPerLevel())
                                .and("expPerLevelAfterJob")
                                .is(recorded.expPerLevelAfterJob())),
                        new Update().set("expPerLevel", curve.early()).set("expPerLevelAfterJob", curve.late()),
                        Setting.class,
                        SETTINGS)
                .block();
        if (claimed == null) return;
        Long carried = mongo.getCollection(ROOMS)
                .flatMapMany(rooms -> Flux.from(rooms.find(new Document("buddy.exp", new Document("$gt", 0)))
                                .projection(new Document("buddy.exp", 1)))
                        .concatMap(room -> carry(rooms, room.get("_id"), expOf(room), previous, curve)))
                .filter(Boolean::booleanValue)
                .count()
                .block();
        log.info("EXP curve {} -> {}: carried the EXP of {} buddies", previous.key(), curve.key(), carried);
    }

    /**
     * Carries one room's buddy from {@code seen}, the EXP read for it, if it is still that. If it changed since
     * (a message), it is read again and carried from what it is now. False if the room is gone.
     */
    static Mono<Boolean> carry(MongoCollection<Document> rooms, Object id, int seen, ExpCurve from, ExpCurve to) {
        return Mono.from(rooms.updateOne(
                        new Document("_id", id).append("buddy.exp", seen),
                        new Document("$set", new Document("buddy.exp", from.carry(seen, to)))))
                .flatMap(result -> result.getMatchedCount() > 0
                        ? Mono.just(true)
                        : Mono.from(rooms.find(new Document("_id", id))
                                        .projection(new Document("buddy.exp", 1))
                                        .first())
                                .flatMap(room -> carry(rooms, id, expOf(room), from, to))
                                .defaultIfEmpty(false));
    }

    private static int expOf(Document room) {
        return room.get("buddy", Document.class).get("exp", Number.class).intValue();
    }
}
