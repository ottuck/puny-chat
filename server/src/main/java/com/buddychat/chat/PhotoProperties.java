package com.buddychat.chat;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.unit.DataSize;

/**
 * @param dir where photo files live, one folder per room (the image sets {@code /data/photos}, a volume
 *     on the instance; docs/PROJECT.md, 사진)
 * @param minFreeSpace below this much free disk, no more photos are taken (the instance is shared)
 */
@ConfigurationProperties("buddychat.photos")
record PhotoProperties(
        @DefaultValue("photos") Path dir,
        @DefaultValue("5GB") DataSize minFreeSpace) {}
