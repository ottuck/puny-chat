package com.buddychat.buddy;

import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * Buddy state, embedded in its room (docs/server-design.md). Only timestamps are stored; hunger
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
 * @param fedCount meals given, and the next four: poops cleaned up, messages written at night, with a
 *     laugh, and with a "love you" in them. What the job is made of ({@link BuddyJob}); null on
 *     buddies from before they were counted, which counts as none
 * @param job decided when the buddy becomes an adult; null before that, and on adults from before
 *     jobs existed. An adult's members may change it, once a day
 * @param jobChangedDay the last day (Asia/Tokyo) the members changed the job; null if never. The
 *     first, automatic job does not count
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
        @Nullable Integer laughCount,
        @Nullable Integer loveCount,
        @Nullable String job,
        @Nullable String jobChangedDay) {

    public static final int MAX_NAME_LENGTH = 12;

    public static Buddy hatch(String name, Instant now) {
        return new Buddy(name, 0, now, now, now, null, 0, 0, null, null, null, 0, 0, 0, 0, 0, null, null);
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

    int laughs() {
        return laughCount != null ? laughCount : 0;
    }

    int loves() {
        return loveCount != null ? loveCount : 0;
    }

    /** The egg that takes this grown buddy's place. Today's talk carries over: one bonus a day. */
    Buddy next(String name, Instant now) {
        return new Buddy(name, 0, now, now, now, null, 0, 0, talkDay, talkers, togetherDay, 0, 0, 0, 0, 0, null, null);
    }

    /** Members who sent a message on that day. */
    List<String> talkedOn(String day) {
        return day.equals(talkDay) && talkers != null ? talkers : List.of();
    }
}
