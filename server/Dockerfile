# Server image, built by CI from this folder and run on the Lightsail instance (deploy/, docs/PROJECT.md, 인프라).
# docker build -t buddy-chat-server server/

FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
# Dependencies first, so code changes reuse the cached layer.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY src src
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
EXPOSE 8080
# The container's memory limit decides the heap.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "org.springframework.boot.loader.launch.JarLauncher"]
