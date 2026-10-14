import type { BuddyJob } from './api';

// What a buddy grows up to be (docs/fun-improvements.md, 5). The server counts and decides; this is
// only how a job is shown: its name and reason are under buddy.job and buddy.jobWhy in the
// translations. Until the dot art for each job exists (the hat, the broom, …) the icon stands for it.
export const JOB_ICON: Record<BuddyJob, string> = {
  CHEF: '🍳',
  CLEANER: '🧹',
  OWL: '🦉',
  COMEDIAN: '🎭',
  ROMANTIC: '💌',
  CHATTERBOX: '💬',
};

// The order they are listed in when choosing: the same as the server's tie order (server: BuddyJob).
export const JOB_ORDER: readonly BuddyJob[] = [
  'CHEF',
  'CLEANER',
  'OWL',
  'COMEDIAN',
  'ROMANTIC',
  'CHATTERBOX',
];

// A job from a version of the server this app does not know is not shown.
export function isJob(value: string | undefined): value is BuddyJob {
  return value !== undefined && Object.hasOwn(JOB_ICON, value);
}
