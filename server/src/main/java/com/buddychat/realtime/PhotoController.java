package com.buddychat.realtime;

import com.buddychat.chat.ChatService;
import com.buddychat.chat.Message;
import com.buddychat.common.ApiException;
import com.buddychat.user.UserService;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * Sending a photo (docs/PROJECT.md, 사진). The image bytes are the request body, which the
 * WebSocket's JSON frames cannot carry well; once stored, the photo is delivered like a text.
 */
@RestController
class PhotoController {

    private static final Logger log = LoggerFactory.getLogger(PhotoController.class);
    static final int MAX_BYTES = 10 * 1024 * 1024;

    private final UserService userService;
    private final ChatService chatService;
    private final MessageDelivery delivery;

    PhotoController(UserService userService, ChatService chatService, MessageDelivery delivery) {
        this.userService = userService;
        this.chatService = chatService;
        this.delivery = delivery;
    }

    /** Emits the stored message, the same for a retry with the same {@code clientMessageId}. */
    @PostMapping("/api/rooms/me/photos")
    Mono<Message> send(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @Nullable String clientMessageId,
            ServerHttpRequest request) {
        return userService
                .current(jwt)
                .flatMap(user -> DataBufferUtils.join(request.getBody(), MAX_BYTES)
                        .onErrorMap(
                                DataBufferLimitException.class,
                                e -> new ApiException(HttpStatus.CONTENT_TOO_LARGE, "PHOTO_TOO_LARGE"))
                        .map(buffer -> {
                            byte[] bytes = new byte[buffer.readableByteCount()];
                            buffer.read(bytes);
                            DataBufferUtils.release(buffer);
                            return bytes;
                        })
                        .defaultIfEmpty(new byte[0])
                        .flatMap(bytes -> chatService.sendPhoto(user, clientMessageId, bytes))
                        .flatMap(result -> delivery.deliver(result, user, null, "")
                                // The photo is stored and sent; a retry would only get the same message back.
                                .onErrorResume(e -> {
                                    log.warn("A photo was stored, but delivering it failed: {}", e.toString());
                                    return Mono.empty();
                                })
                                .thenReturn(result.message())));
    }
}
