package com.buddychat.support;

import static com.buddychat.TestJwtConfiguration.token;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.MutableClock;
import com.buddychat.TestJwtConfiguration;
import com.buddychat.TestSocket;
import com.buddychat.TestcontainersConfiguration;
import com.buddychat.chat.ChatService;
import com.buddychat.chat.Message;
import com.buddychat.common.ApiException;
import com.buddychat.room.Invitation;
import com.buddychat.room.Room;
import com.buddychat.room.RoomService;
import com.buddychat.user.User;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({
    TestcontainersConfiguration.class,
    TestJwtConfiguration.class,
    MutableClock.Config.class,
    SupportFlowTest.MailConfig.class
})
class SupportFlowTest {
    @LocalServerPort
    int port;

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    JsonMapper json;

    @Autowired
    ChatService chat;

    @Autowired
    RoomService rooms;

    @Autowired
    SupportService support;

    @Autowired
    SupportMail mail;

    @Autowired
    RecordingMail sender;

    @Autowired
    MutableClock clock;

    private WebTestClient http;
    private final List<TestSocket> sockets = new ArrayList<>();

    @TestConfiguration(proxyBeanMethods = false)
    static class MailConfig {
        @Bean
        @Primary
        RecordingMail recordingMail() {
            return new RecordingMail();
        }
    }

    static class RecordingMail extends JavaMailSenderImpl {
        final List<SimpleMailMessage> sent = new CopyOnWriteArrayList<>();
        volatile boolean fail;

        @Override
        public void send(SimpleMailMessage... messages) {
            assertThat(Thread.currentThread().getName()).contains("boundedElastic");
            if (fail) throw new MailSendException("simulated outage");
            for (var message : messages) sent.add(new SimpleMailMessage(message));
        }
    }

    @BeforeEach
    void setUp() {
        clock.reset();
        Flux.just(Room.class, Invitation.class, User.class, Message.class, SupportTicket.class)
                .flatMap(type -> mongo.remove(new Query(), type))
                .then(mongo.remove(new Query(), "reads"))
                .block();
        sender.sent.clear();
        sender.fail = false;
        http = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @AfterEach
    void closeSockets() {
        sockets.forEach(TestSocket::close);
    }

    @Test
    void reportingKeepsBuddyButDeletesBothSidesOfConversationAndEveryOldInvitation() {
        create("henry");
        String unused = invite("henry");
        String used = invite("henry");
        post("yuki", "/api/invitations/" + used + "/accept", Map.of())
                .expectStatus()
                .isOk();
        Room original = mongo.findById(user("henry").roomId(), Room.class).block();
        User staleYuki = user("yuki");
        Message first = chat.send(user("henry"), "mine", "hello").block().message();
        chat.send(staleYuki, "theirs", "problem text").block();
        chat.markRead(staleYuki, first.id()).block();
        TestSocket henry = connect("henry"), yuki = connect("yuki");
        String id = UUID.randomUUID().toString();
        var body = removal(id, original.id(), staleYuki.id(), true);
        post("henry", "/api/rooms/me/partner-removal", body).expectStatus().isCreated();

        Room remaining = mongo.findById(user("henry").roomId(), Room.class).block();
        assertThat(remaining.id()).isNotEqualTo(original.id());
        assertThat(remaining.buddy()).isEqualTo(original.buddy());
        assertThat(remaining.album()).isEqualTo(original.album());
        assertThat(remaining.memberIds()).containsExactly(user("henry").id());
        assertThat(user("yuki").roomId()).isNull();
        assertThat(mongo.findById(original.id(), Room.class).block()).isNull();
        assertThat(mongo.count(query(where("roomId").is(original.id())), Message.class)
                        .block())
                .isZero();
        assertThat(mongo.count(query(where("roomId").is(original.id())), "reads")
                        .block())
                .isZero();
        SupportTicket ticket = mongo.findById(id, SupportTicket.class).block();
        assertThat(ticket.evidence()).extracting(Message::text).containsExactly("hello", "problem text");
        assertThat(ticket.roomSnapshot()).isNull();
        assertThat(ticket.completedAt()).isNotNull();
        assertThat(ticket.expiresAt()).isEqualTo(ticket.createdAt().plus(Duration.ofDays(90)));
        assertThat(yuki.expect("error").get("code").asString()).isEqualTo("ROOM_NOT_FOUND");
        assertThat(yuki.awaitClosed()).isTrue();
        assertThat(henry.expect("error").get("code").asString()).isEqualTo("ROOM_NOT_FOUND");
        assertThat(henry.awaitClosed()).isTrue();
        get("yuki", "/api/rooms/me/messages").expectStatus().isNotFound();
        assertThatThrownBy(() ->
                        chat.send(staleYuki, "after-removal", "not allowed").block())
                .isInstanceOf(ApiException.class);
        for (String code : List.of(used, unused)) {
            post("yuki", "/api/invitations/" + code + "/accept", Map.of())
                    .expectStatus()
                    .isNotFound();
            post("stranger", "/api/invitations/" + code + "/accept", Map.of())
                    .expectStatus()
                    .isNotFound();
        }
        // Lost-response retries do not create another room, report, or notification.
        post("henry", "/api/rooms/me/partner-removal", body).expectStatus().isCreated();
        assertThat(mongo.count(new Query(), SupportTicket.class).block()).isEqualTo(1);
        assertThat(user("henry").roomId()).isEqualTo(remaining.id());
        mail.drain().block();
        mail.drain().block();
        assertThat(sender.sent).hasSize(1);
        assertThat(sender.sent.getFirst().getTo()).containsExactly("vison901@gmail.com");
        assertThat(sender.sent.getFirst().getReplyTo()).isEqualTo("reply@example.com");
        assertThat(sender.sent.getFirst().getText()).contains("problem text", "hello", id);
        // There is no account ban: both people can start a new invited relationship.
        create("yuki");
        post("mika", "/api/invitations/" + invite("henry") + "/accept", Map.of())
                .expectStatus()
                .isOk();
        get("mika", "/api/support/" + id).expectStatus().isNotFound();
    }

    @Test
    void removingWithoutReportingKeepsNoConversationCopyAndSendsNoMail() {
        Room room = duo();
        chat.send(user("yuki"), "old", "not a report").block();
        String id = UUID.randomUUID().toString();
        post(
                        "henry",
                        "/api/rooms/me/partner-removal",
                        removal(id, room.id(), user("yuki").id(), false))
                .expectStatus()
                .isCreated();
        SupportTicket ticket = mongo.findById(id, SupportTicket.class).block();
        assertThat(ticket.evidence()).isEmpty();
        assertThat(ticket.emailStatus()).isEqualTo("NONE");
        assertThat(mail.drain().block()).isZero();
        assertThat(sender.sent).isEmpty();
    }

    @Test
    void cannotReportOrRemoveFromAnotherRoomOrRemoveYourself() {
        Room room = duo();
        String target = user("yuki").id();
        post(
                        "outsider",
                        "/api/rooms/me/partner-removal",
                        removal(UUID.randomUUID().toString(), room.id(), target, true))
                .expectStatus()
                .isEqualTo(409);
        post(
                        "henry",
                        "/api/rooms/me/partner-removal",
                        removal(
                                UUID.randomUUID().toString(),
                                room.id(),
                                user("henry").id(),
                                true))
                .expectStatus()
                .isEqualTo(409);
        assertThat(mongo.count(new Query(), SupportTicket.class).block()).isZero();
        assertThat(mongo.findById(room.id(), Room.class).block().memberCount()).isEqualTo(2);
    }

    @Test
    void aMailFailureKeepsTheInquiryForRetryAndNeverRepliesToTheUser() {
        String id = UUID.randomUUID().toString();
        var body = Map.of("requestId", id, "description", "question", "replyEmail", "reply@example.com");
        post("henry", "/api/support/inquiries", body).expectStatus().isCreated();
        post("henry", "/api/support/inquiries", body).expectStatus().isCreated();
        sender.fail = true;
        mail.drain().block();
        assertThat(mongo.findById(id, SupportTicket.class).block().emailStatus())
                .isEqualTo("PENDING");
        assertThat(sender.sent).isEmpty();
        sender.fail = false;
        clock.advance(Duration.ofMinutes(3));
        mail.drain().block();
        assertThat(sender.sent).hasSize(1);
        assertThat(sender.sent.getFirst().getTo()).containsExactly("vison901@gmail.com");
        assertThat(mongo.findById(id, SupportTicket.class).block().emailStatus())
                .isEqualTo("SENT");
        assertThat(mail.drain().block()).isZero();
    }

    @Test
    void inquiryLimitDoesNotPreventEndingAnUnwantedConversation() {
        Room room = duo();
        for (int i = 0; i < 5; i++)
            post(
                            "henry",
                            "/api/support/inquiries",
                            Map.of("requestId", UUID.randomUUID().toString(), "description", "question"))
                    .expectStatus()
                    .isCreated();
        post(
                        "henry",
                        "/api/support/inquiries",
                        Map.of("requestId", UUID.randomUUID().toString(), "description", "question"))
                .expectStatus()
                .isEqualTo(429);
        post(
                        "henry",
                        "/api/rooms/me/partner-removal",
                        removal(
                                UUID.randomUUID().toString(),
                                room.id(),
                                user("yuki").id(),
                                true))
                .expectStatus()
                .isCreated();
    }

    @Test
    void twoPeopleReportingAtOnceCannotDuplicateTheBuddy() {
        Room room = duo();
        var bodies = Map.of(
                "henry",
                removal(UUID.randomUUID().toString(), room.id(), user("yuki").id(), true),
                "yuki",
                removal(UUID.randomUUID().toString(), room.id(), user("henry").id(), true));
        List<Integer> statuses = Flux.just("henry", "yuki")
                .parallel(2)
                .runOn(Schedulers.boundedElastic())
                .map(uid -> post(uid, "/api/rooms/me/partner-removal", bodies.get(uid))
                        .returnResult(Void.class)
                        .getStatus()
                        .value())
                .sequential()
                .collectList()
                .block();
        assertThat(statuses).contains(201).allMatch(status -> status == 201 || status == 409 || status == 404);
        assertThat(mongo.count(new Query(), Room.class).block()).isEqualTo(1);
        assertThat(List.of(user("henry"), user("yuki")).stream()
                        .filter(user -> user.roomId() != null)
                        .count())
                .isEqualTo(1);
    }

    @Test
    void aRestartAfterClosureResumesFromTheStoredTicket() {
        Room room = duo();
        User owner = user("henry"), target = user("yuki");
        String id = UUID.randomUUID().toString();
        Room locked = rooms.claimRemoval(id, room, owner.id()).block();
        var now = clock.instant().minusSeconds(40);
        mongo.insert(new SupportTicket(
                        id,
                        SupportTicket.Kind.REPORT,
                        owner.id(),
                        owner.displayName(),
                        null,
                        SupportTicket.Reason.OTHER,
                        "restart",
                        room.id(),
                        locked,
                        target.id(),
                        target.displayName(),
                        new ObjectId().toHexString(),
                        List.of(),
                        now,
                        now.plus(SupportService.RETENTION),
                        null,
                        true,
                        "PENDING",
                        0,
                        now))
                .block();
        assertThat(support.resume().block()).isEqualTo(1);
        assertThat(user("yuki").roomId()).isNull();
        assertThat(mongo.findById(user("henry").roomId(), Room.class).block().buddy())
                .isEqualTo(room.buddy());
        assertThat(mongo.findById(id, SupportTicket.class).block().completedAt())
                .isNotNull();
    }

    @Test
    void emailHeaderInjectionAndOversizedDescriptionsAreRejected() {
        post(
                        "henry",
                        "/api/support/inquiries",
                        Map.of(
                                "requestId",
                                UUID.randomUUID().toString(),
                                "description",
                                "question",
                                "replyEmail",
                                "a@example.com\r\nBcc: attacker@example.com"))
                .expectStatus()
                .isBadRequest();
        post(
                        "henry",
                        "/api/support/inquiries",
                        Map.of("requestId", UUID.randomUUID().toString(), "description", "x".repeat(4001)))
                .expectStatus()
                .isBadRequest();
        assertThat(mongo.count(new Query(), SupportTicket.class).block()).isZero();
    }

    private Room duo() {
        create("henry");
        post("yuki", "/api/invitations/" + invite("henry") + "/accept", Map.of())
                .expectStatus()
                .isOk();
        return mongo.findById(user("henry").roomId(), Room.class).block();
    }

    private void create(String uid) {
        post(uid, "/api/rooms", Map.of("buddyName", "Mugi")).expectStatus().isCreated();
    }

    private String invite(String uid) {
        return post(uid, "/api/rooms/me/invitations", Map.of())
                .expectStatus()
                .isCreated()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("code")
                .asString();
    }

    private User user(String uid) {
        return mongo.findOne(query(where("firebaseUid").is(uid)), User.class).block();
    }

    private Map<String, Object> removal(String id, String roomId, String targetId, boolean report) {
        return Map.of(
                "requestId",
                id,
                "roomId",
                roomId,
                "targetId",
                targetId,
                "report",
                report,
                "reason",
                "HARASSMENT",
                "description",
                "please review",
                "replyEmail",
                "reply@example.com");
    }

    private TestSocket connect(String uid) {
        TestSocket socket = new TestSocket(URI.create("ws://localhost:" + port + "/ws"), json)
                .ignoring("buddy", "presence", "message", "read", "typing");
        sockets.add(socket);
        socket.expect("hello");
        socket.send(Map.of("type", "auth", "token", token(uid))).expect("ready");
        return socket;
    }

    private WebTestClient.ResponseSpec post(String uid, String path, Object body) {
        return http.post()
                .uri(path)
                .header("Authorization", "Bearer " + token(uid))
                .bodyValue(body)
                .exchange();
    }

    private WebTestClient.ResponseSpec get(String uid, String path) {
        return http.get()
                .uri(path)
                .header("Authorization", "Bearer " + token(uid))
                .exchange();
    }
}
