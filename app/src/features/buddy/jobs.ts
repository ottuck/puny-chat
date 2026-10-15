import type { BuddyJob } from './api';

// What a buddy grows up to be (docs/fun-improvements.md, 직업). The server counts and decides; this is
// only how a job is shown: its name and reason are under buddy.job and buddy.jobWhy in the
// translations. The icon stands for it on the screens made of text (the chat card, the detail, the album);
// the stage shows the job by its look and its station instead.
export const JOB_ICON: Record<BuddyJob, string> = {
  CHEF: '🍳',
  GARDENER: '🌱',
  DJ: '🎧',
  WRITER: '✒️',
  BARISTA: '☕',
};

// The order they are listed in when choosing: the same as the server's tie order (server: BuddyJob).
export const JOB_ORDER: readonly BuddyJob[] = ['CHEF', 'GARDENER', 'DJ', 'WRITER', 'BARISTA'];

// A job from a version of the server this app does not know is not shown.
export function isJob(value: string | undefined): value is BuddyJob {
  return value !== undefined && Object.hasOwn(JOB_ICON, value);
}
