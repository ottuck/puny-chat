package com.buddychat.account;

import com.buddychat.chat.ChatService;
import com.buddychat.common.ApiException;
import com.buddychat.notification.NotificationService;
import com.buddychat.room.RoomService;
import com.buddychat.user.User;
import com.buddychat.user.UserService;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Deletes a user's account (docs/server-design.md, 계정 삭제; App Store Guideline 5.1.1(v)).
 * The partner keeps the room, the buddy and their own messages. Authored messages and named
 * system notes are removed across all rooms, and a room left empty goes with its history. Everything only the
 * user's is removed. No transaction: each step can run again, so a retry finishes a deletion that
 * failed midway. The Firebase account itself is deleted by the app afterwards.
 */
@Service
public class AccountService {

    private final UserService userService;
    private final RoomService roomService;
    private final ChatService chatService;
    private final NotificationService notificationService;

    AccountService(
            UserService userService,
            RoomService roomService,
            ChatService chatService,
            NotificationService notificationService) {
        this.userService = userService;
        this.roomService = roomService;
        this.chatService = chatService;
        this.notificationService = notificationService;
    }

    public Mono<Void> delete(User user) {
        Mono<Void> leave = user.roomId() == null
                ? Mono.empty()
                // Already gone from a room that no longer exists: nothing to leave.
                : roomService.leave(user).onErrorResume(ApiException.class, e -> Mono.empty());
        return chatService
                .beginAccountDeletion(user.id())
                .then(leave)
                .then(roomService.deleteInvitationsBy(user.id()))
                .then(chatService.deleteUserHistory(user.id()))
                .then(chatService.deleteReadMarksOf(user.id()))
                .then(notificationService.forget(user.id()))
                .then(userService.delete(user.id()))
                .then(chatService.finishAccountDeletion(user.id()));
    }

    Mono<Void> cleanupFinishedDeletions() {
        return chatService.cleanupFinishedDeletions();
    }
}
