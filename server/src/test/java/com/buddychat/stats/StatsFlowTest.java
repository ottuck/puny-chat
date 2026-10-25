package com.buddychat.stats;

import static com.buddychat.TestJwtConfiguration.guestToken;
import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.FlowTest;
import com.buddychat.MutableClock;
import com.buddychat.user.User;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;

@FlowTest
class StatsFlowTest {

    @LocalServerPort
    int port;

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    MutableClock clock;

    @Autowired
    StatsReport report;

    @Autowired
    StatsService stats;

    private WebTestClient http;

    @BeforeEach
    void setUp() {
        clock.set(Instant.parse("2026-10-12T01:00:00Z")); // Monday 10:00 in Japan
        Flux.just(mongo.remove(new Query(), User.class), mongo.remove(new Query(), StatsService.COLLECTION))
                .flatMap(remove -> remove)
                .blockLast();
        http = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void stepsAreCountedWithoutSigningInPerDayAndPlatform() {
        step("welcome", "ios").expectStatus().isNoContent();
        step("welcome", "ios").expectStatus().isNoContent();
        step("demo", "web").expectStatus().isNoContent();

        Document day = stats("steps:2026-10-12");
        assertThat(day.get("ios", Document.class).getInteger("welcome")).isEqualTo(2);
        assertThat(day.get("web", Document.class).getInteger("demo")).isEqualTo(1);
    }

    @Test
    void unknownStepsOrPlatformsAreRejected() {
        step("anything", "ios").expectStatus().isBadRequest();
        step("welcome", "desktop").expectStatus().isBadRequest();
        http.post()
                .uri("/api/stats/steps")
                .bodyValue(Map.of())
                .exchange()
                .expectStatus()
                .isBadRequest();
        assertThat(mongo.count(new Query(), StatsService.COLLECTION).block()).isZero();
    }

    @Test
    void aUserIsCountedOnceForEachLaterDayTheyComeBack() {
        me(guestToken("back")); // joins
        me(guestToken("back")); // the same day: not back yet
        clock.advance(Duration.ofDays(1));
        me(guestToken("back"));
        me(guestToken("back")); // once a day
        clock.advance(Duration.ofDays(6));
        me(guestToken("back"));
        me(guestToken("other")); // joins on day 7

        Document joined = stats("joined:2026-10-12");
        assertThat(joined.getInteger("joined")).isEqualTo(1);
        assertThat(joined.getInteger("d1")).isEqualTo(1);
        assertThat(joined.getInteger("d7")).isEqualTo(1);
        assertThat(joined.keySet()).containsExactlyInAnyOrder("_id", "joined", "d1", "d7");
        assertThat(stats("joined:2026-10-19").getInteger("joined")).isEqualTo(1);
    }

    @Test
    void racingRequestsOnANewDayCountTheComebackOnce() {
        me(guestToken("racer"));
        clock.advance(Duration.ofDays(1));
        Flux.range(0, 8)
                .flatMap(i -> http.get()
                        .uri("/api/me")
                        .header("Authorization", "Bearer " + guestToken("racer"))
                        .exchange()
                        .returnResult(String.class)
                        .getResponseBody()
                        .then())
                .blockLast();

        assertThat(stats("joined:2026-10-12").getInteger("d1")).isEqualTo(1);
    }

    @Test
    void theWeeklyReportSumsLastWeek() {
        me(guestToken("a"));
        step("welcome", "ios");
        step("wake", "web");
        stats.cared("feed", true, clock.instant()).block();
        stats.cared("feed", false, clock.instant()).block();
        stats.cared("clean", false, clock.instant()).block();
        clock.advance(Duration.ofDays(1));
        me(guestToken("a"));

        String text = report.build(LocalDate.parse("2026-10-19")).block();

        assertThat(text).contains("10/12 ~ 10/18");
        assertThat(text).contains("첫 화면: 1 / 0 / 0");
        assertThat(text).contains("버디 깨우기: 0 / 1 / 0");
        assertThat(text).contains("밥: 1 / 1");
        assertThat(text).contains("청소: 0 / 1");
        assertThat(text).contains("10/12~10/18 가입 1 · 1일째 … · 7일째 … · 30일째 …");
    }

    private WebTestClient.ResponseSpec step(String step, String platform) {
        return http.post()
                .uri("/api/stats/steps")
                .bodyValue(Map.of("step", step, "platform", platform))
                .exchange();
    }

    private void me(String bearer) {
        http.get()
                .uri("/api/me")
                .header("Authorization", "Bearer " + bearer)
                .exchange()
                .expectStatus()
                .isOk();
    }

    private Document stats(String id) {
        return mongo.findById(id, Document.class, StatsService.COLLECTION).block();
    }
}
