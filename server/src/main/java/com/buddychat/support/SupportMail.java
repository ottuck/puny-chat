package com.buddychat.support;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.chat.Message;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/** Durable mail notification to the operator only. Mail never runs on the WebFlux event loop. */
@Service
class SupportMail {
    private static final Logger log = LoggerFactory.getLogger(SupportMail.class);
    private final ReactiveMongoTemplate mongo;
    private final JavaMailSender sender;
    private final Clock clock;
    private final String recipient;
    private final String from;
    private final boolean configured;

    SupportMail(
            ReactiveMongoTemplate mongo,
            JavaMailSender sender,
            Clock clock,
            @Value("${buddychat.support.email}") String recipient,
            @Value("${buddychat.support.from}") String from,
            GmailMailSender gmail) {
        this.mongo = mongo;
        this.sender = sender;
        this.clock = clock;
        this.recipient = recipient;
        this.from = from;
        this.configured = gmail.configured() && !recipient.isBlank() && !from.isBlank();
    }

    @Scheduled(fixedDelay = 60000, initialDelay = 10000)
    void notifyOperator() {
        if (!configured) return;
        drain().subscribe(count -> {}, e -> log.warn("Support mail queue will retry", e));
    }

    Mono<Long> drain() {
        // Each atomic lease lasts longer than the bounded HTTP timeouts and survives a restart.
        return Flux.range(0, 10)
                .concatMap(ignored -> claim().flatMap(ticket -> Mono.fromRunnable(() -> sender.send(message(ticket)))
                        .subscribeOn(Schedulers.boundedElastic())
                        .then(mongo.updateFirst(
                                query(where("_id").is(ticket.id())),
                                new Update().set("emailStatus", "SENT").set("emailSentAt", Instant.now(clock)),
                                SupportTicket.class))
                        .onErrorResume(error -> {
                            log.warn(
                                    "Support notification {} failed ({}); retained for retry",
                                    ticket.id(),
                                    error.getClass().getSimpleName());
                            long minutes = Math.min(60, 1L << Math.min(ticket.emailAttempts(), 6));
                            return mongo.updateFirst(
                                    query(where("_id").is(ticket.id())),
                                    new Update()
                                            .set(
                                                    "nextEmailAttemptAt",
                                                    Instant.now(clock).plus(Duration.ofMinutes(minutes))),
                                    SupportTicket.class);
                        })))
                .count();
    }

    private Mono<SupportTicket> claim() {
        Instant now = Instant.now(clock);
        return mongo.findAndModify(
                query(where("emailStatus")
                        .is("PENDING")
                        .and("completedAt")
                        .ne(null)
                        .and("expiresAt")
                        .gt(now)
                        .and("nextEmailAttemptAt")
                        .lte(now)),
                new Update().inc("emailAttempts", 1).set("nextEmailAttemptAt", now.plus(Duration.ofMinutes(10))),
                FindAndModifyOptions.options().returnNew(true),
                SupportTicket.class);
    }

    SimpleMailMessage message(SupportTicket ticket) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("[puny-chat] " + ticket.kind() + " · " + ticket.id());
        StringBuilder body = new StringBuilder("접수 번호: ")
                .append(ticket.id())
                .append("\n접수 시각: ")
                .append(ticket.createdAt())
                .append("\n작성자: ")
                .append(ticket.reporterName())
                .append(" (")
                .append(ticket.reporterId())
                .append(")")
                .append("\n유형: ")
                .append(ticket.kind())
                .append("\n사유: ")
                .append(ticket.reason())
                .append("\n대상: ")
                .append(ticket.targetName())
                .append(" (")
                .append(ticket.targetId())
                .append(")")
                .append("\n\n내용:\n")
                .append(ticket.description());
        if (ticket.kind() == SupportTicket.Kind.REPORT) {
            body.append("\n\n자동 조치: 상대 퇴장, 기존 초대 무효화, 대화 기록 삭제. 신고자는 Buddy 유지.")
                    .append("\n신고 자료: 삭제 전 최근 텍스트·사진 메시지 최대 50개(사진 파일은 대화와 함께 지워짐). 접수일로부터 90일 보관.\n");
            for (Message evidence : ticket.evidence()) {
                body.append("\n[")
                        .append(evidence.createdAt())
                        .append("] ")
                        .append(
                                evidence.senderId().equals(ticket.reporterId())
                                        ? ticket.reporterName()
                                        : ticket.targetName())
                        .append(": ")
                        .append(evidence.type() == Message.Type.PHOTO ? "[사진]" : evidence.text())
                        .append("\n");
            }
        }
        body.append("\n\n운영자 확인용 알림입니다. 문의·신고에 대한 개별 이메일 답장은 보내지 않습니다.");
        message.setText(body.toString());
        return message;
    }
}
