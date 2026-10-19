package com.buddychat.chat;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * How many texts and photos one user may send (docs/PROJECT.md, 보내기 제한). Far above what two people
 * chatting send, so only a runaway client or someone filling the database meets it. Kept in memory:
 * there is one server, and a restart starting the counts over is harmless.
 */
@Component
public class SendLimiter {

    enum Kind {
        TEXT(120, 3_000),
        PHOTO(10, 200);

        final int perMinute;
        final int perDay;

        Kind(int perMinute, int perDay) {
            this.perMinute = perMinute;
            this.perDay = perDay;
        }
    }

    private static final long MINUTES_PER_DAY = Duration.ofDays(1).toMinutes();

    private record Key(String userId, Kind kind) {}

    private record Counts(long minute, int inMinute, long day, int inDay) {}

    private final Map<Key, Counts> counts = new ConcurrentHashMap<>();

    /** Counts one more send and says whether it is allowed. A refused one is not counted. */
    boolean tryAcquire(String userId, Kind kind, Instant now) {
        long minute = now.getEpochSecond() / 60;
        long day = minute / MINUTES_PER_DAY;
        if (counts.size() > 10_000) counts.values().removeIf(c -> c.day() != day);
        boolean[] allowed = {false};
        counts.compute(new Key(userId, kind), (key, c) -> {
            int inMinute = c != null && c.minute() == minute ? c.inMinute() : 0;
            int inDay = c != null && c.day() == day ? c.inDay() : 0;
            if (inMinute >= kind.perMinute || inDay >= kind.perDay) return new Counts(minute, inMinute, day, inDay);
            allowed[0] = true;
            return new Counts(minute, inMinute + 1, day, inDay + 1);
        });
        return allowed[0];
    }

    /** Forgets every count (tests start each one from nothing). */
    public void clear() {
        counts.clear();
    }
}
