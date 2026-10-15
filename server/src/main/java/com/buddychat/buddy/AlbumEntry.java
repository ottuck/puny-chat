package com.buddychat.buddy;

import java.time.Instant;
import org.jspecify.annotations.Nullable;

/**
 * A buddy that grew up and went its own way (docs/spec.md, 독립과 앨범), kept in its room's album.
 * Only what the album shows: the name, the days it spent with the two, and the job it grew into.
 *
 * @param job a {@link BuddyJob} name; null for those who left before jobs existed
 * @param level the level it left at, which keeps the room's rewards up to there; null for those who
 *     left before it was kept (they left at the old top level, 30)
 */
public record AlbumEntry(
        String name,
        Instant bornAt,
        Instant graduatedAt,
        @Nullable String job,
        @Nullable Integer level) {}
