package com.buddychat.account;

import static com.buddychat.TestJwtConfiguration.guestToken;
import static com.buddychat.TestJwtConfiguration.token;
import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.MutableClock;
import com.buddychat.TestJwtConfiguration;
import com.buddychat.TestcontainersConfiguration;
import com.buddychat.notification.NotificationFlowTest;
import com.buddychat.notification.PushMessage;
import com.buddychat.user.User;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({
    TestcontainersConfiguration.class,
    TestJwtConfiguration.class,
    MutableClock.Config.class,
    NotificationFlowTest.FakePush.class
})
class GuestExpiryNoticeFlowTest {

    @LocalServerPort
    int port;

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    MutableClock clock;

    @Autowired
    NotificationFlowTest.FakeSender push;

    @Autowired
    GuestExpiryNotice notices;

    private WebTestClient http;

    @BeforeEach
    void setUp() {
        clock.reset();
        Flux.just(User.class)
                .flatMap(type -> mongo.remove(new Query(), type))
                .thenMany(mongo.remove(new Query(), "push_tokens"))
                .blockLast();
        push.sent.clear();
        http = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void aGuestHearsAtSevenThreeAndOneDaysLeftOnceEachInTheirLanguage() {
        register(guestToken("guest"), "ExponentPushToken[guest]", "ja");

        clock.advance(Duration.ofDays(22)); // 8 days left
        assertThat(notices.run().block()).isZero();

        clock.advance(Duration.ofDays(1)); // 7
        assertThat(notices.run().block()).isEqualTo(1);
        assertThat(notices.run().block()).as("once").isZero();
        clock.advance(Duration.ofDays(2)); // 5
        assertThat(notices.run().block()).isZero();
        clock.advance(Duration.ofDays(2)); // 3
        assertThat(notices.run().block()).isEqualTo(1);
        clock.advance(Duration.ofDays(2)); // 1
        assertThat(notices.run().block()).isEqualTo(1);
        clock.advance(Duration.ofHours(12));
        assertThat(notices.run().block()).isZero();

        assertThat(push.sent)
                .extracting(PushMessage::body)
                .allMatch(body -> body.startsWith("ゲストの利用期間は残り"))
                .extracting(body -> body.substring("ゲストの利用期間は残り".length(), body.indexOf('日')))
                .containsExactly("7", "3", "1");
    }

    @Test
    void aGuestAwayForAFewDaysGetsOnlyTheNoticeDueNow() {
        register(guestToken("away"), "ExponentPushToken[away]", "ko");

        clock.advance(Duration.ofDays(28)); // 2 days left: past the 7-day notice
        assertThat(notices.run().block()).isEqualTo(1);

        assertThat(push.sent)
                .singleElement()
                .extracting(PushMessage::body)
                .asString()
                .startsWith("게스트 이용 기간이 2일");
    }

    @Test
    void aLinkedAccountAndAnOldDeviceWithoutALanguageAreHandled() {
        register(guestToken("linked"), "ExponentPushToken[linked]", "ko");
        me(token("linked")); // linked: the same uid, no longer a guest
        register(guestToken("old-app"), "ExponentPushToken[old-app]", null);

        clock.advance(Duration.ofDays(23));
        assertThat(notices.run().block()).isEqualTo(1);

        PushMessage sent = push.sent.getFirst();
        assertThat(sent.to()).isEqualTo("ExponentPushToken[old-app]");
        assertThat(sent.body())
                .isEqualTo("7 days left as a guest. Link an account in Settings to keep your buddy and chats.");
    }

    private void register(String bearer, String pushToken, String language) {
        Map<String, String> body =
                language == null ? Map.of("token", pushToken) : Map.of("token", pushToken, "language", language);
        http.post()
                .uri("/api/me/push-tokens")
                .header("Authorization", "Bearer " + bearer)
                .bodyValue(body)
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    private void me(String bearer) {
        http.get()
                .uri("/api/me")
                .header("Authorization", "Bearer " + bearer)
                .exchange()
                .expectStatus()
                .isOk();
    }
}
