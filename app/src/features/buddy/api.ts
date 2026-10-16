import { api } from '@/lib/api';

export type BuddyStage = 'EGG' | 'BABY' | 'CHILD' | 'ADULT';

// What it grows up to be, from how the two raised it (server: buddy/BuddyJob).
export type BuddyJob = 'CHEF' | 'GARDENER' | 'DJ' | 'WRITER' | 'BARISTA';

// Once a day, when both members have sent a message that day. server: BuddyRules.TOGETHER_EXP
export const TOGETHER_EXP = 10;
// From this level it may go its own way. server: BuddyRules.GRADUATE_AT
export const GROWN_LEVEL = 20;
// The level each stage after it starts at, and where its job is settled; told to the user as goals.
// server: BuddyRules.BABY_AT, CHILD_AT, ADULT_AT, JOB_AT
export const NEXT_STEP_AT: Record<BuddyStage, number> = { EGG: 3, BABY: 5, CHILD: 10, ADULT: 12 };
// Levels where the job may be changed once (from the top level, any time). server: BuddyRules.JOB_CHANGE_FROM
export const JOB_CHANGE_LEVELS = [20, 30, 40];

// Computed by the server (server/src/main/java/com/buddychat/buddy/BuddyView.java); the app only
// displays it and does not re-derive the rules.
export type BuddyView = {
  name: string;
  exp: number;
  level: number;
  stage: BuddyStage;
  levelProgress: number; // 0..1 within the current level
  fullness: number; // 0..100
  poops: number;
  hungry: boolean;
  canFeed: boolean;
  canClean: boolean;
  // At the top level: ready to go its own way.
  grown: boolean;
  // Members who sent a message today (Japan time), and whether both have: the day's bonus is in.
  talkedToday: string[];
  togetherToday: boolean;
  // Fixed when it becomes an adult; null before, and for adults from before jobs existed.
  job: BuddyJob | null;
  // As a child, the job it is heading for so far.
  leaning: BuddyJob | null;
  // The job may be changed now: once at 20, 30 and 40, any time from 50.
  canChangeJob: boolean;
  // While it cannot: the level the next change opens at.
  jobChangeAt: number | null;
};

// changed: false when it was not needed, or the other member just did it.
type CareResult = { buddy: BuddyView; changed: boolean };

export const feedBuddy = () => api<CareResult>('/api/rooms/me/buddy/feed', { method: 'POST' });

export const cleanBuddy = () => api<CareResult>('/api/rooms/me/buddy/clean', { method: 'POST' });
// A grown-up's work at its station; EXP once an hour (`changed: false` otherwise).
export const workBuddy = () => api<CareResult>('/api/rooms/me/buddy/work', { method: 'POST' });
// Off to the hot spring; EXP when it has been a while (`changed: false` otherwise).
export const batheBuddy = () => api<CareResult>('/api/rooms/me/buddy/bath', { method: 'POST' });

// An adult's job, chosen by either of us instead of the one its upbringing gave; once a day.
export const changeJob = (job: BuddyJob) =>
  api<BuddyView>('/api/rooms/me/buddy/job', { method: 'POST', body: { job } });

// The grown buddy goes into the album; a new egg with this name takes its place.
export const graduateBuddy = (buddyName: string) =>
  api<BuddyView>('/api/rooms/me/buddy/graduate', { method: 'POST', body: { buddyName } });
