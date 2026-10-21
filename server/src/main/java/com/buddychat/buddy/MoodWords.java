package com.buddychat.buddy;

import java.util.List;
import java.util.Locale;

/**
 * Words in a message that count towards the buddy's job (docs/fun-improvements.md, 직업): a "love you"
 * anywhere in it. The app has the same list, and more moods, for how the buddy reacts
 * (app: features/buddy/chat-words.ts); keep the two in step.
 */
final class MoodWords {

    private static final List<String> LOVE = List.of(
            "사랑해",
            "좋아해",
            "보고싶",
            "보고 싶",
            "大好き",
            "愛してる",
            "会いたい",
            "愛你",
            "爱你",
            "喜歡你",
            "喜欢你",
            "好想你",
            "想你了",
            "love you",
            "miss you",
            "❤",
            "💕",
            "💗",
            "😍",
            "🥰");

    private MoodWords() {}

    static boolean love(String text) {
        return containsAny(text, LOVE);
    }

    private static boolean containsAny(String text, List<String> words) {
        String lower = text.toLowerCase(Locale.ROOT);
        return words.stream().anyMatch(lower::contains);
    }
}
