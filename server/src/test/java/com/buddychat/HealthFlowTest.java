package com.buddychat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.reactive.server.WebTestClient;

/** What the instance's watchdog reads (server/deploy/health.sh), without a token. */
@FlowTest
class HealthFlowTest {

    @LocalServerPort
    int port;

    private WebTestClient http;

    @BeforeEach
    void setUp() {
        http = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void healthAndLivenessAreOpenAndNothingElseIs() {
        http.get().uri("/actuator/health").exchange().expectStatus().isOk();
        http.get()
                .uri("/actuator/health/liveness")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.status")
                .isEqualTo("UP");
        http.get().uri("/actuator/health/readiness").exchange().expectStatus().isUnauthorized();
    }
}
