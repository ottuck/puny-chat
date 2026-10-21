package com.buddychat;

import com.mongodb.MongoClientSettings;
import com.mongodb.connection.TransportSettings;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.MultiThreadIoEventLoopGroup;
import io.netty.channel.nio.NioIoHandler;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.mongodb.autoconfigure.MongoConnectionDetails;
import org.springframework.boot.mongodb.autoconfigure.MongoProperties;
import org.springframework.boot.mongodb.autoconfigure.StandardMongoClientSettingsBuilderCustomizer;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.mongodb.MongoDBContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * A throwaway MongoDB for tests. Given {@code SPRING_MONGODB_URI} (and a separate
 * {@code SPRING_MONGODB_DATABASE}), the same tests run against that server instead, e.g. a MongoDB
 * Atlas cluster to check compatibility. They delete every document in that database.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    @ConditionalOnExpression("'${spring.mongodb.uri:}' == ''")
    MongoDBContainer mongoDbContainer() {
        // mongod 8.x's bundled TCMalloc fails to start on Linux 6.19+ (GitHub's ubuntu-24.04 runner
        // moved to 7.0 in October 2026) unless glibc registers rseq (MongoDB SERVER-121912).
        return new MongoDBContainer(DockerImageName.parse("mongo:8.0"))
                .withEnv("GLIBC_TUNABLES", "glibc.pthread.rseq=1");
    }

    /**
     * The driver's event loop, as Spring Boot would make it, but stopped without Netty's 2 s quiet
     * period: Boot's own one waits that long whenever a test context closes. Boot leaves the transport
     * alone when these settings name one, but then also skips applying the connection (the container's
     * address), so that is added back below as Boot does it.
     */
    @Bean
    MongoClientSettings mongoClientSettings(DriverEventLoop loop) {
        return MongoClientSettings.builder()
                .transportSettings(TransportSettings.nettyBuilder()
                        .eventLoopGroup(loop.group)
                        .build())
                .build();
    }

    @Bean
    StandardMongoClientSettingsBuilderCustomizer standardMongoSettingsCustomizer(
            MongoProperties properties, MongoConnectionDetails connectionDetails) {
        return new StandardMongoClientSettingsBuilderCustomizer(
                connectionDetails, properties.getRepresentation().getUuid());
    }

    @Bean
    DriverEventLoop driverEventLoop() {
        return new DriverEventLoop();
    }

    static final class DriverEventLoop implements DisposableBean {

        final EventLoopGroup group = new MultiThreadIoEventLoopGroup(NioIoHandler.newFactory());

        @Override
        public void destroy() {
            group.shutdownGracefully(0, 1, TimeUnit.SECONDS).awaitUninterruptibly();
        }
    }
}
