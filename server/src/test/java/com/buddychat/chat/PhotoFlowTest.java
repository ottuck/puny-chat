package com.buddychat.chat;

import static com.buddychat.TestJwtConfiguration.token;
import static org.assertj.core.api.Assertions.assertThat;

import com.buddychat.FlowTest;
import com.buddychat.TestSocket;
import com.buddychat.user.User;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Sending, showing and deleting photos (docs/PROJECT.md, 사진). */
@FlowTest
class PhotoFlowTest {

    @LocalServerPort
    int port;

    @Autowired
    JsonMapper json;

    @Autowired
    ReactiveMongoTemplate mongo;

    @Autowired
    PhotoProperties properties;

    private final List<TestSocket> sockets = new ArrayList<>();
    private WebTestClient http;

    @BeforeEach
    void setUp() {
        http = WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
    }

    @AfterEach
    void closeSockets() {
        sockets.forEach(TestSocket::close);
    }

    @Test
    void aPhotoIsStoredAsASmallerWebpAndReachesTheWholeRoom() throws IOException {
        duoRoom("henry", "yuki");
        TestSocket henry = connect("henry");
        TestSocket yuki = connect("yuki");

        JsonNode sent = sendPhoto("henry", "p-1", jpeg(3000, 2000))
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody();

        assertThat(sent.get("type").asString()).isEqualTo("PHOTO");
        assertThat(sent.get("text").isNull()).isTrue();
        JsonNode photo = sent.get("photo");
        // Scaled to the longer side, never past it, keeping the shape.
        assertThat(photo.get("width").asInt()).isEqualTo(PhotoStore.MAX_EDGE);
        assertThat(photo.get("height").asInt()).isEqualTo(1067);
        // The sender's own connection hears it too: the upload did not come through it.
        assertThat(henry.expect("message").get("message").get("id").asString())
                .isEqualTo(sent.get("id").asString());
        assertThat(yuki.expect("message").get("message").get("photo").get("id").asString())
                .isEqualTo(photo.get("id").asString());

        byte[] file = http.get()
                .uri(photoPath(sent))
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .contentType("image/webp")
                .expectHeader()
                .valueMatches("Cache-Control", ".*private.*immutable.*")
                .expectBody(byte[].class)
                .returnResult()
                .getResponseBody();
        assertThat(new String(file, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("RIFF");
        assertThat(new String(file, 8, 4, StandardCharsets.US_ASCII)).isEqualTo("WEBP");
        BufferedImage stored = ImageIO.read(new ByteArrayInputStream(file));
        assertThat(stored.getWidth()).isEqualTo(PhotoStore.MAX_EDGE);
        assertThat(file.length).isLessThan(400_000);
    }

    @Test
    void aSmallPhotoKeepsItsSize() throws IOException {
        createRoom("henry");

        JsonNode photo = sendPhoto("henry", "p-1", png(300, 400))
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("photo");

        assertThat(photo.get("width").asInt()).isEqualTo(300);
        assertThat(photo.get("height").asInt()).isEqualTo(400);
    }

    @Test
    void aRetryWithTheSameIdIsStoredAndDeliveredOnce() throws IOException {
        duoRoom("henry", "yuki");
        TestSocket yuki = connect("yuki");
        byte[] image = jpeg(800, 600);

        String first = sendPhoto("henry", "retry-1", image)
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("id")
                .asString();
        String second = sendPhoto("henry", "retry-1", image)
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("id")
                .asString();

        assertThat(second).isEqualTo(first);
        yuki.expect("message");
        yuki.expectSilence();
        assertThat(photoFiles(user("henry").roomId())).hasSize(1);
    }

    @Test
    void newPhotosBeyondTheLimitAreRefusedButARetryIsNot() throws IOException {
        createRoom("henry");
        byte[] image = jpeg(100, 100);
        for (int i = 0; i < 10; i++)
            sendPhoto("henry", "lim-" + i, image).expectStatus().isOk();

        sendPhoto("henry", "lim-10", image)
                .expectStatus()
                .isEqualTo(429)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PHOTO_RATE_LIMIT");
        // Stored already: answered without counting, so a retry after a lost reply still works.
        sendPhoto("henry", "lim-0", image).expectStatus().isOk();
        assertThat(photoFiles(user("henry").roomId())).hasSize(10);
    }

    @Test
    void photosCanBeReactedTo() throws IOException {
        duoRoom("henry", "yuki");
        TestSocket yuki = connect("yuki");
        String id = sendPhoto("henry", "p-1", jpeg(200, 200))
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("id")
                .asString();
        yuki.expect("message");

        yuki.send(Map.of("type", "react", "messageId", id, "reaction", "WOW"));

        JsonNode reacted = yuki.expect("reaction").get("message");
        assertThat(reacted.get("reactions").get(user("yuki").id()).asString()).isEqualTo("WOW");
    }

    @Test
    void whatIsNotAnImageIsRefused() {
        createRoom("henry");

        sendPhoto("henry", "p-1", "not an image".getBytes(StandardCharsets.UTF_8))
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_PHOTO");
        sendPhoto("henry", "p-2", new byte[0]).expectStatus().isBadRequest();
        assertThat(photoFiles(user("henry").roomId())).isEmpty();
    }

    @Test
    void aBigPhotoIsReadSkippingPixelsAndAHugeOneIsRefused() throws IOException {
        createRoom("henry");

        JsonNode photo = sendPhoto("henry", "p-1", jpeg(4096, 3072))
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("photo");
        assertThat(photo.get("width").asInt()).isEqualTo(PhotoStore.MAX_EDGE);
        assertThat(photo.get("height").asInt()).isEqualTo(1200);

        sendPhoto("henry", "p-2", png(5000, 3400))
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_PHOTO");
    }

    @Test
    void aTooLargeBodyIsRefused() {
        createRoom("henry");
        byte[] huge = new byte[11 * 1024 * 1024];
        Arrays.fill(huge, (byte) 1);

        sendPhoto("henry", "p-1", huge)
                .expectStatus()
                .isEqualTo(413)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PHOTO_TOO_LARGE");
    }

    @Test
    void withoutARoomNothingIsStored() throws IOException {
        http.get()
                .uri("/api/me")
                .header("Authorization", "Bearer " + token("henry"))
                .exchange()
                .expectStatus()
                .isOk();

        sendPhoto("henry", "p-1", jpeg(100, 100))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ROOM_NOT_FOUND");
    }

    @Test
    void addressesThatAreNotPhotosAreNotFound() {
        http.get()
                .uri("/photos/0123456789abcdef01234567/nothing.webp")
                .exchange()
                .expectStatus()
                .isNotFound();
        http.get()
                .uri("/photos/0123456789abcdef01234567/AAAAAAAAAAAAAAAAAAAAAA.webp")
                .exchange()
                .expectStatus()
                .isNotFound();
        http.get()
                .uri("/photos/..%2F..%2Fbuild.gradle.kts/x.webp")
                .exchange()
                .expectStatus()
                .is4xxClientError();
    }

    @Test
    void leavingASoloRoomDeletesItsPhotos() throws IOException {
        createRoom("henry");
        JsonNode sent = sendPhoto("henry", "p-1", jpeg(200, 200))
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody();

        post("henry", "/api/rooms/me/leave").expectStatus().isNoContent();

        http.get().uri(photoPath(sent)).exchange().expectStatus().isNotFound();
        assertThat(Files.exists(properties.dir().resolve(sent.get("roomId").asString())))
                .isFalse();
    }

    @Test
    void deletingAnAccountDeletesOnlyTheirPhotos() throws IOException {
        duoRoom("henry", "yuki");
        JsonNode henrys = sendPhoto("henry", "p-1", jpeg(200, 200))
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody();
        JsonNode yukis = sendPhoto("yuki", "p-2", jpeg(200, 200))
                .expectStatus()
                .isOk()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody();

        http.delete()
                .uri("/api/me")
                .header("Authorization", "Bearer " + token("yuki"))
                .exchange()
                .expectStatus()
                .isNoContent();

        http.get().uri(photoPath(yukis)).exchange().expectStatus().isNotFound();
        http.get().uri(photoPath(henrys)).exchange().expectStatus().isOk();
        assertThat(mongo.count(Query.query(Criteria.where("type").is(Message.Type.PHOTO)), Message.class)
                        .block())
                .isEqualTo(1);
    }

    // --- helpers ---

    private WebTestClient.ResponseSpec sendPhoto(String uid, String clientMessageId, byte[] image) {
        return http.post()
                .uri("/api/rooms/me/photos?clientMessageId=" + clientMessageId)
                .header("Authorization", "Bearer " + token(uid))
                .contentType(MediaType.IMAGE_JPEG)
                .bodyValue(image)
                .exchange();
    }

    private static String photoPath(JsonNode message) {
        return "/photos/" + message.get("roomId").asString() + "/"
                + message.get("photo").get("id").asString() + ".webp";
    }

    private List<Path> photoFiles(String roomId) {
        Path folder = properties.dir().resolve(roomId);
        if (!Files.isDirectory(folder)) return List.of();
        try (Stream<Path> files = Files.list(folder)) {
            return files.toList();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] jpeg(int width, int height) throws IOException {
        return encode(picture(width, height, BufferedImage.TYPE_INT_RGB), "jpg");
    }

    private static byte[] png(int width, int height) throws IOException {
        return encode(picture(width, height, BufferedImage.TYPE_INT_ARGB), "png");
    }

    private static BufferedImage picture(int width, int height, int type) {
        BufferedImage image = new BufferedImage(width, height, type);
        Graphics2D g = image.createGraphics();
        g.setColor(new Color(0xF6C1A6));
        g.fillRect(0, 0, width, height);
        g.setColor(new Color(0x3A7D44));
        g.fillOval(width / 4, height / 4, width / 2, height / 2);
        g.dispose();
        return image;
    }

    private static byte[] encode(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return out.toByteArray();
    }

    private TestSocket connect(String uid) {
        TestSocket socket = new TestSocket(URI.create("ws://localhost:" + port + "/ws"), json)
                .ignoring("presence")
                .ignoringBuddyEvents();
        sockets.add(socket);
        socket.expect("hello");
        socket.send(Map.of("type", "auth", "token", token(uid)));
        socket.expect("ready");
        return socket;
    }

    private User user(String uid) {
        return mongo.findOne(Query.query(Criteria.where("firebaseUid").is(uid)), User.class)
                .block();
    }

    private void createRoom(String uid) {
        http.post()
                .uri("/api/rooms")
                .header("Authorization", "Bearer " + token(uid))
                .bodyValue(Map.of("buddyName", "Mugi"))
                .exchange()
                .expectStatus()
                .isCreated();
    }

    private void duoRoom(String owner, String friend) {
        createRoom(owner);
        String code = http.post()
                .uri("/api/rooms/me/invitations")
                .header("Authorization", "Bearer " + token(owner))
                .bodyValue(Map.of())
                .exchange()
                .expectBody(JsonNode.class)
                .returnResult()
                .getResponseBody()
                .get("code")
                .asString();
        http.post()
                .uri("/api/invitations/" + code + "/accept")
                .header("Authorization", "Bearer " + token(friend))
                .bodyValue(Map.of())
                .exchange()
                .expectStatus()
                .isOk();
    }

    private WebTestClient.ResponseSpec post(String uid, String path) {
        return http.post()
                .uri(path)
                .header("Authorization", "Bearer " + token(uid))
                .exchange();
    }
}
