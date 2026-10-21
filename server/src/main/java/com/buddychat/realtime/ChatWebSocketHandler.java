package com.buddychat.realtime;

import com.buddychat.buddy.BuddyService;
import com.buddychat.chat.ChatService;
import com.buddychat.common.ApiException;
import com.buddychat.room.RoomAccess;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.netty.channel.AbortedException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * {@code /ws}. Browsers cannot put headers on a WebSocket, so the Firebase ID token arrives as the
 * first message instead of in the URL (where it would end up in logs). The server speaks first
 * ({@code hello}) once it is reading: a frame the client sends straight after the upgrade can
 * otherwise be dropped before this handler subscribes (seen on Linux/epoll).
 *
 * <p>Events from one connection are handled one at a time ({@code concatMap}), so a sender's
 * messages are stored in the order they were sent.
 */
@Component
class ChatWebSocketHandler implements WebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);
    // Firebase tokens always carry exp (1 hour); this only bounds a token without one.
    private static final Duration MAX_SESSION = Duration.ofHours(1);

    private final ReactiveJwtDecoder jwtDecoder;
    private final UserService userService;
    private final ChatService chatService;
    private final BuddyService buddyService;
    private final MessageDelivery delivery;
    private final RoomHub hub;
    private final JsonMapper json;
    private final RealtimeProperties properties;
    private final RoomAccess access;

    ChatWebSocketHandler(
            ReactiveJwtDecoder jwtDecoder,
            UserService userService,
            ChatService chatService,
            BuddyService buddyService,
            MessageDelivery delivery,
            RoomHub hub,
            JsonMapper json,
            RealtimeProperties properties,
            RoomAccess access) {
        this.jwtDecoder = jwtDecoder;
        this.userService = userService;
        this.chatService = chatService;
        this.buddyService = buddyService;
        this.delivery = delivery;
        this.hub = hub;
        this.json = json;
        this.properties = properties;
        this.access = access;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // Everything written to this session goes through one queue. Before authentication it
        // only ever carries an error; afterwards the connection's own sink takes over.
        Sinks.Many<ServerEvent> preAuth = Sinks.many().unicast().onBackpressureBuffer();
        Sinks.One<Flux<ServerEvent>> outboundSource = Sinks.one();
        // Signalled when the first message arrives; verifying it may take a while after that.
        Sinks.Empty<Void> firstMessage = Sinks.empty();
        long openedAt = System.nanoTime();
        log.debug("[{}] opened", session.getId());

        Flux<String> inbound = session.receive()
                .filter(message -> message.getType() == WebSocketMessage.Type.TEXT)
                .map(WebSocketMessage::getPayloadAsText);

        Mono<Void> input = inbound.switchOnFirst((first, rest) -> {
                    firstMessage.tryEmitEmpty();
                    log.debug(
                            "[{}] first message after {} ms",
                            session.getId(),
                            (System.nanoTime() - openedAt) / 1_000_000);
                    ClientEvent event = first.hasValue() ? parse(first.get()) : null;
                    if (!(event instanceof ClientEvent.Auth auth)) {
                        return reject(preAuth, outboundSource, "UNAUTHORIZED");
                    }
                    return authenticate(auth.token())
                            .zipWhen(signedIn -> Mono.zip(
                                    chatService.readMarks(signedIn.user().roomId()),
                                    access.historyVersion(signedIn.user().roomId())))
                            .flatMapMany(authenticated -> {
                                User user = authenticated.getT1().user();
                                RoomHub.Connection connection = new RoomHub.Connection(user.id(), user.roomId());
                                // Loses only if the auth deadline already rejected this socket.
                                if (outboundSource
                                        .tryEmitValue(connection.events())
                                        .isFailure()) {
                                    return Flux.empty();
                                }
                                hub.join(
                                        connection,
                                        online -> new ServerEvent.Ready(
                                                user.id(),
                                                user.roomId(),
                                                online,
                                                authenticated.getT2().getT1(),
                                                authenticated.getT2().getT2()));
                                log.debug(
                                        "[{}] authenticated user {} in room {}",
                                        session.getId(),
                                        user.id(),
                                        user.roomId());
                                // Hunger or poops since anyone last looked go to the whole room.
                                // A purge may have happened after the version query but before join,
                                // when this connection could not receive its historyChanged event.
                                Mono<Void> noticeHistory = access.historyVersion(user.roomId())
                                        .doOnNext(version -> {
                                            if (version > authenticated.getT2().getT2()) {
                                                connection.emit(new ServerEvent.HistoryChanged(version, null));
                                            }
                                        })
                                        .then();
                                Mono<Void> noticeBuddy = buddyService
                                        .observe(user.roomId())
                                        // Not worth dropping the connection for; the next look catches up.
                                        .onErrorResume(e -> {
                                            log.warn(
                                                    "[{}] Could not send the buddy notice: {}",
                                                    session.getId(),
                                                    e.toString());
                                            return Mono.empty();
                                        })
                                        .then();
                                // The token was checked once, at connect. When it expires the socket
                                // closes; the app reconnects with a fresh one. (Not a timeout on the
                                // input, which would drop the socket before the error is written.)
                                Disposable expiry = Mono.delay(untilExpiry(authenticated.getT1()))
                                        .subscribe(tick -> {
                                            connection.emit(new ServerEvent.Error("TOKEN_EXPIRED", null));
                                            connection.complete();
                                        });
                                return noticeHistory
                                        .then(noticeBuddy)
                                        .thenMany(rest.skip(1))
                                        .filter(text -> !answeredPing(connection, text))
                                        .concatMap(text -> onEvent(connection, user, text))
                                        .doFinally(signal -> {
                                            expiry.dispose();
                                            hub.leave(connection);
                                            connection.complete();
                                        });
                            })
                            .onErrorResume(ApiException.class, e -> reject(preAuth, outboundSource, e.code()))
                            .onErrorResume(JwtException.class, e -> reject(preAuth, outboundSource, "UNAUTHORIZED"));
                })
                .then();

        // A socket that sends nothing in time is rejected. A timer rather than a timeout on
        // receive(): cancelling the inbound stream would drop the connection before the error is
        // written. The deadline covers only the wait for the first message, not verifying it (the
        // first token check may fetch Google's keys).
        Mono<Void> authDeadline = Mono.delay(properties.authTimeout())
                .doOnNext(tick -> reject(preAuth, outboundSource, "AUTH_TIMEOUT"))
                .takeUntilOther(firstMessage.asMono())
                .then();

        Sinks.Empty<Void> outboundDone = Sinks.empty();
        // Mono.when below subscribes to the input (receive) before this output, so hello is only
        // sent once incoming frames are being read.
        Flux<WebSocketMessage> events = Flux.concat(
                        Mono.just(new ServerEvent.Hello()),
                        outboundSource.asMono().flatMapMany(source -> source))
                .map(event -> session.textMessage(json.writeValueAsString(event)))
                .doFinally(signal -> outboundDone.tryEmitEmpty());
        Flux<WebSocketMessage> pings = Flux.interval(properties.pingInterval(), properties.pingInterval())
                .map(i -> session.pingMessage(factory -> factory.allocateBuffer(0)))
                .takeUntilOther(outboundDone.asMono());

        // When the outbound side ends (rejected, or the client went away) the socket is closed.
        Mono<Void> output = session.send(Flux.merge(events, pings)).then(session.close());
        // Expected failures (ApiException, JwtException) were already answered above. Anything else
        // drops the socket after the upgrade, where Spring no longer logs it with a stack trace.
        return Mono.when(input, output, authDeadline)
                .doOnError(
                        e -> !clientWentAway(e),
                        e -> log.error("[{}] WebSocket closed by an unexpected error", session.getId(), e));
    }

    // The app went to the background or lost the network: nothing to fix on the server.
    private static boolean clientWentAway(Throwable e) {
        return e instanceof IOException || e instanceof AbortedException;
    }

    private record SignedIn(User user, @Nullable Instant expiresAt) {}

    private Mono<SignedIn> authenticate(String token) {
        return jwtDecoder
                .decode(token)
                .flatMap(jwt -> userService
                        .current(jwt)
                        .flatMap(user -> user.roomId() == null
                                ? Mono.error(new ApiException(HttpStatus.CONFLICT, "ROOM_NOT_FOUND"))
                                : access.requireMember(user.roomId(), user.id())
                                        .thenReturn(new SignedIn(user, jwt.getExpiresAt()))));
    }

    private static Duration untilExpiry(SignedIn signedIn) {
        if (signedIn.expiresAt() == null) return MAX_SESSION;
        Duration left = Duration.between(Instant.now(), signedIn.expiresAt());
        return left.isNegative() ? Duration.ZERO : left;
    }

    private Mono<Void> onEvent(RoomHub.Connection connection, User user, String text) {
        return access.requireMember(connection.roomId, user.id())
                .then(Mono.defer(() -> onAuthorizedEvent(connection, user, text)))
                .onErrorResume(ApiException.class, e -> {
                    connection.emit(new ServerEvent.Error(e.code(), null));
                    connection.complete();
                    return Mono.empty();
                });
    }

    private Mono<Void> onAuthorizedEvent(RoomHub.Connection connection, User user, String text) {
        ClientEvent event = parse(text);
        return switch (event) {
            case ClientEvent.Send send ->
                chatService
                        .send(user, send.clientMessageId(), send.text())
                        .doOnNext(result ->
                                connection.emit(new ServerEvent.Ack(send.clientMessageId(), result.message())))
                        .flatMap(result -> delivery.deliver(result, user, connection, send.text()))
                        .onErrorResume(ApiException.class, e -> {
                            connection.emit(new ServerEvent.Error(e.code(), send.clientMessageId()));
                            return Mono.empty();
                        })
                        .then();
            case ClientEvent.Typing typing -> {
                // Not stored: the others see it only while it keeps being repeated.
                hub.publishToOthers(connection.roomId, new ServerEvent.Typing(user.id(), typing.typing()), user.id());
                yield Mono.empty();
            }
            case ClientEvent.Pet pet -> {
                // Not stored, like typing: the partner's buddy just feels it.
                hub.publishToOthers(connection.roomId, new ServerEvent.Pet(user.id()), user.id());
                yield Mono.empty();
            }
            case ClientEvent.React react ->
                chatService
                        .react(user, react.messageId(), react.reaction())
                        // Also to the user's own devices, this one included: the app shows the stored state.
                        .doOnNext(message -> hub.publish(connection.roomId, new ServerEvent.Reacted(message), null))
                        .onErrorResume(ApiException.class, e -> {
                            connection.emit(new ServerEvent.Error(e.code(), null));
                            return Mono.empty();
                        })
                        .then();
            case ClientEvent.Read read ->
                chatService
                        .markRead(user, read.messageId())
                        .doOnNext(moved -> {
                            if (moved) {
                                hub.publish(
                                        connection.roomId,
                                        new ServerEvent.Read(user.id(), read.messageId()),
                                        connection);
                            }
                        })
                        .onErrorResume(ApiException.class, e -> {
                            connection.emit(new ServerEvent.Error(e.code(), null));
                            return Mono.empty();
                        })
                        .then();
            case ClientEvent.Ping ping -> {
                connection.emit(new ServerEvent.Pong());
                yield Mono.empty();
            }
            case ClientEvent.Auth auth -> Mono.empty(); // already authenticated
            case null -> {
                connection.emit(new ServerEvent.Error("INVALID_EVENT", null));
                yield Mono.empty();
            }
        };
    }

    // Sends one error and closes. Does nothing if the socket was already authenticated or rejected:
    // whoever sets the outbound source first wins.
    private <T> Flux<T> reject(
            Sinks.Many<ServerEvent> preAuth, Sinks.One<Flux<ServerEvent>> outboundSource, String code) {
        if (outboundSource.tryEmitValue(preAuth.asFlux()).isSuccess()) {
            log.debug("Rejected a WebSocket: {}", code);
            preAuth.tryEmitNext(new ServerEvent.Error(code, null));
            preAuth.tryEmitComplete();
        }
        return Flux.empty();
    }

    // A ping is answered at once, ahead of events still being handled and without a database read: it
    // tells the app the connection is alive (app/src/lib/realtime-socket.ts), not how busy the server is.
    private boolean answeredPing(RoomHub.Connection connection, String text) {
        if (text.length() > 64 || !text.contains("ping") || !(parse(text) instanceof ClientEvent.Ping)) return false;
        connection.emit(new ServerEvent.Pong());
        return true;
    }

    private @Nullable ClientEvent parse(String text) {
        try {
            return json.readValue(text, ClientEvent.class);
        } catch (JacksonException e) {
            log.debug("Unreadable WebSocket message: {}", e.getOriginalMessage());
            return null;
        }
    }
}
