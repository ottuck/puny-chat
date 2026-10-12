package com.buddychat.chat;

import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Retry state until authored history has been removed and affected clients notified. */
@Document("history_deletions")
record HistoryDeletion(@Id String id, List<String> roomIds) {}
