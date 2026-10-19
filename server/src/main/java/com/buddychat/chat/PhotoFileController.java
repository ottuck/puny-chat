package com.buddychat.chat;

import java.nio.file.Files;
import java.time.Duration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Photo files, without a token: a web page's {@code <img>} cannot send one. The photo id is 128
 * random bits, so only someone who has the address can see it (docs/PROJECT.md, 사진).
 */
@RestController
class PhotoFileController {

    private static final MediaType WEBP = MediaType.parseMediaType("image/webp");
    private static final String SUFFIX = ".webp";

    private final PhotoStore photos;

    PhotoFileController(PhotoStore photos) {
        this.photos = photos;
    }

    @GetMapping("/photos/{roomId}/{name}")
    Mono<ResponseEntity<Resource>> photo(@PathVariable String roomId, @PathVariable String name) {
        if (!name.endsWith(SUFFIX)) return Mono.just(ResponseEntity.notFound().build());
        String photoId = name.substring(0, name.length() - SUFFIX.length());
        return Mono.fromCallable(() -> photos.file(roomId, photoId)
                        .filter(Files::isRegularFile)
                        // A photo never changes: deleting it ends the address.
                        .map(file -> ResponseEntity.ok()
                                .contentType(WEBP)
                                .cacheControl(CacheControl.maxAge(Duration.ofDays(365))
                                        .cachePrivate()
                                        .immutable())
                                .<Resource>body(new FileSystemResource(file)))
                        .orElseGet(() -> ResponseEntity.notFound().build()))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
