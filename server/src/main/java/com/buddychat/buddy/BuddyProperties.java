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
 * @param gifts whether a grown-up makes the members gifts at work (docs/fun-improvements.md, 직업 선물; env
 *     {@code BUDDYCHAT_BUDDY_GIFTS}). Off until the iPhone app that shows them is out: an app from before
 *     would show the new timeline line as its translation key.
 */
@ConfigurationProperties("buddychat.buddy")
record BuddyProperties(
        @DefaultValue("5") int expPerLevel,
        @DefaultValue("150m") Duration fullToEmpty,
        @DefaultValue("1h") Duration poopEvery,
        @DefaultValue("false") boolean gifts) {}
