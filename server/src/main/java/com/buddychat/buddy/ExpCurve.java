package com.buddychat.buddy;

import java.util.List;
import java.util.stream.Collectors;

/**
 * The EXP for one level (docs/PROJECT.md, 성장): {@code early} holds the EXP from each level to the next for the
 * first levels (up to the job, {@link BuddyRules#JOB_AT}, where most of what there is to see begins), quickest
 * at first so the egg hatches in the first minutes; {@code late} is the EXP for each level after them. A
 * buddy's level comes from its EXP alone.
 */
record ExpCurve(List<Integer> early, int late) {

    ExpCurve {
        if (late < 1 || early.stream().anyMatch(exp -> exp < 1)) {
            throw new IllegalArgumentException("EXP per level must be at least 1");
        }
        early = List.copyOf(early);
    }

    /** The EXP from {@code level} to the next. */
    int perLevel(int level) {
        return level <= early.size() ? early.get(level - 1) : late;
    }

    /** The EXP a level starts at. */
    int minExp(int level) {
        int exp = 0;
        for (int below = 1; below < level; below++) exp += perLevel(below);
        return exp;
    }

    int level(int exp) {
        int level = 1;
        while (level < BuddyRules.MAX_LEVEL && exp >= perLevel(level)) {
            exp -= perLevel(level);
            level++;
        }
        return level;
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
        String before = early.stream().distinct().count() == 1
                ? String.valueOf(early.getFirst())
                : early.stream().map(String::valueOf).collect(Collectors.joining("."));
        return before + "-" + late;
    }
}
