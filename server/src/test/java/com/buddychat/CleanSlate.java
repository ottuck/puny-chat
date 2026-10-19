package com.buddychat;

import com.buddychat.chat.SendLimiter;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.springframework.context.ApplicationContext;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Before each test, removes every document (indexes stay) and sets the clock back to now, so one
 * test class cannot see what another left in the shared context ({@link FlowTest}).
 */
class CleanSlate implements BeforeEachCallback {

    @Override
    public void beforeEach(ExtensionContext extension) {
        ApplicationContext context = SpringExtension.getApplicationContext(extension);
        ReactiveMongoTemplate mongo = context.getBean(ReactiveMongoTemplate.class);
        mongo.getCollectionNames()
                .filter(name -> !name.startsWith("system."))
                .flatMap(name -> mongo.remove(new Query(), name))
                .blockLast();
        context.getBean(MutableClock.class).reset();
        context.getBean(SendLimiter.class).clear();
    }
}
