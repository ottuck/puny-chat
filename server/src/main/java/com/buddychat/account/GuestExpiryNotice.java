package com.buddychat.account;

import com.buddychat.notification.NotificationService;
import com.buddychat.notification.NotificationService.Notice;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Tells a guest by push when 7, 3 and 1 days are left (docs/PROJECT.md, 게스트 우선): after that
 * Firebase deletes the account and the buddy and chats cannot be reached again. The app's mailbox
 * has the same letters; the push reaches someone who does not open the app.
 *
 * <p>Days are counted from the server's user, made on the first request right after the Firebase
 * account, and rounded up like the app does. Each notice goes once ({@link User#guestNoticeDays});
 * a guest who links an account is no longer a guest and gets none.
 */
@Component
class GuestExpiryNotice {

    private static final Logger log = LoggerFactory.getLogger(GuestExpiryNotice.class);
    static final List<Integer> NOTICE_DAYS = List.of(1, 3, 7);
    private static final Duration DAY = Duration.ofDays(1);

    private final UserService userService;
    private final NotificationService notifications;
    private final Clock clock;

    GuestExpiryNotice(UserService userService, NotificationService notifications, Clock clock) {
        this.userService = userService;
        this.notifications = notifications;
        this.clock = clock;
    }

    // Every evening at 19:00 in Japan (and Korea): a time to read a notice, not to be woken by one.
    @Scheduled(cron = "0 0 19 * * *", zone = "Asia/Tokyo")
    void daily() {
        run().subscribe(
                        count -> log.info("Guest notices: sent {}", count),
                        e -> log.warn("Guest notices failed; they run again tomorrow", e));
    }

    /** Sends the notices due now, one guest after another. Emits how many. */
    Mono<Long> run() {
        Instant now = Instant.now(clock);
        Duration lifetime = GuestCleanup.GUEST_LIFETIME;
        int widest = NOTICE_DAYS.getLast();
        return userService
                .findGuestsCreatedBetween(
                        now.minus(lifetime), now.minus(lifetime).plus(DAY.multipliedBy(widest)))
                .concatMap(guest -> {
                    long left = daysLeft(guest.createdAt(), now);
                    Integer due = NOTICE_DAYS.stream()
                            .filter(days -> left <= days)
                            .findFirst()
                            .orElse(null);
                    if (due == null || guest.id() == null) return Mono.empty();
                    return userService
                            .claimGuestNotice(guest.id(), due)
                            .filter(claimed -> claimed)
                            .flatMap(claimed -> notifications
                                    .notify(guest.id(), language -> notice(language, left))
                                    .thenReturn(guest));
                })
                .count();
    }

    // Rounded up: 30 right after starting, 1 on the last day (app: guest-expiry.ts).
    static long daysLeft(Instant createdAt, Instant now) {
        long millis = Duration.between(now, createdAt.plus(GuestCleanup.GUEST_LIFETIME))
                .toMillis();
        return Math.max(0, (millis + DAY.toMillis() - 1) / DAY.toMillis());
    }

    static Notice notice(@Nullable String language, long days) {
        String body = switch (language == null ? "en" : language) {
            case "ko" -> "게스트 이용 기간이 " + days + "일 남았어요. 설정에서 계정을 연결하면 버디와 대화가 그대로 이어져요.";
            case "ja" -> "ゲストの利用期間は残り" + days + "日です。設定でアカウントを連携すると、Buddyと会話をそのまま続けられます。";
            default ->
                (days == 1 ? "1 day" : days + " days")
                        + " left as a guest. Link an account in Settings to keep your buddy and chats.";
        };
        return new Notice("puny-chat", body);
    }
}
