package com.buddychat.notification;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.chat.ChatService;
import com.buddychat.chat.Message;
import com.buddychat.common.ApiException;
import com.buddychat.room.RoomService;
import com.buddychat.user.User;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.FindAndReplaceOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import tools.jackson.databind.json.JsonMapper;

/**
 * Push notifications for new messages and a friend joining (docs/PROJECT.md, 푸시). A recipient is
 * notified when the entry is still unread a moment after it was made: someone looking at the chat
 * marks it read within a second, while an app in the background, suspended without a clean
 * disconnect, or offline does not. Buddy events are never pushed (docs/PROJECT.md).
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final Pattern EXPO_TOKEN = Pattern.compile("^Expo(nent)?PushToken\\[[^\\]]{1,200}]$");
    private static final int MAX_BODY_LENGTH = 180;
    private static final Set<String> LANGUAGES = Set.of("ko", "ja", "en", "zh-Hant");

    /** A notice the server writes itself (not a message), in the device's language. */
    public record Notice(String title, String body) {}

    private final ReactiveMongoTemplate mongo;
    private final PushSender sender;
    private final WebPush webPush;
    private final JsonMapper json;
    private final RoomService roomService;
    private final ChatService chatService;
    private final NotificationProperties properties;
    private final Clock clock;

    NotificationService(
            ReactiveMongoTemplate mongo,
            PushSender sender,
            WebPush webPush,
            JsonMapper json,
            RoomService roomService,
            ChatService chatService,
            NotificationProperties properties,
            Clock clock) {
        this.mongo = mongo;
        this.sender = sender;
        this.webPush = webPush;
        this.json = json;
        this.roomService = roomService;
        this.chatService = chatService;
        this.properties = properties;
        this.clock = clock;
    }

    /** Remembers the device's token for the user, moving it from whoever had it before. */
    Mono<Void> register(User user, @Nullable String token, @Nullable String language) {
        if (token == null || !EXPO_TOKEN.matcher(token).matches()) {
            return Mono.error(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST"));
        }
        return mongo.findAndReplace(
                        query(where("_id").is(token)),
                        new PushToken(token, user.id(), Instant.now(clock), null, null, language(language)),
                        FindAndReplaceOptions.options().upsert())
                .then();
    }

    /** Remembers a browser's Web Push subscription for the user, as with an app's token. */
    Mono<Void> registerWeb(
            User user,
            @Nullable String endpoint,
            @Nullable String p256dh,
            @Nullable String auth,
            @Nullable String language) {
        if (endpoint == null || p256dh == null || auth == null || !WebPush.isPushService(endpoint)) {
            return Mono.error(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST"));
        }
        return mongo.findAndReplace(
                        query(where("_id").is(endpoint)),
                        new PushToken(endpoint, user.id(), Instant.now(clock), p256dh, auth, language(language)),
                        FindAndReplaceOptions.options().upsert())
                .then();
    }

    String webPushKey() {
        return webPush.publicKey();
    }

    /** Forgets the token, e.g. on sign-out. Only the user it belongs to can remove it. */
    Mono<Void> unregister(User user, String token) {
        return mongo.remove(query(where("_id").is(token).and("userId").is(user.id())), PushToken.class)
                .then();
    }

    /**
     * Sends a notice to all of the user's devices, each written for its language (null when the
     * device has not said). A failure only means a missed notice.
     */
    public Mono<Void> notify(String userId, Function<@Nullable String, Notice> write) {
        return mongo.find(query(where("userId").is(userId)), PushToken.class)
                .collectList()
                .flatMap(tokens -> {
                    List<PushToken> apps =
                            tokens.stream().filter(token -> !token.isWeb()).toList();
                    Mono<Void> toApps = apps.isEmpty()
                            ? Mono.empty()
                            : sender.send(apps.stream()
                                            .map(token -> {
                                                Notice notice = write.apply(token.language());
                                                return new PushMessage(
                                                        token.token(),
                                                        notice.title(),
                                                        notice.body(),
                                                        "default",
                                                        Map.of());
                                            })
                                            .toList())
                                    .flatMap(sent -> {
                                        checkReceiptsLater(sent.pending());
                                        return forget(sent.invalidTokens());
                                    });
                    Mono<Void> toBrowsers = Flux.fromIterable(tokens)
                            .filter(PushToken::isWeb)
                            .flatMap(subscription -> {
                                Notice notice = write.apply(subscription.language());
                                String payload = json.writeValueAsString(
                                        Map.of("title", notice.title(), "body", notice.body(), "url", "/"));
                                return webPush.send(subscription, payload)
                                        .filter(gone -> gone)
                                        .map(gone -> subscription.token());
                            })
                            .collectList()
                            .flatMap(this::forget);
                    return Mono.when(toApps, toBrowsers);
                })
                .onErrorResume(e -> {
                    log.warn("Could not send a notice: {}", e.toString());
                    return Mono.empty();
                });
    }

    private static @Nullable String language(@Nullable String language) {
        return language != null && LANGUAGES.contains(language) ? language : null;
    }

    /** Forgets all of the user's devices (account deletion). */
    public Mono<Void> forget(String userId) {
        return mongo.remove(query(where("userId").is(userId)), PushToken.class).then();
    }

    /**
     * After the grace period, notifies the room's other members who have not read the message. Runs
     * on its own: the caller does not wait, and a failure only means a missed notification.
     */
    public void onNewMessage(Message message, User from) {
        String messageId = message.id();
        boolean text = message.type() == Message.Type.TEXT && message.text() != null;
        if (!(text || message.type() == Message.Type.PHOTO) || messageId == null) return;
        unreadLater(message.roomId(), messageId, from.id())
                .flatMap(unread -> mongo.find(query(where("userId").in(unread)), PushToken.class)
                        .collectList())
                .flatMap(tokens -> Mono.when(
                        sendToApps(
                                tokens.stream().filter(token -> !token.isWeb()).toList(), message, from),
                        sendToBrowsers(tokens.stream().filter(PushToken::isWeb).toList(), message, from)))
                .subscribe(null, e -> log.warn("Could not send push notifications: {}", e.toString()));
    }

    /**
     * A friend came in with an invite (MEMBER_JOINED): the one who invited them is told, unless they
     * are looking at the chat and see it there. Like a message, on its own after the grace period.
     */
    public void onMemberJoined(Message note, User joiner) {
        String noteId = note.id();
        if (noteId == null) return;
        unreadLater(note.roomId(), noteId, joiner.id())
                .flatMapMany(Flux::fromIterable)
                .flatMap(memberId -> notify(memberId, language -> joinedNotice(language, joiner.displayName())))
                .subscribe(null, e -> log.warn("Could not send the join notice: {}", e.toString()));
    }

    static Notice joinedNotice(@Nullable String language, @Nullable String name) {
        String body = switch (language == null ? "en" : language) {
            case "ko" -> (name != null ? name + "님이" : "친구가") + " 들어왔어요! 이제 둘이 함께 버디를 키워요.";
            case "ja" -> (name != null ? name + "さんが" : "友だちが") + "入ってきました！これからふたりでBuddyを育てましょう。";
            case "zh-Hant" -> (name != null ? name : "朋友") + " 加入了！現在兩個人一起養 Buddy 吧。";
            default -> (name != null ? name : "Your friend") + " joined! Now you two raise your buddy together.";
        };
        return new Notice("puny-chat", body);
    }

    // After the grace period, the room's members other than the actor who have not read up to the
    // entry. Empty when everyone has.
    private Mono<List<String>> unreadLater(String roomId, String entryId, String actorId) {
        return Mono.delay(properties.gracePeriod())
                .then(Mono.zip(roomService.memberIds(roomId), chatService.readMarks(roomId)))
                .map(roomState -> roomState.getT1().stream()
                        .filter(memberId -> !memberId.equals(actorId))
                        // Ids compare in timeline order (docs/PROJECT.md).
                        .filter(memberId ->
                                roomState.getT2().getOrDefault(memberId, "").compareTo(entryId) < 0)
                        .toList())
                .filter(unread -> !unread.isEmpty());
    }

    // A text as it is; a photo in the device's language.
    static String body(Message message, @Nullable String language) {
        if (message.type() != Message.Type.PHOTO && message.text() != null) return message.text();
        return switch (language == null ? "en" : language) {
            case "ko" -> "사진을 보냈어요";
            case "ja" -> "写真を送りました";
            case "zh-Hant" -> "傳了一張照片";
            default -> "Sent a photo";
        };
    }

    private Mono<Void> sendToApps(List<PushToken> tokens, Message message, User from) {
        if (tokens.isEmpty()) return Mono.empty();
        return sender.send(tokens.stream()
                        .map(token -> toPush(token.token(), message.roomId(), body(message, token.language()), from))
                        .toList())
                .flatMap(sent -> {
                    checkReceiptsLater(sent.pending());
                    return forget(sent.invalidTokens());
                });
    }

    // Same title and text as the app's; the service worker (app: public/sw.js) shows it.
    private Mono<Void> sendToBrowsers(List<PushToken> subscriptions, Message message, User from) {
        if (subscriptions.isEmpty()) return Mono.empty();
        return Flux.fromIterable(subscriptions)
                .flatMap(subscription -> {
                    PushMessage push = toPush("", message.roomId(), body(message, subscription.language()), from);
                    String payload =
                            json.writeValueAsString(Map.of("title", push.title(), "body", push.body(), "url", "/"));
                    return webPush.send(subscription, payload)
                            .filter(gone -> gone)
                            .map(gone -> subscription.token());
                })
                .collectList()
                .flatMap(this::forget);
    }

    private static PushMessage toPush(String token, String roomId, String text, User from) {
        String body = text.length() > MAX_BODY_LENGTH ? text.substring(0, MAX_BODY_LENGTH) + "…" : text;
        String title = from.displayName() != null ? from.displayName() : "puny-chat";
        return new PushMessage(token, title, body, "default", Map.of("roomId", roomId));
    }

    // Kept in memory, not scheduled: after a restart these are skipped, and a bad token shows up
    // again on its next send.
    private void checkReceiptsLater(Map<String, String> pending) {
        if (pending.isEmpty()) return;
        Mono.delay(properties.receiptDelay())
                .then(sender.invalidTokens(pending))
                .flatMap(this::forget)
                .subscribe(null, e -> log.warn("Could not check push receipts: {}", e.toString()));
    }

    // Tokens of uninstalled apps would fail every time.
    private Mono<Void> forget(List<String> invalid) {
        if (invalid.isEmpty()) return Mono.empty();
        return mongo.remove(query(where("_id").in(invalid)), PushToken.class).then();
    }
}
