package com.buddychat.common;

import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.SentryOptions;
import io.sentry.protocol.Message;
import io.sentry.protocol.SentryException;
import io.sentry.protocol.SentryStackFrame;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * The last step before an error leaves for Sentry. It sends the same error (the same exception type
 * thrown at the same place) at most once an hour, so a failing loop cannot use up the free monthly
 * quota, and it removes what an error report has no need for: request, user, breadcrumbs, extras, and
 * email addresses, bearer tokens and credentials inside URLs in the text.
 */
final class ErrorReportFilter implements SentryOptions.BeforeSendCallback {

    private static final Duration REPEAT_WINDOW = Duration.ofHours(1);
    private static final int MAX_KEYS = 200;
    private static final int TEXT_LIMIT = 300;
    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");
    private static final Pattern BEARER = Pattern.compile("(?i)bearer\\s+[\\w.~+/=-]+");
    private static final Pattern URL_CREDENTIALS = Pattern.compile("(?<=://)[^/@\\s]+@");

    private final Clock clock;
    private final Map<String, Instant> lastSent = new ConcurrentHashMap<>();

    ErrorReportFilter(Clock clock) {
        this.clock = clock;
    }

    @Override
    public @Nullable SentryEvent execute(SentryEvent event, Hint hint) {
        if (!due(key(event))) return null;
        event.setRequest(null);
        event.setUser(null);
        event.setServerName(null);
        event.setBreadcrumbs(new ArrayList<>());
        event.setExtras(new HashMap<>());
        List<SentryException> exceptions = reported(event);
        if (exceptions != null) {
            for (SentryException exception : exceptions) {
                exception.setValue(clean(exception.getValue()));
            }
            event.setExceptions(exceptions);
        }
        Message message = event.getMessage();
        if (message != null) {
            message.setMessage(clean(message.getMessage()));
            message.setFormatted(clean(message.getFormatted()));
            message.setParams(List.of());
        }
        return event;
    }

    private boolean due(String key) {
        Instant now = clock.instant();
        if (lastSent.size() >= MAX_KEYS) lastSent.clear();
        AtomicBoolean due = new AtomicBoolean();
        lastSent.compute(key, (k, previous) -> {
            if (previous != null && now.isBefore(previous.plus(REPEAT_WINDOW))) return previous;
            due.set(true);
            return now;
        });
        return due.get();
    }

    /**
     * The exceptions of an event without Reactor's assembly trace: it travels with the error as a
     * suppressed exception, lists the filters a request passed through, and is the same for unrelated errors.
     */
    private static @Nullable List<SentryException> reported(SentryEvent event) {
        List<SentryException> exceptions = event.getExceptions();
        if (exceptions == null) return null;
        return exceptions.stream()
                .filter(exception ->
                        exception.getType() == null || !exception.getType().contains("OnAssemblyException"))
                .toList();
    }

    /** Exception type and the frame that threw it; a message-only event is told apart by its text. */
    private static String key(SentryEvent event) {
        List<SentryException> exceptions = reported(event);
        if (exceptions != null && !exceptions.isEmpty()) {
            SentryException first = exceptions.get(0);
            String where = "";
            if (first.getStacktrace() != null && first.getStacktrace().getFrames() != null) {
                List<SentryStackFrame> frames = first.getStacktrace().getFrames();
                if (!frames.isEmpty()) {
                    SentryStackFrame top = frames.get(frames.size() - 1);
                    where = top.getModule() + "." + top.getFunction() + ":" + top.getLineno();
                }
            }
            return first.getType() + "@" + where;
        }
        Message message = event.getMessage();
        return event.getLogger() + "|" + (message == null ? "" : message.getMessage());
    }

    private static @Nullable String clean(@Nullable String text) {
        if (text == null) return null;
        // Credentials in a URL first: "user:pass@host" would otherwise look like an email address.
        String cleaned = URL_CREDENTIALS.matcher(text).replaceAll("[removed]@");
        cleaned = EMAIL.matcher(cleaned).replaceAll("[email]");
        cleaned = BEARER.matcher(cleaned).replaceAll("Bearer [removed]");
        return cleaned.length() > TEXT_LIMIT ? cleaned.substring(0, TEXT_LIMIT) : cleaned;
    }
}
