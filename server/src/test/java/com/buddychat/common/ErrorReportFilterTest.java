package com.buddychat.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.MutableClock;
import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.protocol.Message;
import io.sentry.protocol.Request;
import io.sentry.protocol.SentryException;
import io.sentry.protocol.SentryStackFrame;
import io.sentry.protocol.SentryStackTrace;
import io.sentry.protocol.User;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class ErrorReportFilterTest {

    private final MutableClock clock = new MutableClock();
    private final ErrorReportFilter filter = new ErrorReportFilter(clock);

    private static SentryEvent thrown(String type, String value, int line) {
        SentryStackFrame frame = new SentryStackFrame();
        frame.setModule("com.buddychat.chat.ChatService");
        frame.setFunction("send");
        frame.setLineno(line);
        SentryException exception = new SentryException();
        exception.setType(type);
        exception.setValue(value);
        exception.setStacktrace(new SentryStackTrace(List.of(frame)));
        SentryEvent event = new SentryEvent();
        event.setExceptions(List.of(exception));
        return event;
    }

    @Test
    void requestUserAndExtrasAreRemovedAndSecretsInTheTextAreHidden() {
        SentryEvent event = thrown(
                "MongoTimeoutException",
                "Timed out for mongodb://app:s3cret@cluster.example.net/db and owner@example.com with Bearer abc.def-123",
                10);
        event.setRequest(new Request());
        event.setUser(new User());
        event.setExtra("room", "r1");
        Message message = new Message();
        message.setMessage("Failed for {}");
        message.setFormatted("Failed for guest@example.com");
        message.setParams(List.of("guest@example.com"));
        event.setMessage(message);

        SentryEvent sent = filter.execute(event, new Hint());

        assertThat(sent).isNotNull();
        assertThat(sent.getRequest()).isNull();
        assertThat(sent.getUser()).isNull();
        assertThat(sent.getExtras()).isEmpty();
        assertThat(sent.getBreadcrumbs()).isEmpty();
        String value = sent.getExceptions().get(0).getValue();
        assertThat(value)
                .contains("mongodb://[removed]@cluster.example.net/db")
                .contains("[email]")
                .contains("Bearer [removed]")
                .doesNotContain("s3cret")
                .doesNotContain("owner@example.com")
                .doesNotContain("abc.def-123");
        assertThat(sent.getMessage().getFormatted()).isEqualTo("Failed for [email]");
        assertThat(sent.getMessage().getParams()).isEmpty();
    }

    @Test
    void longTextIsCut() {
        SentryEvent sent = filter.execute(thrown("Boom", "x".repeat(1000), 10), new Hint());

        assertThat(sent.getExceptions().get(0).getValue()).hasSize(300);
    }

    @Test
    void theSameErrorAtTheSamePlaceIsSentOnceAnHour() {
        assertThat(filter.execute(thrown("Boom", "a", 10), new Hint())).isNotNull();
        assertThat(filter.execute(thrown("Boom", "b", 10), new Hint())).isNull();
        clock.advance(Duration.ofMinutes(59));
        assertThat(filter.execute(thrown("Boom", "c", 10), new Hint())).isNull();
        clock.advance(Duration.ofMinutes(1));
        assertThat(filter.execute(thrown("Boom", "d", 10), new Hint())).isNotNull();
    }

    @Test
    void anotherTypeOrPlaceIsSentAtOnce() {
        assertThat(filter.execute(thrown("Boom", "a", 10), new Hint())).isNotNull();
        assertThat(filter.execute(thrown("Bang", "a", 10), new Hint())).isNotNull();
        assertThat(filter.execute(thrown("Boom", "a", 11), new Hint())).isNotNull();
    }

    @Test
    void reactorsAssemblyTraceIsDroppedAndDoesNotMakeUnrelatedErrorsLookAlike() {
        SentryEvent first = thrown("Boom", "a", 10);
        SentryException assembly = thrown("reactor.core.publisher.FluxOnAssembly$OnAssemblyException", "sites", 1)
                .getExceptions()
                .get(0);
        first.setExceptions(List.of(assembly, first.getExceptions().get(0)));
        SentryEvent second = thrown("Bang", "a", 20);
        second.setExceptions(List.of(assembly, second.getExceptions().get(0)));

        SentryEvent sentFirst = filter.execute(first, new Hint());
        SentryEvent sentSecond = filter.execute(second, new Hint());

        assertThat(sentFirst).isNotNull();
        assertThat(sentFirst.getExceptions())
                .extracting(SentryException::getType)
                .containsExactly("Boom");
        assertThat(sentSecond).isNotNull();
    }

    @Test
    void aMessageOnlyEventIsToldApartByItsText() {
        assertThat(filter.execute(messageOnly("Disk full"), new Hint())).isNotNull();
        assertThat(filter.execute(messageOnly("Disk full"), new Hint())).isNull();
        assertThat(filter.execute(messageOnly("Queue stuck"), new Hint())).isNotNull();
    }

    private static SentryEvent messageOnly(String text) {
        SentryEvent event = new SentryEvent();
        Message message = new Message();
        message.setMessage(text);
        message.setFormatted(text);
        event.setMessage(message);
        event.setLogger("com.buddychat.stats.StatsReport");
        return event;
    }
}
