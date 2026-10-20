package com.buddychat.buddy;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * Buddy state, embedded in its room (docs/PROJECT.md). Only timestamps are stored; hunger
 * and poop are computed from them when read ({@link BuddyRules}), so no scheduler is needed.
 *
 * @param lastFedAt null on rooms created before care existed; treated as {@code bornAt}
 * @param lastCleanedAt when the floor was last clean; poops since then are counted from it. Null on
 *     rooms created before care existed; treated as {@code bornAt}
 * @param poopsCleaned poops tapped away one by one since {@code lastCleanedAt}; null means none
 * @param expDay the day (Asia/Tokyo) {@code messageExpToday} counts for
 * @param messageExpToday null on rooms created before the daily cap existed
 * @param talkDay the day (Asia/Tokyo) {@code talkers} counts for; null until the first message
 * @param talkers members who sent a message on {@code talkDay}
 * @param togetherDay the last day both members talked (and the buddy got the bonus for it)
 * @param fedCount meals given, and the next three: poops cleaned up, messages written at night, and
 *     with a "love you" in them. What the job is made of ({@link BuddyJob}). Null on buddies from
 *     before they were counted, which counts as none
 * @param job settled at {@link BuddyRules#JOB_AT}; null before that, and on adults from before jobs
 *     existed (who may pick one). The members may change it once in each of 20–29, 30–39, 40–49 and
 *     50–59, freely from the top
 * @param jobChangedLevel the level the members last changed the job at; null if never. The settled
 *     job, and a first pick, do not count
 * @param lastWorkedAt when a grown-up last earned EXP for work at its station; null if never
 * @param lastBathedAt when it last earned EXP for a trip to the hot spring; null if never
 * @param giftDays member id → the day (Asia/Tokyo) of the buddy's last job event for that member
 * @param gifts what it made, oldest first, the last {@link BuddyRules#GIFTS_KEPT}; null if none yet
 */
public record Buddy(
        String name,
        int exp,
        Instant bornAt,
        @Nullable Instant lastFedAt,
        @Nullable Instant lastCleanedAt,
        @Nullable String expDay,
        @Nullable Integer messageExpToday,
        @Nullable Integer poopsCleaned,
        @Nullable String talkDay,
        @Nullable List<String> talkers,
        @Nullable String togetherDay,
        @Nullable Integer fedCount,
        @Nullable Integer cleanedCount,
        @Nullable Integer nightCount,
        @Nullable Integer loveCount,
        @Nullable String job,
        @Nullable Integer jobChangedLevel,
        @Nullable Instant lastWorkedAt,
        @Nullable Instant lastBathedAt,
        @Nullable Map<String, String> giftDays,
        @Nullable List<Gift> gifts) {

    public static final int MAX_NAME_LENGTH = 12;

    public static Buddy hatch(String name, Instant now) {
        return new Buddy(
                name, 0, now, now, now, null, 0, 0, null, null, null, 0, 0, 0, 0, null, null, null, null, null, null);
    }

    Instant fedAt() {
        return lastFedAt != null ? lastFedAt : bornAt;
    }

    Instant cleanedAt() {
        return lastCleanedAt != null ? lastCleanedAt : bornAt;
    }

    int cleaned() {
        return poopsCleaned != null ? poopsCleaned : 0;
    }

    int fed() {
        return fedCount != null ? fedCount : 0;
    }

    int cleanedUp() {
        return cleanedCount != null ? cleanedCount : 0;
    }

    int nights() {
        return nightCount != null ? nightCount : 0;
    }

    int loves() {
        return loveCount != null ? loveCount : 0;
    }

    /** The egg that takes this grown buddy's place. Today's talk carries over: one bonus a day. */
    Buddy next(String name, Instant now) {
        return new Buddy(
                name,
                0,
                now,
                now,
                now,
                null,
                0,
                0,
                talkDay,
                talkers,
                togetherDay,
                0,
                0,
                0,
                0,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    List<Gift> made() {
        return gifts != null ? gifts : List.of();
    }

    /** Members who sent a message on that day. */
    List<String> talkedOn(String day) {
        return day.equals(talkDay) && talkers != null ? talkers : List.of();
    }
}
