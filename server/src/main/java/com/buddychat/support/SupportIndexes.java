package com.buddychat.support;

import java.time.Duration;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

@Component
class SupportIndexes implements ApplicationRunner {
    private final ReactiveMongoTemplate mongo;

    SupportIndexes(ReactiveMongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public void run(ApplicationArguments args) {
        mongo.indexOps(SupportTicket.class)
                .createIndex(new Index("expiresAt", Sort.Direction.ASC).expire(Duration.ZERO))
                .block();
        mongo.indexOps(SupportTicket.class)
                .createIndex(new Index("reporterId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC))
                .block();
        mongo.indexOps(SupportTicket.class)
                .createIndex(new Index("emailStatus", Sort.Direction.ASC).on("nextEmailAttemptAt", Sort.Direction.ASC))
                .block();
    }
}
