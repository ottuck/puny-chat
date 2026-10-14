import type { BuddyJob } from './api';

// What a buddy grows up to be (docs/fun-improvements.md, 5). The server counts and decides; this is
// only how a job is shown: its name and reason are under buddy.job and buddy.jobWhy in the
// translations. Until the dot art for each job exists (the hat, the watering can, …) the icon stands for it.
//
// The ids are what the server stores, so they stay as they were; the jobs they show as were renamed
// (docs/fun-improvements.md, 6): CHEF = chef, CLEANER = gardener (clearing the floor is tending it),
// OWL = radio DJ (the small hours), COMEDIAN = comedian, ROMANTIC = poet, CHATTERBOX = barista.
export const JOB_ICON: Record<BuddyJob, string> = {
  CHEF: '🍳',
  CLEANER: '🌱',
  OWL: '🎧',
  COMEDIAN: '🎤',
  ROMANTIC: '✒️',
  CHATTERBOX: '☕',
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
