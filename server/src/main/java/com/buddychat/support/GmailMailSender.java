package com.buddychat.support;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

/** Gmail over HTTPS: hosting providers often block outbound SMTP (AWS port 25, Railway Hobby). Called on boundedElastic. */
@Component
class GmailMailSender extends JavaMailSenderImpl {
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private final WebClient http;
    private final String clientId;
    private final String clientSecret;
    private final String refreshToken;
    private final String tokenUrl;
    private final String sendUrl;

    @Autowired
    GmailMailSender(
            @Value("${buddychat.support.gmail.client-id:}") String clientId,
            @Value("${buddychat.support.gmail.client-secret:}") String clientSecret,
            @Value("${buddychat.support.gmail.refresh-token:}") String refreshToken) {
        this(
                WebClient.create(),
                clientId,
                clientSecret,
                refreshToken,
                "https://oauth2.googleapis.com/token",
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    }

    GmailMailSender(
            WebClient http,
            String clientId,
            String clientSecret,
            String refreshToken,
            String tokenUrl,
            String sendUrl) {
        this.http = http;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
        this.tokenUrl = tokenUrl;
        this.sendUrl = sendUrl;
    }

    boolean configured() {
        return !clientId.isBlank() && !clientSecret.isBlank() && !refreshToken.isBlank();
    }

    record Token(@JsonProperty("access_token") String accessToken) {}

    @Override
    public void send(SimpleMailMessage... messages) {
        if (!configured()) throw new MailSendException("Gmail authorization is not configured");
        try {
            Token token = http.post()
                    .uri(tokenUrl)
                    .body(BodyInserters.fromFormData("client_id", clientId)
                            .with("client_secret", clientSecret)
                            .with("refresh_token", refreshToken)
                            .with("grant_type", "refresh_token"))
                    .retrieve()
                    .bodyToMono(Token.class)
                    .block(TIMEOUT);
            if (token == null
                    || token.accessToken() == null
                    || token.accessToken().isBlank()) throw new MailSendException("Gmail access token is missing");
            for (SimpleMailMessage message : messages) {
                MimeMessage mime = createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, StandardCharsets.UTF_8.name());
                helper.setFrom(message.getFrom());
                helper.setTo(message.getTo());
                if (message.getReplyTo() != null) helper.setReplyTo(message.getReplyTo());
                helper.setSubject(message.getSubject());
                helper.setText(message.getText());
                mime.saveChanges();
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                mime.writeTo(bytes);
                String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes.toByteArray());
                http.post()
                        .uri(sendUrl)
                        .headers(headers -> headers.setBearerAuth(token.accessToken()))
                        .bodyValue(Map.of("raw", raw))
                        .retrieve()
                        .toBodilessEntity()
                        .block(TIMEOUT);
            }
        } catch (Exception error) {
            throw new MailSendException("Gmail notification failed", error);
        }
    }
}
