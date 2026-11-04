package com.buddychat.chat;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Masks objectionable words in text messages before they are stored, so the partner, the history and
 * push previews only ever see {@code ***}. The list ({@value #WORDS}) is read once at startup.
 *
 * <p>Latin-alphabet entries match whole words only, so "cunt" leaves "Scunthorpe" alone. Entries
 * with Hangul, kana or CJK characters match anywhere: those languages do not put spaces between
 * words (or attach particles to them), so a word boundary would miss most uses.
 */
@Component
class WordFilter {

    static final String WORDS = "chat/filtered-words.txt";

    private final Pattern pattern;

    WordFilter() {
        this(load());
    }

    WordFilter(List<String> words) {
        String alternatives = words.stream()
                .map(String::strip)
                .filter(word -> !word.isEmpty() && !word.startsWith("#"))
                .distinct()
                // Longest first, so an entry is not cut short by a shorter one it contains.
                .sorted(Comparator.comparingInt(String::length).reversed())
                .map(WordFilter::regex)
                .collect(Collectors.joining("|"));
        // "(?!)" never matches: an empty list masks nothing.
        this.pattern = Pattern.compile(
                alternatives.isEmpty() ? "(?!)" : alternatives, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    /** {@code text} with every listed word replaced by as many {@code *} as it has characters. */
    String mask(String text) {
        return pattern.matcher(text).replaceAll(match -> {
            String word = match.group();
            return "*".repeat(word.codePointCount(0, word.length()));
        });
    }

    private static String regex(String word) {
        if (word.codePoints().anyMatch(WordFilter::isCjk)) return Pattern.quote(word);
        // Words of a phrase may be apart by any spaces ("kill  yourself").
        String phrase =
                Pattern.compile("\\s+").splitAsStream(word).map(Pattern::quote).collect(Collectors.joining("\\s+"));
        return "(?<![\\p{L}\\p{N}])" + phrase + "(?![\\p{L}\\p{N}])";
    }

    private static boolean isCjk(int codePoint) {
        Character.UnicodeScript script = Character.UnicodeScript.of(codePoint);
        return script == Character.UnicodeScript.HANGUL
                || script == Character.UnicodeScript.HIRAGANA
                || script == Character.UnicodeScript.KATAKANA
                || script == Character.UnicodeScript.HAN;
    }

    // Once, while the application starts: before any request, so reading the file may block.
    private static List<String> load() {
        try (InputStream in = new ClassPathResource(WORDS).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8).lines().toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + WORDS, e);
        }
    }
}
