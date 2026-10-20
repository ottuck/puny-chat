package com.buddychat.buddy;

import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** The buddy as the app shows it, computed at {@code now}. The app does not re-derive the rules. */
public record BuddyView(
        String name,
        int exp,
        int level,
        BuddyRules.Stage stage,
        double levelProgress,
        int fullness,
        int poops,
        boolean hungry,
        boolean canFeed,
        boolean canClean,
        // At the top level: ready to go its own way (BuddyService.graduate).
        boolean grown,
        // Members who sent a message today, and whether both have (the day's bonus is given).
        List<String> talkedToday,
        boolean togetherToday,
        // What it grew up to be (docs/fun-improvements.md, 직업): set once it is an adult.
        @Nullable BuddyJob job,
        // Until the job is settled (a child, or a new grown-up), the job it is heading for so far.
        @Nullable BuddyJob leaning,
        // The members may change the job now (BuddyRules.canChangeJob): once in each of 20–29, 30–39, 40–49
        // and 50–59, freely from the top level.
        boolean canChangeJob,
        // While it cannot be changed: the level the next change opens at.
        @Nullable Integer jobChangeAt,
        // What it made the members at work, newest first (docs/fun-improvements.md, 직업 이벤트).
        List<Gift> gifts) {

    public static BuddyView of(Buddy buddy, Instant now) {
        int level = BuddyRules.level(buddy.exp());
        String today = BuddyRules.day(now);
        return new BuddyView(
                buddy.name(),
                buddy.exp(),
                level,
                BuddyRules.stage(level),
                BuddyRules.levelProgress(buddy.exp()),
                BuddyRules.fullness(buddy, now),
                BuddyRules.poops(buddy, now),
                BuddyRules.isHungry(buddy, now),
                BuddyRules.canFeed(buddy, now),
                BuddyRules.canClean(buddy, now),
                level >= BuddyRules.GRADUATE_AT,
                buddy.talkedOn(today),
                today.equals(buddy.togetherDay()),
                BuddyJob.of(buddy.job()),
                leaning(buddy, level),
                BuddyRules.canChangeJob(level, buddy.job(), buddy.jobChangedLevel()),
                BuddyRules.jobChangeAt(level, buddy.job(), buddy.jobChangedLevel()),
                buddy.made().reversed());
    }

    private static @Nullable BuddyJob leaning(Buddy buddy, int level) {
        BuddyRules.Stage stage = BuddyRules.stage(level);
        boolean settling = stage == BuddyRules.Stage.CHILD
                || (stage == BuddyRules.Stage.ADULT && level < BuddyRules.JOB_AT && buddy.job() == null);
        return settling ? BuddyJob.leaning(buddy) : null;
    }
}
