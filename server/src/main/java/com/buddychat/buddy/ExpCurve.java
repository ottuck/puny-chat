package com.buddychat.buddy;

/**
 * The EXP for one level (docs/PROJECT.md, 성장): {@code early} for each level up to the job ({@link
 * BuddyRules#JOB_AT}), where most of what there is to see begins, and {@code late} for each after it. A
 * buddy's level comes from its EXP alone.
 */
record ExpCurve(int early, int late) {

    ExpCurve {
        if (early < 1 || late < 1) throw new IllegalArgumentException("EXP per level must be at least 1");
    }

    /** The EXP from {@code level} to the next. */
    int perLevel(int level) {
        return level < BuddyRules.JOB_AT ? early : late;
    }

    /** The EXP a level starts at. */
    int minExp(int level) {
        int beforeJob = Math.min(level, BuddyRules.JOB_AT) - 1;
        return beforeJob * early + Math.max(0, level - BuddyRules.JOB_AT) * late;
    }

    int level(int exp) {
        int job = minExp(BuddyRules.JOB_AT);
        int level = exp < job ? exp / early + 1 : BuddyRules.JOB_AT + (exp - job) / late;
        return Math.min(BuddyRules.MAX_LEVEL, level);
    }

    /** How far into its level {@code exp} is, 0..1. */
    double progress(int exp) {
        int level = level(exp);
        return (exp - minExp(level)) / (double) perLevel(level);
    }

    /**
     * The EXP under {@code next} at the same level and as far into it ({@link BuddyExpScale}). Past the top
     * level, what was earned beyond it is scaled like the last level.
     */
    int carry(int exp, ExpCurve next) {
        int level = level(exp);
        long into = (long) (exp - minExp(level)) * next.perLevel(level) / perLevel(level);
        return next.minExp(level) + (int) into;
    }

    /** Names the curve in growth event keys: the same level reached again under another is a new event. */
    String key() {
        return early + "-" + late;
    }
}
