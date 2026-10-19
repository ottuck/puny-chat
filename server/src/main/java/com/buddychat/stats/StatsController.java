package com.buddychat.stats;

import java.time.Clock;
import java.time.Instant;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
class StatsController {

    private final StatsService stats;
    private final Clock clock;

    StatsController(StatsService stats, Clock clock) {
        this.stats = stats;
        this.clock = clock;
    }

    record StepRequest(@Nullable String step, @Nullable String platform) {}

    // Most steps come before sign-in, so no token (auth/SecurityConfig). Only a count goes up.
    @PostMapping("/api/stats/steps")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    Mono<Void> step(@RequestBody StepRequest request) {
        return stats.step(request.step(), request.platform(), Instant.now(clock));
    }
}
