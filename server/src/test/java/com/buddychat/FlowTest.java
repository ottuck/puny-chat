package com.buddychat;

import com.buddychat.notification.NotificationFlowTest;
import com.buddychat.support.SupportFlowTest;
import com.buddychat.user.UserService;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

/**
 * The one Spring setup every server test shares, so the whole suite starts a single application
 * context and a single MongoDB. A test class with any other annotation, property or bean override
 * gets a context (and a container) of its own, and each extra context costs a start and a stop.
 * Everything a class needs goes here instead: replacing a bean for one class replaces it for all.
 *
 * <p>Classes share the database, so {@link CleanSlate} empties it and resets the clock before
 * every test.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            // Netty waits 2 s for quiet before it stops; nothing is in flight when a test run ends.
            "spring.reactor.netty.shutdown-quiet-period=0s",
            "buddychat.realtime.auth-timeout=3s",
            "buddychat.push.grace-period=1s",
            "buddychat.push.receipt-delay=300ms",
            "buddychat.support.email=operator@example.com",
            "buddychat.support.from=sender@example.com",
            "buddychat.photos.dir=build/test-photos",
            "buddychat.photos.min-free-space=0B",
            // Off in production until the app that shows them is out (BuddyProperties).
            "buddychat.buddy.gifts=true",
            // Error reports are on, but SentryCapture keeps them in memory: nothing is sent.
            "sentry.dsn=https://key@o1.ingest.us.sentry.io/1",
            "sentry.release=test-release"
        })
@Import({
    TestcontainersConfiguration.class,
    TestJwtConfiguration.class,
    MutableClock.Config.class,
    SentryCapture.class,
    NotificationFlowTest.FakePush.class,
    SupportFlowTest.MailConfig.class
})
// A spy acts as the real service until a test stubs it; stubs are reset after each test.
@MockitoSpyBean(types = UserService.class)
@ExtendWith(CleanSlate.class)
public @interface FlowTest {}
