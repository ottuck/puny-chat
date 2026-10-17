package com.buddychat.buddy;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Care from the chat (docs/PROJECT.md, Buddy 무대): a message that is only "밥" or "🍚" feeds the
 * buddy, only "청소", "똥" or "🧹" cleans up, and only "일" or "💼" sends a grown-up (which no longer
 * poops) to work at its station, in each supported language. The app has the same lists
 * (app: features/buddy/chat-words.ts) for how the buddy answers, e.g. shaking its head when full. Only the whole message counts,
 * so "밥 먹었어?" stays a question; trailing "!", "~" or "." are fine.
 */
enum CareCommand {
    FEED(Set.of("밥", "🍚", "ごはん", "ご飯", "food", "feed")),
    CLEAN(Set.of("청소", "🧹", "똥", "💩", "そうじ", "掃除", "うんち", "clean", "poop")),
    WORK(Set.of("일", "💼", "仕事", "しごと", "work"));

    private final Set<String> words;

    CareCommand(Set<String> words) {
        this.words = words;
    }

    static Optional<CareCommand> of(String text) {
        String word = text.strip().replaceAll("[!~.！。]+$", "").strip().toLowerCase(Locale.ROOT);
        for (CareCommand command : values()) {
            if (command.words.contains(word)) return Optional.of(command);
        }
        return Optional.empty();
    }
}
