package com.buddychat.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SendLimiterTest {

    private final SendLimiter limiter = new SendLimiter();
    private final Instant start = Instant.parse("2026-10-19T10:00:00Z");

    @Test
    void eachMinuteAllowsItsShareAndARefusalIsNotCounted() {
        for (int i = 0; i < 10; i++) assertThat(acquire("henry", start)).isTrue();
        assertThat(acquire("henry", start.plusSeconds(59))).isFalse();
        assertThat(acquire("henry", start.plusSeconds(59))).isFalse();

        assertThat(acquire("henry", start.plusSeconds(60))).isTrue();
        // Others, and texts, have counts of their own.
        assertThat(acquire("yuki", start)).isTrue();
        assertThat(limiter.tryAcquire("henry", SendLimiter.Kind.TEXT, start)).isTrue();
    }

    @Test
    void theDayHasALimitOfItsOwn() {
        Instant minute = start;
        for (int sent = 0; sent < 200; sent += 10) {
            for (int i = 0; i < 10; i++) assertThat(acquire("henry", minute)).isTrue();
            minute = minute.plus(Duration.ofMinutes(1));
        }
        assertThat(acquire("henry", minute)).isFalse();
        assertThat(acquire("henry", Instant.parse("2026-10-20T00:00:00Z"))).isTrue();
    }

    private boolean acquire(String userId, Instant now) {
        return limiter.tryAcquire(userId, SendLimiter.Kind.PHOTO, now);
    }
}
