package com.buddychat.realtime;

import com.buddychat.buddy.BuddyService;
import com.buddychat.chat.ChatService;
import com.buddychat.notification.NotificationService;
import com.buddychat.user.User;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * What follows a stored message, however it was sent (a text over the WebSocket, a photo over REST):
 * the room hears it, the partner may get a push, and chatting grows the buddy. A resend of an already
 * stored message did all of this the first time.
 */
@Component
class MessageDelivery {

    private final RoomHub hub;
    private final NotificationService notifications;
    private final BuddyService buddyService;

    MessageDelivery(RoomHub hub, NotificationService notifications, BuddyService buddyService) {
        this.hub = hub;
        this.notifications = notifications;
        this.buddyService = buddyService;
    }

    /**
     * @param from the sender's connection, which has its ack already; null to tell all of the room's
     *     connections (a photo sent over REST)
     * @param text what the buddy reads ("밥" feeds it); empty for a photo
     */
    Mono<Void> deliver(ChatService.SendResult result, User sender, RoomHub.@Nullable Connection from, String text) {
        if (!result.created()) return Mono.empty();
        String roomId = result.message().roomId();
        hub.publish(roomId, new ServerEvent.NewMessage(result.message()), from);
        notifications.onNewMessage(result.message(), sender);
        return buddyService.onMessageSent(roomId, sender.id(), text);
    }
}
