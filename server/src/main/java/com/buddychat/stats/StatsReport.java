package com.buddychat.stats;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Every Monday morning, last week's counts ({@link StatsService}) by mail to the operator, the same
 * mailbox as support mail. Without mail settings (local runs) the report only goes to the log.
 */
@Component
class StatsReport {

    private static final Logger log = LoggerFactory.getLogger(StatsReport.class);

    // How many weeks of joiners the comeback table goes back.
    static final int WEEKS = 6;

    static final List<Integer> COMEBACK_DAYS = List.of(1, 7, 30);

    private static final Map<String, String> STEP_NAMES = Map.of(
            "welcome", "첫 화면",
            "demo", "구경하기",
            "start", "시작하기",
            "name", "이름",
            "wake", "버디 깨우기");

    private static final DateTimeFormatter SHORT = DateTimeFormatter.ofPattern("M/d");

    private final StatsService stats;
    private final JavaMailSender sender;
    private final Clock clock;
    private final String recipient;
    private final String from;

    StatsReport(
            StatsService stats,
            JavaMailSender sender,
            Clock clock,
            @Value("${buddychat.support.email}") String recipient,
            @Value("${buddychat.support.from}") String from) {
        this.stats = stats;
        this.sender = sender;
        this.clock = clock;
        this.recipient = recipient;
        this.from = from;
    }

    // Monday 09:00 in Japan, so the week before is complete.
    @Scheduled(cron = "0 0 9 * * MON", zone = "Asia/Tokyo")
    void weekly() {
        build(StatsService.day(Instant.now(clock)))
                .flatMap(this::send)
                .subscribe(ignored -> {}, e -> log.warn("Weekly stats report failed", e));
    }

    /** The report for the 7 days before {@code today}. */
    Mono<String> build(LocalDate today) {
        Set<String> ids = new HashSet<>(StatsService.stepIds(today.minusDays(7), today));
        ids.addAll(StatsService.joinedIds(today.minusWeeks(WEEKS), today));
        return stats.find(ids).collectMap(doc -> doc.getString("_id")).map(docs -> text(today, docs));
    }

    private Mono<Void> send(String text) {
        if (recipient.isBlank() || from.isBlank()) {
            log.info("Weekly stats (no mail settings):\n{}", text);
            return Mono.empty();
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("[puny-chat] 지난주 이용 통계");
        message.setText(text);
        return Mono.<Void>fromRunnable(() -> sender.send(message))
                .subscribeOn(Schedulers.boundedElastic())
                .doOnError(e -> log.info("Weekly stats (mail failed):\n{}", text));
    }

    static String text(LocalDate today, Map<String, Document> docs) {
        LocalDate first = today.minusDays(7);
        StringBuilder out = new StringBuilder();
        out.append("puny-chat 지난주 이용 통계 (")
                .append(first.format(SHORT))
                .append(" ~ ")
                .append(today.minusDays(1).format(SHORT))
                .append(", 일본 시간)\n\n");

        out.append("시작 흐름: 그 단계에 처음 온 기기 수 (iOS / 웹 / 안드로이드)\n");
        for (String step : StatsService.STEPS) {
            out.append("  ").append(STEP_NAMES.get(step)).append(": ");
            for (int i = 0; i < StatsService.PLATFORMS.size(); i++) {
                String platform = StatsService.PLATFORMS.get(i);
                long sum = 0;
                for (LocalDate day = first; day.isBefore(today); day = day.plusDays(1)) {
                    Document doc = docs.get("steps:" + day);
                    Document counts = doc == null ? null : doc.get(platform, Document.class);
                    sum += counts == null ? 0 : number(counts, step);
                }
                out.append(i == 0 ? "" : " / ").append(sum);
            }
            out.append('\n');
        }

        out.append("\n재방문: 가입한 주별로, 가입하고 N일째 되는 날 다시 온 사람 수 (… 아직 그날이 안 됨)\n");
        boolean any = false;
        for (int week = WEEKS; week >= 1; week--) {
            LocalDate start = today.minusWeeks(week);
            LocalDate last = start.plusDays(6);
            long joined = 0;
            for (LocalDate day = start; !day.isAfter(last); day = day.plusDays(1)) {
                joined += number(docs.get("joined:" + day), "joined");
            }
            if (joined == 0) continue;
            any = true;
            out.append("  ")
                    .append(start.format(SHORT))
                    .append("~")
                    .append(last.format(SHORT))
                    .append(" 가입 ")
                    .append(joined);
            for (int n : COMEBACK_DAYS) {
                out.append(" · ").append(n).append("일째 ");
                // Only once every joiner of the week has had that day.
                if (last.plusDays(n).isBefore(today)) {
                    long back = 0;
                    for (LocalDate day = start; !day.isAfter(last); day = day.plusDays(1)) {
                        back += number(docs.get("joined:" + day), "d" + n);
                    }
                    out.append(back);
                } else {
                    out.append('…');
                }
            }
            out.append('\n');
        }
        if (!any) out.append("  (가입한 사람 없음)\n");
        return out.toString();
    }

    private static long number(Document doc, String field) {
        return doc != null && doc.get(field) instanceof Number n ? n.longValue() : 0;
    }
}
