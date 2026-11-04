# Server image, built by CI and run on the Lightsail instance (deploy/, docs/PROJECT.md, 인프라).
# The build context is the repository root so the image can carry LICENSE (the image is public on GHCR).
# Only the files listed in Dockerfile.dockerignore go into the context.
# docker build -f server/Dockerfile -t buddy-chat-server .

FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
# Dependencies first, so code changes reuse the cached layer.
COPY server/gradlew server/settings.gradle.kts server/build.gradle.kts ./
COPY server/gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY server/src src
# Tests run in CI before an image is built.
RUN ./gradlew --no-daemon bootJar \
    && java -Djarmode=tools -jar build/libs/app.jar extract --layers --launcher --destination extracted

FROM eclipse-temurin:25-jre
# Links the GHCR package to this repository. A new package is private: set it to public once in the
# package settings on GitHub, because the instance pulls it without logging in (the image holds no secrets).
LABEL org.opencontainers.image.source="https://github.com/ottuck/puny-chat"
RUN useradd --system --uid 1001 app
USER app
WORKDIR /app
# Layers from least to most often changed.
COPY --from=build /src/extracted/dependencies/ ./
COPY --from=build /src/extracted/spring-boot-loader/ ./
COPY --from=build /src/extracted/snapshot-dependencies/ ./
COPY --from=build /src/extracted/application/ ./
# The instance's copies of these must match: deploy/health.sh compares them and reports a difference.
COPY server/deploy/ /app/deploy/
# The image is public, so its terms (All rights reserved) go with every copy.
COPY LICENSE /app/LICENSE
EXPOSE 8080
# Photos go to a volume the instance mounts here (deploy/compose.yaml). Without it /data is not writable:
# sending photos then fails with PHOTO_UNAVAILABLE and the rest works.
ENV BUDDYCHAT_PHOTOS_DIR=/data/photos
# The commit this image was built from, so an error report says which release it came from (Sentry).
ARG GIT_SHA=unknown
ENV SENTRY_RELEASE=$GIT_SHA
# The container's memory limit decides the heap.
# The WebP encoder loads libwebp (chat/PhotoStore).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "--enable-native-access=ALL-UNNAMED", "org.springframework.boot.loader.launch.JarLauncher"]
