package com.buddychat.room;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.buddychat.common.ApiException;
import com.buddychat.realtime.RoomHub;
import com.buddychat.realtime.ServerEvent;
import java.util.Collection;
import org.jspecify.annotations.Nullable;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** Checks current membership, including sockets authenticated before a conversation was closed. */
@Service
public class RoomAccess {
    private final ReactiveMongoTemplate mongo;
    private final RoomHub hub;

    RoomAccess(ReactiveMongoTemplate mongo, RoomHub hub) {
        this.mongo = mongo;
        this.hub = hub;
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

    public Mono<Long> historyVersion(String roomId) {
        return mongo.findById(roomId, Room.class)
                .map(room -> room.historyVersion() == null ? 0L : room.historyVersion())
                .defaultIfEmpty(0L);
    }

    /** Invalidates cached history, including on devices disconnected during account deletion. */
    public Mono<Void> invalidateHistory(Collection<String> roomIds, @Nullable String deletedUserId) {
        return Flux.fromIterable(roomIds)
                .concatMap(roomId -> mongo.findAndModify(
                                query(where("_id").is(roomId)),
                                new Update().inc("historyVersion", 1L),
                                FindAndModifyOptions.options().returnNew(true),
                                Room.class)
                        .doOnNext(room -> hub.publish(
                                roomId, new ServerEvent.HistoryChanged(room.historyVersion(), deletedUserId), null)))
                .then();
    }

    public Mono<Void> forgetTalker(String userId) {
        return mongo.updateMulti(
                        query(where("buddy.talkers").is(userId)),
                        new Update().pull("buddy.talkers", userId),
                        Room.class)
                .then();
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND");
    }
}
