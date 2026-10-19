package com.buddychat.realtime;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import org.jspecify.annotations.Nullable;

/** Messages the app sends over the WebSocket (docs/PROJECT.md, "WebSocket 프로토콜"). */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = ClientEvent.Auth.class, name = "auth"),
    @JsonSubTypes.Type(value = ClientEvent.Send.class, name = "send"),
    @JsonSubTypes.Type(value = ClientEvent.Typing.class, name = "typing"),
    @JsonSubTypes.Type(value = ClientEvent.Read.class, name = "read"),
    @JsonSubTypes.Type(value = ClientEvent.Pet.class, name = "pet"),
    @JsonSubTypes.Type(value = ClientEvent.React.class, name = "react"),
    @JsonSubTypes.Type(value = ClientEvent.Ping.class, name = "ping"),
})
sealed interface ClientEvent {

    record Auth(String token) implements ClientEvent {}

    record Send(String clientMessageId, String text) implements ClientEvent {}

    /** Sent again every few seconds while typing; the others let it lapse on their own. */
    record Typing(boolean typing) implements ClientEvent {}

    /** The newest message the user has seen in the room. */
    record Read(String messageId) implements ClientEvent {}

    /** The user petted the buddy. Only passed on to the other member, never stored. */
    record Pet() implements ClientEvent {}

    /** The user's reaction on a text message (LIKE, SAD, WOW), or null to take it off. */
    record React(String messageId, @Nullable String reaction) implements ClientEvent {}

    record Ping() implements ClientEvent {}
}
