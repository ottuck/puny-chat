package com.buddychat.common;

import io.sentry.KeyValueCollectionBehavior;
import io.sentry.Sentry;
import io.sentry.SentryOptions;
import java.time.Clock;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Unexpected errors (anything logged at ERROR, and uncaught exceptions) go to Sentry when SENTRY_DSN is
 * set; without a DSN the SDK stays off (application.yaml has the rest of its settings). Only the
 * error itself is wanted, so everything the SDK could collect on its own is turned off, and
 * {@link ErrorReportFilter} has the last word on each event.
 */
@Configuration(proxyBeanMethods = false)
class ErrorReporting {

    @Bean
    Sentry.OptionsConfiguration<SentryOptions> errorReportOptions() {
        return options -> {
            var data = options.getDataCollection();
            data.setUserInfo(false);
            data.setCookies(KeyValueCollectionBehavior.off());
            data.setUrlQueryParams(KeyValueCollectionBehavior.off());
            data.getHttpHeaders().setRequest(KeyValueCollectionBehavior.off());
            data.getHttpHeaders().setResponse(KeyValueCollectionBehavior.off());
            data.setHttpBodies(Set.of());
            data.setDatabaseQueryData(false);
        };
    }

    @Bean
    SentryOptions.BeforeSendCallback errorReportFilter(Clock clock) {
        return new ErrorReportFilter(clock);
    }
}
