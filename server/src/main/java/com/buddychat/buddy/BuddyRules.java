package com.buddychat.buddy;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.IntStream;
import org.jspecify.annotations.Nullable;

/**
 * Growth and care rules, with the initial launch values (docs/PROJECT.md, Buddy 규칙). The buddy
 * never dies: neglect only makes it hungry and dirty (docs/PROJECT.md).
 */
public final class BuddyRules {

    // Quick up to the job, then a level or two a day (docs/PROJECT.md, 성장). A change here keeps every
    // buddy's level (BuddyExpScale).
    public static final ExpCurve CURVE = new ExpCurve(10, 20);
    public static final int FEED_EXP = 2;
    public static final int CLEAN_EXP = 2;
    // A grown-up's work at its station: EXP for it once in this long (docs/PROJECT.md, 직업 무대 장치).
    public static final int WORK_EXP = 2;
    public static final Duration WORK_EVERY = Duration.ofHours(1);
    // What it does at work for each member, once in this many days per member (docs/fun-improvements.md,
    // 직업 이벤트), and how many it keeps for the mailbox.
    public static final int GIFT_EVERY_DAYS = 3;
    public static final int GIFTS_KEPT = 30;
    static final int GIFT_PICKS = 1000;
    // A trip to the hot spring after a while away from it: EXP once in this long (docs/fun-improvements.md, 목욕).
    public static final int BATH_EXP = 3;
    public static final Duration BATH_EVERY = Duration.ofHours(12);
    public static final int MESSAGE_EXP = 1;
    // A day's message EXP per room once it has its job: from there it grows by being cared for, and
    // "ㅎ ㅎ ㅎ" does not level it. Before, talking gets it there as fast as the two talk.
    public static final int MESSAGE_EXP_DAILY_CAP = 20;
    // Once a day, when both members have sent a message that day (docs/PROJECT.md, 둘이 함께).
    public static final int TOGETHER_EXP = 10;

    // Fullness drops from 100 to 0 over this long after a meal (2.5 h: feedable again after 30
    // minutes, hungry after 1 h 45 min). Set from BuddyProperties.
    private static volatile Duration fullToEmpty = Duration.ofMinutes(150);
    static final int FEEDABLE_BELOW = 80;
    static final int HUNGRY_AT = 30;
    // One poop per this long since the last clean, up to MAX_POOPS. Set from BuddyProperties.
    private static volatile Duration poopEvery = Duration.ofHours(1);
    static final int MAX_POOPS = 3;
    // "Today" for the daily EXP cap; the app is for users in Japan first.
    static final ZoneId DAY_ZONE = ZoneId.of("Asia/Tokyo");

    public enum Stage {
        EGG,
        BABY,
        CHILD,
        ADULT
    }

    private BuddyRules() {}

    static void useTiming(Duration fullToEmptyValue, Duration poopEveryValue) {
        if (fullToEmptyValue.isNegative()
                || fullToEmptyValue.isZero()
                || poopEveryValue.isNegative()
                || poopEveryValue.isZero()) {
            throw new IllegalArgumentException("Buddy durations must be positive");
        }
        fullToEmpty = fullToEmptyValue;
        poopEvery = poopEveryValue;
    }

    /** How long after a meal the buddy is hungry. */
    public static Duration hungryAfter() {
        return fullToEmpty.multipliedBy(100 - HUNGRY_AT).dividedBy(100);
    }

    public static Duration poopEvery() {
        return poopEvery;
    }

    // The highest level (docs/PROJECT.md, 최고 레벨). EXP keeps counting past it.
    public static final int MAX_LEVEL = 60;

    public static int level(int exp) {
        return CURVE.level(exp);
    }

    /** The EXP a level starts at. */
    static int minExp(int level) {
        return CURVE.minExp(level);
    }

    /** How far into the current level, 0..1; full at the highest level. */
    public static double levelProgress(int exp) {
        if (level(exp) == MAX_LEVEL) return 1;
        return CURVE.progress(exp);
    }

    /** Whether a message today still earns EXP (MESSAGE_EXP_DAILY_CAP): always before the job. */
    static boolean chatExpFull(Buddy buddy, String today) {
        Integer earned = buddy.messageExpToday();
        return level(buddy.exp()) >= JOB_AT
                && today.equals(buddy.expDay())
                && earned != null
                && earned >= MESSAGE_EXP_DAILY_CAP;
    }

    // The level each stage starts at.
    static final int BABY_AT = 3;
    static final int CHILD_AT = 5;
    static final int ADULT_AT = 10;
    // The buddy may go its own way only once raised all the way (docs/PROJECT.md, 독립과 앨범): a choice
    // at the top level, so the rewards up to it are not skipped. It can keep living there after.
    static final int GRADUATE_AT = MAX_LEVEL;
    // The job is settled a little after it grows up (docs/fun-improvements.md, 직업): first the new grown-up
    // look on its own, then the job, from how the two raised it.
    static final int JOB_AT = 12;
    // The members may change the job once every this many levels from JOB_CHANGE_FROM (at 20, 30, 40 and 50:
    // with the settled one, a buddy can try all five jobs), and as they like from the top level.
    static final int JOB_CHANGE_EVERY = 10;
    static final int JOB_CHANGE_FROM = 20;

    /**
     * Whether the members may change the job now. {@code changedAt}: the level of their last change, null if
     * never (the settled job does not count). A buddy past JOB_AT without a job (from before jobs, or a later
     * update) may pick one any time.
     */
    static boolean canChangeJob(int level, @Nullable String job, @Nullable Integer changedAt) {
        if (level < JOB_AT) return false;
        if (job == null || level >= MAX_LEVEL) return true;
        if (level < JOB_CHANGE_FROM) return false;
        return changedAt == null || window(changedAt) < window(level);
    }

    /** The level the next change opens at, while one cannot be made now (and the job is settled). */
    static @Nullable Integer jobChangeAt(int level, @Nullable String job, @Nullable Integer changedAt) {
        if (level < JOB_AT || canChangeJob(level, job, changedAt)) return null;
        return Math.min(MAX_LEVEL, Math.max(JOB_CHANGE_FROM, (window(level) + 1) * JOB_CHANGE_EVERY));
    }

    // The levels one change is allowed within: 20–29, 30–39, 40–49, 50–59.
    private static int window(int level) {
        return level / JOB_CHANGE_EVERY;
    }

    /** The lowest level of the window this level is in (a change must have been made before it to allow one). */
    static int windowStart(int level) {
        return window(level) * JOB_CHANGE_EVERY;
    }

    public static Stage stage(int level) {
        if (level >= ADULT_AT) return Stage.ADULT;
        if (level >= CHILD_AT) return Stage.CHILD;
        if (level >= BABY_AT) return Stage.BABY;
        return Stage.EGG;
    }

    public static int fullness(Buddy buddy, Instant now) {
        long elapsed = Duration.between(buddy.fedAt(), now).toMillis();
        long drop = elapsed * 100 / fullToEmpty.toMillis();
        return (int) Math.max(0, 100 - drop);
    }

    /** Poops made since the floor was last clean (the first MAX_POOPS count), cleaned or not. */
    static int poopsMade(Buddy buddy, Instant now) {
        // Grown up, it does not poop any more; it works at its station instead.
        if (stage(level(buddy.exp())) == Stage.ADULT) return 0;
        long count = Duration.between(buddy.cleanedAt(), now).dividedBy(poopEvery);
        return (int) Math.min(MAX_POOPS, Math.max(0, count));
    }

    /** Poops on the floor: made, less those tapped away. */
    public static int poops(Buddy buddy, Instant now) {
        return Math.max(0, poopsMade(buddy, now) - buddy.cleaned());
    }

    public static boolean canFeed(Buddy buddy, Instant now) {
        return fullness(buddy, now) < FEEDABLE_BELOW;
    }

    public static boolean canClean(Buddy buddy, Instant now) {
        return poops(buddy, now) > 0;
    }

    public static boolean isHungry(Buddy buddy, Instant now) {
        return fullness(buddy, now) <= HUNGRY_AT;
    }

    /** Feeding is allowed when the last meal was before this (the query form of canFeed). */
    static Instant feedableIfFedBefore(Instant now) {
        return now.minus(fullToEmpty.multipliedBy(100 - FEEDABLE_BELOW).dividedBy(100));
    }

    // Night for the buddy's job: the app puts it to sleep at 23:00 and wakes it at 7:00 (local time).
    static boolean isNight(Instant now) {
        int hour = now.atZone(DAY_ZONE).getHour();
        return hour >= 23 || hour < 7;
    }

    static String day(Instant now) {
        return LocalDate.ofInstant(now, DAY_ZONE).toString();
    }

    /** Today and the days before it, {@code count} in all, as {@link #day} writes them. */
    static List<String> lastDays(Instant now, int count) {
        LocalDate today = LocalDate.ofInstant(now, DAY_ZONE);
        return IntStream.range(0, count)
                .mapToObj(i -> today.minusDays(i).toString())
                .toList();
    }
}
