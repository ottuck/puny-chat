package com.buddychat.common;

import static com.buddychat.TestJwtConfiguration.token;
import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.FlowTest;
import com.buddychat.SentryCapture;
import java.time.Duration;
import java.util.List;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.reactive.server.WebTestClient;

@FlowTest
class ErrorReportingFlowTest {

    private static final Logger log = LoggerFactory.getLogger(ErrorReportingFlowTest.class);

    @LocalServerPort
    int port;

    @Test
    void aServerErrorIsReportedWithoutWhatTheRequestCarried() {
        WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build()
                .get()
                .uri("/api/test-boom?secret=query-secret")
                .header("Authorization", "Bearer " + token("reporter"))
                .exchange()
                .expectStatus()
                .is5xxServerError();

        String report = awaitReport(text -> text.contains("test-boom") || text.contains("boom for"));

        assertThat(report).contains("IllegalStateException").contains("boom for [email]");
        assertThat(report)
                .doesNotContain("user@example.com")
                .doesNotContain("query-secret")
                .doesNotContain("reporter~reporter")
                .doesNotContain("\"request\"")
                .doesNotContain("OnAssemblyException");
    }

    @Test
    void anErrorLogIsReportedOnceAnHourEvenWhenItRepeats() throws InterruptedException {
        for (int i = 0; i < 3; i++) {
            reportBrokenThing();
        }

        awaitReport(text -> text.contains("BrokenThing"));
        Thread.sleep(500); // a second report would arrive by now
        List<String> reports = SentryCapture.sent().stream()
                .filter(text -> text.contains("BrokenThing"))
                .toList();
        assertThat(reports).hasSize(1);
        assertThat(reports.get(0)).contains("level\":\"error").contains("release\":\"test-release");
    }

    private static void reportBrokenThing() {
        log.error("Something broke for guest@example.com", new IllegalArgumentException("BrokenThing"));
    }

    private static String awaitReport(Predicate<String> matches) {
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while (System.nanoTime() < deadline) {
            for (String text : SentryCapture.sent()) {
                if (matches.test(text)) return text;
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
        throw new AssertionError("nothing reached Sentry: " + SentryCapture.sent());
    }
}
