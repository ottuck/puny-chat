package com.buddychat.notification;

import static com.buddychat.TestJwtConfiguration.token;
import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.FlowTest;
import com.buddychat.TestSocket;
import com.buddychat.chat.ChatService;
import com.buddychat.chat.Message;
import com.buddychat.room.Invitation;
import com.buddychat.room.Room;
import com.buddychat.user.User;
import java.net.URI;
import java.security.GeneralSecurityException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@FlowTest
public class NotificationFlowTest {

    static final String YUKI_PHONE = "ExponentPushToken[yuki-phone]";
    static final String HENRY_PHONE = "ExponentPushToken[henry-phone]";

    /** Records what would have gone to Expo; tokens can be marked as rejected. */
    public static class FakeSender implements PushSender {
        public final List<PushMessage> sent = new CopyOnWriteArrayList<>();
        final Set<String> rejectedNow = ConcurrentHashMap.newKeySet();
        final Set<String> rejectedLater = ConcurrentHashMap.newKeySet();

        @Override
        public Mono<Sent> send(List<PushMessage> messages) {
            sent.addAll(messages);
            List<String> invalid = new ArrayList<>();
            Map<String, String> pending = new ConcurrentHashMap<>();
            for (PushMessage message : messages) {
                if (rejectedNow.contains(message.to())) invalid.add(message.to());
                else pending.put("receipt-" + message.to(), message.to());
            }
            return Mono.just(new Sent(invalid, pending));
        }

        @Override
        public Mono<List<String>> invalidTokens(Map<String, String> pending) {
            return Mono.just(
                    pending.values().stream().filter(rejectedLater::contains).toList());
        }
    }

    /** Records what would have gone to browsers' push services; endpoints can be marked as gone. */
    public static class FakeWebPush extends WebPush {
        final List<String> sentTo = new CopyOnWriteArrayList<>();
        public final List<String> payloads = new CopyOnWriteArrayList<>();
        final Set<String> gone = ConcurrentHashMap.newKeySet();

        FakeWebPush(NotificationProperties properties, Clock clock) throws GeneralSecurityException {
            super(properties, clock);
        }

        @Override
        Mono<Boolean> send(PushToken subscription, String payloadJson) {
            sentTo.add(subscription.token());
            payloads.add(payloadJson);
            return Mono.just(gone.contains(subscription.token()));
        }
    }

    // Imported by FlowTest. Not @TestConfiguration: Boot would then pick it up for this class alone,
    // and a class with its own configuration gets its own context.
    public static class FakePush {
        @Bean
        @Primary
        FakeSender fakeSender() {
            return new FakeSender();
        }

        @Bean
        @Primary
        FakeWebPush fakeWebPush(NotificationProperties properties, Clock clock) throws GeneralSecurityException {
            return new FakeWebPush(properties, clock);
        }
    }

    static final String YUKI_BROWSER = "https://fcm.googleapis.com/fcm/send/yuki-browser";

    @LocalServerPort
    int port;

    @Autowired
    JsonMapper json;

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    FakeSender push;

    @Autowired
    FakeWebPush webPush;

    @Autowired
    NotificationService notifications;

    @Autowired
    ChatService chatService;

    private final List<TestSocket> sockets = new ArrayList<>();
    private WebTestClient http;

    @BeforeEach
    void setUp() {
        Flux.just(Room.class, Invitation.class, User.class, Message.class, PushToken.class)
                .flatMap(type -> mongo.remove(new Query(), type))
                .then(mongo.remove(new Query(), "reads"))
                .block();
        push.sent.clear();
        webPush.sentTo.clear();
        webPush.payloads.clear();
        webPush.gone.clear();
        push.rejectedNow.clear();
        push.rejectedLater.clear();
        http = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @AfterEach
    void closeSockets() {
        sockets.forEach(TestSocket::close);
    }

    @Test
    void notifiesABrowserAndForgetsOneThatIsGone() {
        duoRoom("henry", "yuki");
        registerBrowser("yuki", YUKI_BROWSER);
        TestSocket henry = connect("henry");

        sendText(henry, "웹으로도 와?");
        await(() -> !webPush.sentTo.isEmpty());
        assertThat(webPush.sentTo).containsExactly(YUKI_BROWSER);
        assertThat(webPush.payloads.getFirst()).contains("henry").contains("웹으로도 와?");

        webPush.gone.add(YUKI_BROWSER); // yuki turned notifications off in the browser
        sendText(henry, "안 오네");
        await(() -> mongo.findById(YUKI_BROWSER, PushToken.class).block() == null);
    }

    @Test
    void onlyKnownPushServicesAreAccepted() {
        createRoom("yuki");
        post("yuki", "/api/me/web-push", Map.of("endpoint", "https://attacker.example/x", "p256dh", "k", "auth", "a"))
                .expectStatus()
                .isBadRequest();
        JsonNode key = http.get()
                .uri("/api/me/web-push/key")
                .header("Authorization", "Bearer " + token("yuki"))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody();
        assertThat(java.util.Base64.getUrlDecoder().decode(key.get("publicKey").asString()))
                .hasSize(65);
    }

    @Test
    void notifiesAPartnerWhoIsNotInTheChat() {
        duoRoom("henry", "yuki");
        register("yuki", YUKI_PHONE);
        register("henry", HENRY_PHONE);

        sendText(connect("henry"), "퇴근했어?");

        PushMessage notification = awaitPush();
        assertThat(notification.to()).isEqualTo(YUKI_PHONE); // not the sender's own phone
        assertThat(notification.title()).isEqualTo("henry");
        assertThat(notification.body()).isEqualTo("퇴근했어?");
        assertThat(push.sent).hasSize(1);
    }

    @Test
    void doesNotNotifyAPartnerWhoReadItInTime() {
        duoRoom("henry", "yuki");
        register("yuki", YUKI_PHONE);
        TestSocket henry = connect("henry");
        TestSocket yuki = connect("yuki");

        sendText(henry, "hi");
        String id = yuki.expect("message").get("message").get("id").asString();
        yuki.send(Map.of("type", "read", "messageId", id)); // what the app does while the chat is open

        assertNoPushWithin(Duration.ofMillis(1500));
    }

    @Test
    void notifiesAPartnerWhoIsConnectedButNotReading() {
        // E.g. an iPhone app suspended in the background before its socket was closed.
        duoRoom("henry", "yuki");
        register("yuki", YUKI_PHONE);
        TestSocket henry = connect("henry");
        connect("yuki");

        sendText(henry, "hi");

        assertThat(awaitPush().to()).isEqualTo(YUKI_PHONE);
    }

    @Test
    void tellsTheInviterWhenTheFriendComesIn() {
        createRoom("henry");
        register("henry", HENRY_PHONE);
        register("yuki", YUKI_PHONE);

        join("henry", "yuki");

        PushMessage notice = awaitPush();
        assertThat(notice.to()).isEqualTo(HENRY_PHONE); // not the one who came in
        assertThat(notice.body()).isEqualTo("yuki joined! Now you two raise your buddy together.");
        sleep(500);
        assertThat(push.sent).hasSize(1);
    }

    @Test
    void doesNotTellAnInviterWhoSawTheFriendComeIn() {
        createRoom("henry");
        register("henry", HENRY_PHONE);
        TestSocket henry = connect("henry");

        join("henry", "yuki");
        JsonNode note = henry.expect("message").get("message");
        assertThat(note.get("systemEvent").asString()).isEqualTo("MEMBER_JOINED");
        henry.send(Map.of("type", "read", "messageId", note.get("id").asString()));

        assertNoPushWithin(Duration.ofMillis(1500));
    }

    @Test
    void theJoinNoticeIsInTheDevicesLanguage() {
        assertThat(NotificationService.joinedNotice("ko", "유키").body()).isEqualTo("유키님이 들어왔어요! 이제 둘이 함께 버디를 키워요.");
        assertThat(NotificationService.joinedNotice("ja", null).body()).startsWith("友だちが");
    }

    @Test
    void buddyEventsAreNotPushed() {
        duoRoom("henry", "yuki");
        register("yuki", YUKI_PHONE);
        User henry = user("henry");
        Message fed = new Message(
                new ObjectId().toHexString(),
                henry.roomId(),
                null,
                Message.Type.BUDDY_EVENT,
                null,
                "FED",
                null,
                henry.id(),
                "buddy:FED:1",
                Instant.now(),
                null);

        notifications.onNewMessage(fed, henry);

        assertNoPushWithin(Duration.ofMillis(1500));
    }

    @Test
    void aTokenBelongsToWhoeverRegisteredItLast() {
        duoRoom("henry", "yuki");
        register("henry", YUKI_PHONE); // yuki's phone, signed in as henry now
        register("yuki", YUKI_PHONE);

        sendText(connect("henry"), "hi");

        assertThat(awaitPush().to()).isEqualTo(YUKI_PHONE);
        assertThat(mongo.findById(YUKI_PHONE, PushToken.class).block().userId())
                .isEqualTo(user("yuki").id());
    }

    @Test
    void rejectsSomethingThatIsNotAnExpoToken() {
        createRoom("yuki");
        post("yuki", "/api/me/push-tokens", Map.of("token", "not-a-token"))
                .expectStatus()
                .isBadRequest();
        post("yuki", "/api/me/push-tokens", Map.of()).expectStatus().isBadRequest();
    }

    @Test
    void onlyTheOwnerCanRemoveAToken() {
        createRoom("yuki");
        register("yuki", YUKI_PHONE);

        delete("henry", YUKI_PHONE).expectStatus().isNoContent();
        assertThat(mongo.findById(YUKI_PHONE, PushToken.class).block()).isNotNull();

        delete("yuki", YUKI_PHONE).expectStatus().isNoContent();
        assertThat(mongo.findById(YUKI_PHONE, PushToken.class).block()).isNull();
    }

    @Test
    void forgetsATokenTheServiceRejectsRightAway() {
        duoRoom("henry", "yuki");
        register("yuki", YUKI_PHONE);
        push.rejectedNow.add(YUKI_PHONE);

        sendText(connect("henry"), "hi");

        awaitPush();
        awaitGone(YUKI_PHONE);
    }

    @Test
    void forgetsATokenWhoseReceiptSaysItIsGone() {
        duoRoom("henry", "yuki");
        register("yuki", YUKI_PHONE);
        push.rejectedLater.add(YUKI_PHONE);

        sendText(connect("henry"), "hi");

        awaitPush();
        awaitGone(YUKI_PHONE);
    }

    // --- helpers ---

    private void registerBrowser(String uid, String endpoint) {
        post(uid, "/api/me/web-push", Map.of("endpoint", endpoint, "p256dh", "BPk", "auth", "au"))
                .expectStatus()
                .isNoContent();
    }

    private static void await(java.util.function.BooleanSupplier done) {
        for (int i = 0; i < 60 && !done.getAsBoolean(); i++) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        assertThat(done.getAsBoolean()).isTrue();
    }

    private User user(String uid) {
        return mongo.findOne(Query.query(Criteria.where("firebaseUid").is(uid)), User.class)
                .block();
    }

    private PushMessage awaitPush() {
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while (push.sent.isEmpty() && System.nanoTime() < deadline) sleep(50);
        assertThat(push.sent).as("a push notification").isNotEmpty();
        return push.sent.getFirst();
    }

    private void assertNoPushWithin(Duration wait) {
        sleep(wait.toMillis());
        assertThat(push.sent).isEmpty();
    }

    private void awaitGone(String token) {
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while (mongo.findById(token, PushToken.class).block() != null && System.nanoTime() < deadline) sleep(50);
        assertThat(mongo.findById(token, PushToken.class).block()).isNull();
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }

    private TestSocket connect(String uid) {
        TestSocket socket = new TestSocket(URI.create("ws://localhost:" + port + "/ws"), json)
                .ignoring("buddy", "presence", "read");
        sockets.add(socket);
        socket.expect("hello");
        socket.send(Map.of("type", "auth", "token", token(uid))).expect("ready");
        return socket;
    }

    private static void sendText(TestSocket socket, String text) {
        socket.send(Map.of("type", "send", "clientMessageId", "c-" + text.hashCode(), "text", text))
                .expect("ack");
    }

    private void register(String uid, String pushToken) {
        post(uid, "/api/me/push-tokens", Map.of("token", pushToken))
                .expectStatus()
                .isNoContent();
    }

    private void createRoom(String uid) {
        post(uid, "/api/rooms", Map.of("buddyName", "Mugi")).expectStatus().isCreated();
    }

    // The owner was looking at the chat when the friend came in: the join note is read, not pushed.
    private void duoRoom(String owner, String friend) {
        createRoom(owner);
        join(owner, friend);
        Message note = mongo.findOne(Query.query(Criteria.where("systemEvent").is("MEMBER_JOINED")), Message.class)
                .block();
        chatService.markRead(user(owner), note.id()).block();
    }

    private void join(String owner, String friend) {
        String code = post(owner, "/api/rooms/me/invitations", Map.of())
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("code")
                .asString();
        post(friend, "/api/invitations/" + code + "/accept", Map.of())
                .expectStatus()
                .isOk();
    }

    private WebTestClient.ResponseSpec post(String uid, String path, Object body) {
        return http.post()
                .uri(path)
                .header("Authorization", "Bearer " + token(uid))
                .bodyValue(body)
                .exchange();
    }

    private WebTestClient.ResponseSpec delete(String uid, String pushToken) {
        return http.delete()
                .uri("/api/me/push-tokens/{token}", pushToken)
                .header("Authorization", "Bearer " + token(uid))
                .exchange();
    }
}
