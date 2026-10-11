package com.buddychat.room;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.common.ApiException;
import org.jspecify.annotations.Nullable;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/** Checks current membership, including sockets authenticated before a conversation was closed. */
@Service
public class RoomAccess {
    private final ReactiveMongoTemplate mongo;

    RoomAccess(ReactiveMongoTemplate mongo) {
        this.mongo = mongo;
    }

    public Mono<Void> requireMember(@Nullable String roomId, String userId) {
        if (roomId == null) return Mono.error(notFound());
        return mongo.exists(
                        query(where("_id")
                                .is(roomId)
                                .and("memberIds")
                                .is(userId)
                                .and("closureId")
                                .is(null)),
                        Room.class)
                .flatMap(member -> member ? Mono.empty() : Mono.error(notFound()));
    }

    public Mono<Boolean> isOpen(String roomId) {
        return mongo.exists(query(where("_id").is(roomId).and("closureId").is(null)), Room.class);
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND");
    }
}
