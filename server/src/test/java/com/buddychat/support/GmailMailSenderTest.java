package com.buddychat.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.json.JsonMapper;

class GmailMailSenderTest {
    private HttpServer server;
    private String base;
    private final List<String> requests = new CopyOnWriteArrayList<>();
    private final List<String> authorizations = new CopyOnWriteArrayList<>();
    private int tokenStatus = 200;
    private int sendStatus = 200;
    private String tokenBody = "{\"access_token\":\"temporary-token\",\"expires_in\":3600,\"token_type\":\"Bearer\"}";

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/token", exchange -> respond(exchange, tokenStatus, tokenBody));
        server.createContext("/send", exchange -> respond(exchange, sendStatus, "{\"id\":\"message-id\"}"));
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        requests.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
        authorizations.add(String.valueOf(exchange.getRequestHeaders().getFirst("Authorization")));
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private GmailMailSender sender() {
        return new GmailMailSender(
                WebClient.create(),
                "operator-client",
                "secret&value",
                "refresh+token",
                base + "/token",
                base + "/send");
    }

    private SimpleMailMessage message() {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("sender@example.com");
        message.setTo("support@puny-chat.com");
        message.setReplyTo("reply@example.com");
        message.setSubject("[puny-chat] 문의 · 접수 번호");
        message.setText("문의가 접수됐어요.\n사용자에게 자동 답장은 보내지 않습니다.");
        return message;
    }

    @Test
    void exchangesRefreshTokenAndSendsUnicodeMimeOnlyToOperator() throws Exception {
        sender().send(message());
        assertThat(requests).hasSize(2);
        assertThat(requests.getFirst())
                .contains(
                        "grant_type=refresh_token",
                        "client_id=operator-client",
                        "client_secret=secret%26value",
                        "refresh_token=refresh%2Btoken");
        assertThat(authorizations).containsExactly("null", "Bearer temporary-token");
        String raw = JsonMapper.builder()
                .build()
                .readTree(requests.getLast())
                .get("raw")
                .asString();
        MimeMessage parsed = new MimeMessage(
                Session.getInstance(new Properties()),
                new ByteArrayInputStream(Base64.getUrlDecoder().decode(raw)));
        assertThat(parsed.getAllRecipients()).extracting(Object::toString).containsExactly("support@puny-chat.com");
        assertThat(parsed.getReplyTo()).extracting(Object::toString).containsExactly("reply@example.com");
        assertThat(parsed.getSubject()).isEqualTo(message().getSubject());
        assertThat(parsed.getContent().toString()).contains("문의가 접수됐어요", "자동 답장은 보내지 않습니다");
    }

    @Test
    void deniedAuthorizationNeverCallsSendAndProviderFailureIsRetryable() {
        tokenStatus = 400;
        tokenBody = "{\"error\":\"invalid_grant\"}";
        assertThatThrownBy(() -> sender().send(message())).isInstanceOf(MailSendException.class);
        assertThat(requests).hasSize(1);
        tokenStatus = 200;
        tokenBody = "{\"access_token\":\"temporary-token\"}";
        sendStatus = 503;
        assertThatThrownBy(() -> sender().send(message())).isInstanceOf(MailSendException.class);
        assertThat(requests).hasSize(3);
    }

    @Test
    void missingCredentialsCannotSendAnyRequest() {
        GmailMailSender unconfigured =
                new GmailMailSender(WebClient.create(), "operator-client", "", "", base + "/token", base + "/send");
        assertThat(unconfigured.configured()).isFalse();
        assertThatThrownBy(() -> unconfigured.send(message())).isInstanceOf(MailSendException.class);
        assertThat(requests).isEmpty();
    }
}
