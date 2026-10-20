package com.buddychat.buddy;

import java.time.Instant;

/**
 * Something a grown-up made for one member at its station (docs/fun-improvements.md, 직업 선물): a
 * coffee, a dish, a cutting from the garden, a record or a postcard. The app has the list of what each job
 * makes and shows the one {@code pick} lands on, so a new kind needs no change here.
 *
 * @param to the member it is for
 * @param job the {@link BuddyJob} name it was made in
 * @param pick which of the job's gifts, as {@code pick % count} in the app
 */
public record Gift(String id, String to, String job, int pick, Instant at) {}
