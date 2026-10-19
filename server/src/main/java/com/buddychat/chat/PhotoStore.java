package com.buddychat.chat;

import com.buddychat.common.ApiException;
import com.luciad.imageio.webp.CompressionType;
import com.luciad.imageio.webp.WebPWriteParam;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Comparator;
import java.util.Iterator;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.FileImageOutputStream;
import javax.imageio.stream.ImageInputStream;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Scheduler;
import reactor.core.scheduler.Schedulers;

/**
 * Photo files on disk: {@code <dir>/<roomId>/<photoId>.webp} (docs/PROJECT.md, 사진). Whatever image
 * comes in is decoded and written again as WebP no larger than {@link #MAX_EDGE}, so a stored file is
 * always an image of ours and carries no metadata (such as where it was taken).
 */
@Component
class PhotoStore implements DisposableBean {

    /** The longer side, in pixels, after scaling down: enough for a phone screen. */
    static final int MAX_EDGE = 1024;

    /** Decoding a huge image would take the heap; the header says the size before that. */
    static final long MAX_PIXELS = 50_000_000L;

    private static final float QUALITY = 0.8f;
    private static final Pattern ROOM_ID = Pattern.compile("[0-9a-f]{24}");
    private static final Pattern PHOTO_ID = Pattern.compile("[A-Za-z0-9_-]{22}");
    private static final SecureRandom RANDOM = new SecureRandom();

    record Stored(String id, int width, int height) {}

    private final PhotoProperties properties;
    // Decoding and encoding are blocking and use the CPU: two at a time on the small instance.
    private final Scheduler encoder = Schedulers.newBoundedElastic(2, 32, "photo");

    PhotoStore(PhotoProperties properties) {
        this.properties = properties;
    }

    /** Re-encodes {@code image} into the room's folder. */
    Mono<Stored> store(String roomId, byte[] image) {
        return Mono.fromCallable(() -> write(roomId, image)).subscribeOn(encoder);
    }

    /** Removes one photo; a missing file is fine (deleting again). */
    Mono<Void> delete(String roomId, String photoId) {
        return Mono.<Void>fromRunnable(() -> file(roomId, photoId).ifPresent(PhotoStore::deleteQuietly))
                .subscribeOn(Schedulers.boundedElastic());
    }

    /** Removes the room's folder with every photo in it. */
    Mono<Void> deleteRoom(String roomId) {
        return Mono.<Void>fromRunnable(() -> {
                    if (!ROOM_ID.matcher(roomId).matches()) return;
                    Path folder = properties.dir().resolve(roomId);
                    if (!Files.isDirectory(folder)) return;
                    try (Stream<Path> files = Files.walk(folder)) {
                        files.sorted(Comparator.reverseOrder()).forEach(PhotoStore::deleteQuietly);
                    } catch (IOException e) {
                        throw new UncheckedIOException(e);
                    }
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    /** Where the photo would be; empty for ids that are not ours (no paths outside the folder). */
    Optional<Path> file(String roomId, String photoId) {
        if (!ROOM_ID.matcher(roomId).matches() || !PHOTO_ID.matcher(photoId).matches()) return Optional.empty();
        return Optional.of(properties.dir().resolve(roomId).resolve(photoId + ".webp"));
    }

    private Stored write(String roomId, byte[] bytes) throws IOException {
        Path folder = writableFolder(roomId);
        BufferedImage image = scaledDown(decode(bytes));
        String id = newId();
        Path target = folder.resolve(id + ".webp");
        Path partial = folder.resolve(id + ".part");
        try {
            encode(image, partial);
            Files.move(partial, target, StandardCopyOption.ATOMIC_MOVE);
        } finally {
            Files.deleteIfExists(partial);
        }
        return new Stored(id, image.getWidth(), image.getHeight());
    }

    // The instance's volume may not be mounted yet, or the disk may be nearly full: then photos wait
    // and everything else goes on.
    private Path writableFolder(String roomId) {
        try {
            Path root = Files.createDirectories(properties.dir());
            if (Files.getFileStore(root).getUsableSpace()
                    < properties.minFreeSpace().toBytes()) {
                throw unavailable();
            }
            Path folder = Files.createDirectories(root.resolve(roomId));
            if (!Files.isWritable(folder)) throw unavailable();
            return folder;
        } catch (IOException e) {
            throw unavailable();
        }
    }

    private static BufferedImage decode(byte[] bytes) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) throw invalid();
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels <= 0 || pixels > MAX_PIXELS) throw invalid();
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            // A broken file or one ImageIO cannot read (e.g. a CMYK JPEG).
            if (e instanceof ApiException api) throw api;
            throw invalid();
        }
    }

    // Halving first and then one last step keeps a big photo from turning grainy.
    private static BufferedImage scaledDown(BufferedImage source) {
        int longer = Math.max(source.getWidth(), source.getHeight());
        if (longer <= MAX_EDGE) return withoutOddTypes(source);
        double scale = (double) MAX_EDGE / longer;
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
        BufferedImage image = source;
        while (image.getWidth() / 2 >= width && image.getHeight() / 2 >= height) {
            image = resized(image, image.getWidth() / 2, image.getHeight() / 2);
        }
        return resized(image, width, height);
    }

    // Grayscale, indexed or 16-bit images become plain RGB(A) for the encoder.
    private static BufferedImage withoutOddTypes(BufferedImage image) {
        int type = image.getType();
        if (type == BufferedImage.TYPE_INT_RGB || type == BufferedImage.TYPE_INT_ARGB) return image;
        return resized(image, image.getWidth(), image.getHeight());
    }

    private static BufferedImage resized(BufferedImage source, int width, int height) {
        int type = source.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage target = new BufferedImage(width, height, type);
        Graphics2D g = target.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(source, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return target;
    }

    private static void encode(BufferedImage image, Path file) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByMIMEType("image/webp").next();
        try (FileImageOutputStream out = new FileImageOutputStream(file.toFile())) {
            WebPWriteParam param = new WebPWriteParam(writer.getLocale());
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionType(CompressionType.Lossy);
            param.setCompressionQuality(QUALITY);
            writer.setOutput(out);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    private static String newId() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (NoSuchFileException e) {
            // Removed meanwhile.
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PHOTO");
    }

    private static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PHOTO_UNAVAILABLE");
    }

    @Override
    public void destroy() {
        encoder.dispose();
    }
}
