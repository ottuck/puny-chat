package com.buddychat.buddy;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param expPerLevel EXP for one level, tuned for solo users too (env {@code
 *     BUDDYCHAT_BUDDY_EXPPERLEVEL}).
 * @param fullToEmpty how long fullness takes to drop from 100 to 0 after a meal. Feeding is allowed
 *     again after a fifth of it, hunger comes after 70 % (docs/PROJECT.md, Buddy 규칙).
 * @param poopEvery one poop per this long since the last clean.
 */
@ConfigurationProperties("buddychat.buddy")
record BuddyProperties(
        @DefaultValue("5") int expPerLevel,
        @DefaultValue("150m") Duration fullToEmpty,
        @DefaultValue("1h") Duration poopEvery) {}
