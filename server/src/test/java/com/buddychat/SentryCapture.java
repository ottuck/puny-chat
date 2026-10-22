package com.buddychat;

import io.sentry.Hint;
import io.sentry.ITransportFactory;
import io.sentry.SentryEnvelope;
import io.sentry.SentryEnvelopeItem;
import io.sentry.transport.ITransport;
import io.sentry.transport.RateLimiter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Keeps what Sentry would send in memory instead of sending it, so tests can read what an error
 * report holds. The application runs with a DSN (see {@link FlowTest}); nothing leaves the machine.
 * {@code /api/test-boom} is a route that fails, for the server-error path.
 */
@TestConfiguration(proxyBeanMethods = false)
public class SentryCapture {

    private static final List<String> SENT = new CopyOnWriteArrayList<>();

    /** Everything sent so far, one string per envelope item. */
    public static List<String> sent() {
        return SENT;
    }

    @Bean
    ITransportFactory sentryTransportFactory() {
        return (options, details) -> new ITransport() {
            @Override
            public void send(SentryEnvelope envelope, Hint hint) {
                for (SentryEnvelopeItem item : envelope.getItems()) {
                    try {
                        SENT.add(new String(item.getData(), StandardCharsets.UTF_8));
                    } catch (Exception e) {
                        throw new IllegalStateException(e);
                    }
                }
            }

            @Override
            public void flush(long timeoutMillis) {}

            @Override
            public RateLimiter getRateLimiter() {
                return null;
            }

            @Override
            public void close(boolean isRestarting) {}

            @Override
            public void close() {}
        };
    }

    @RestController
    static class Boom {

        @GetMapping("/api/test-boom")
        String boom() {
            throw new IllegalStateException("boom for user@example.com");
        }
    }
}
