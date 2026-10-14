package com.buddychat.buddy;

import java.util.List;
import java.util.Locale;

/**
 * Words in a message that count towards the buddy's job (docs/fun-improvements.md, 5): a laugh or a
 * "love you" anywhere in it. The app has the same lists, and more moods, for how the buddy reacts
 * (app: features/buddy/chat-words.ts); keep these two in step. A message with both counts as love,
 * as it is the one the buddy feels first.
 */
final class MoodWords {

    private static final List<String> LOVE = List.of(
            "사랑해", "좋아해", "보고싶", "보고 싶", "大好き", "愛してる", "会いたい", "love you", "miss you", "❤", "💕", "💗", "😍", "🥰");
    private static final List<String> LAUGH = List.of("ㅋㅋ", "ㅎㅎ", "笑", "www", "lol", "haha", "😂", "🤣");

    private MoodWords() {}

    static boolean love(String text) {
        return containsAny(text, LOVE);
    }

    static boolean laugh(String text) {
        return containsAny(text, LAUGH);
    }

    private static boolean containsAny(String text, List<String> words) {
        String lower = text.toLowerCase(Locale.ROOT);
        return words.stream().anyMatch(lower::contains);
    }
}
