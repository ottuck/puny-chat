package com.buddychat.buddy;

import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * What a buddy grows up to be, from how the two raised it (docs/fun-improvements.md, 직업). Nobody
 * picks it: each habit is counted, and the job is settled at Lv.12 (BuddyRules.JOB_AT) by the habit
 * that stands out most against what a pair usually does by then. Each count is measured against its
 * own usual amount, so no habit wins just by coming more often (meals come more often than love
 * letters), and every job comes about as often. With no habit a quarter beyond its usual amount it is
 * the barista, the one who gets on with everything. Equal habits go by a draw fixed for the buddy.
 */
public enum BuddyJob {
    // Meals given.
    CHEF(5),
    // Poops cleaned up.
    GARDENER(4),
    // Messages written at night (23:00 to 7:00, Japan time).
    DJ(6),
    // Messages with a "love you" in them.
    WRITER(3),
    // Nothing stood out.
    BARISTA(0);

    // What a pair usually does by Lv.12, for the habits (about two days for two, three for one):
    // five meals, four poops cleaned up, six messages at night, three with a "love you".
    private final int usual;

    BuddyJob(int usual) {
        this.usual = usual;
    }

    // The usual amounts' common multiple: a habit's score is count × SCALE / usual, so they compare
    // in whole numbers, and SCALE is "as much as usual".
    static final int SCALE = 60;
    // A habit stands out at a quarter more than usual.
    static final int STANDS_OUT = SCALE * 5 / 4;

    private int score(Buddy buddy) {
        int count = switch (this) {
            case CHEF -> buddy.fed();
            case GARDENER -> buddy.cleanedUp();
            case DJ -> buddy.nights();
            case WRITER -> buddy.loves();
            case BARISTA -> 0;
        };
        return usual == 0 ? 0 : count * SCALE / usual;
    }

    // The habits that stand out most (all of them, when equal), and by how much.
    private record Best(List<BuddyJob> jobs, int score) {}

    private static Best best(Buddy buddy) {
        List<BuddyJob> jobs = new ArrayList<>();
        int top = 0;
        for (BuddyJob job : values()) {
            if (job == BARISTA) continue;
            int score = job.score(buddy);
            if (score > top) {
                top = score;
                jobs.clear();
            }
            if (score == top && score > 0) jobs.add(job);
        }
        return new Best(jobs, top);
    }

    /** The job this buddy would get if it were settled now. */
    static BuddyJob decide(Buddy buddy) {
        Best best = best(buddy);
        if (best.score() < STANDS_OUT) return BARISTA;
        // A draw among equals, the same every time for this buddy.
        int draw =
                (int) Math.floorMod(buddy.bornAt().getEpochSecond(), best.jobs().size());
        return best.jobs().get(draw);
    }

    /** Where it is heading until the job is settled; null until there is anything to go by. */
    static @Nullable BuddyJob leaning(Buddy buddy) {
        return best(buddy).score() > 0 ? decide(buddy) : null;
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
