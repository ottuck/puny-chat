package com.buddychat.buddy;

import java.time.Instant;

/**
 * A job event for one member at the buddy's station (docs/fun-improvements.md, 직업 이벤트): a coffee, a
 * dish or flowers handed over in the chat, a DJ's show, a writer's letter. The app has the lists of what
 * each job does and shows the one {@code pick} lands on, so a new kind needs no change here.
 *
 * @param to the member it is for
 * @param job the {@link BuddyJob} name it was made in
 * @param pick which of the job's events, as {@code pick % count} in the app
 */
public record Gift(String id, String to, String job, int pick, Instant at) {}
