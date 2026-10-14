package com.buddychat.buddy;

import org.jspecify.annotations.Nullable;

/**
 * What a buddy grows up to be, from how the two raised it (docs/fun-improvements.md, 5). Nobody
 * picks it: each job has points from what they did, and the highest wins when the buddy becomes an
 * adult. Ties go to the job listed first; with too few points for any it is the chatterbox.
 */
public enum BuddyJob {
    // Meals given.
    CHEF,
    // Poops cleaned up.
    CLEANER,
    // Messages written at night (23:00 to 7:00, Japan time), three to a point.
    OWL,
    // Messages with a laugh in them, three to a point.
    COMEDIAN,
    // Messages with a "love you" in them, two to a point.
    ROMANTIC,
    // Nothing stood out.
    CHATTERBOX;

    /** Below this for every job the buddy is a chatterbox. */
    static final int MIN_POINTS = 5;

    static final int NIGHT_PER_POINT = 3;
    static final int LAUGH_PER_POINT = 3;
    static final int LOVE_PER_POINT = 2;

    private int points(Buddy buddy) {
        return switch (this) {
            case CHEF -> buddy.fed();
            case CLEANER -> buddy.cleanedUp();
            case OWL -> buddy.nights() / NIGHT_PER_POINT;
            case COMEDIAN -> buddy.laughs() / LAUGH_PER_POINT;
            case ROMANTIC -> buddy.loves() / LOVE_PER_POINT;
            case CHATTERBOX -> 0;
        };
    }

    // The job with the most points (the first of equals), and how many.
    private record Best(BuddyJob job, int points) {}

    private static Best best(Buddy buddy) {
        Best best = new Best(CHATTERBOX, 0);
        for (BuddyJob job : values()) {
            int points = job.points(buddy);
            if (points > best.points()) best = new Best(job, points);
        }
        return best;
    }

    /** The job this buddy would have if it became an adult now. */
    static BuddyJob decide(Buddy buddy) {
        Best best = best(buddy);
        return best.points() >= MIN_POINTS ? best.job() : CHATTERBOX;
    }

    /** Where it is heading as a child; null until there is anything to go by. */
    static @Nullable BuddyJob leaning(Buddy buddy) {
        return best(buddy).points() > 0 ? decide(buddy) : null;
    }

    /** The stored name, or null when absent or from a version this server does not know. */
    static @Nullable BuddyJob of(@Nullable String name) {
        if (name == null) return null;
        try {
            return valueOf(name);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
