package com.buddychat.support;

import com.buddychat.user.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
class SupportController {
    private final UserService users;
    private final SupportService support;

    SupportController(UserService users, SupportService support) {
        this.users = users;
        this.support = support;
    }

    record InquiryRequest(
            @NotBlank @Pattern(regexp = "[a-fA-F0-9-]{36}") String requestId,
            @NotBlank @Size(max = 4000) String description,

            @Nullable @Email @Size(max = 254) @Pattern(regexp = "[^\\r\\n]*")
            String replyEmail) {}

    record RemovalRequest(
            @NotBlank @Pattern(regexp = "[a-fA-F0-9-]{36}") String requestId,
            @NotBlank @Size(max = 64) String roomId,
            @NotBlank @Size(max = 64) String targetId,
            boolean report,
            SupportTicket.@Nullable Reason reason,
            @NotBlank @Size(max = 4000) String description,

            @Nullable @Email @Size(max = 254) @Pattern(regexp = "[^\\r\\n]*")
            String replyEmail) {}

    @PostMapping("/api/support/inquiries")
    @ResponseStatus(HttpStatus.CREATED)
    Mono<SupportService.Receipt> inquire(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody InquiryRequest request) {
        return users.current(jwt)
                .flatMap(user ->
                        support.inquire(user, request.requestId(), request.description(), request.replyEmail()));
    }

    @PostMapping("/api/rooms/me/partner-removal")
    @ResponseStatus(HttpStatus.CREATED)
    Mono<SupportService.Receipt> remove(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RemovalRequest request) {
        return users.current(jwt)
                .flatMap(user -> support.remove(
                        user,
                        request.requestId(),
                        request.roomId(),
                        request.targetId(),
                        request.report(),
                        request.reason(),
                        request.description(),
                        request.replyEmail()));
    }
}
