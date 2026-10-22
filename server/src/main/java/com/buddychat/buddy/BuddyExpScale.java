package com.buddychat.buddy;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.mongodb.client.result.UpdateResult;
import org.bson.Document;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
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
 * start only records the curve. Blocking is fine here: it runs once before the app serves traffic.
 */
@Component
class BuddyExpScale implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BuddyExpScale.class);
    static final String SETTINGS = "settings";
    static final String ID = "buddy";

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
    public void run(ApplicationArguments args) {
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
        Long carried = mongo.getCollection("rooms")
                .flatMapMany(rooms -> Flux.from(rooms.find(new Document("buddy.exp", new Document("$gt", 0)))
                                .projection(new Document("buddy.exp", 1)))
                        .concatMap(room -> {
                            int exp = room.get("buddy", Document.class)
                                    .get("exp", Number.class)
                                    .intValue();
                            // Only if it is still what was read: nothing else writes before traffic.
                            return Mono.from(rooms.updateOne(
                                    new Document("_id", room.get("_id")).append("buddy.exp", exp),
                                    new Document("$set", new Document("buddy.exp", previous.carry(exp, curve)))));
                        }))
                .map(UpdateResult::getModifiedCount)
                .reduce(0L, Long::sum)
                .block();
        log.info("EXP curve {} -> {}: carried the EXP of {} buddies", previous.key(), curve.key(), carried);
    }
}
