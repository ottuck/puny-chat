import { Platform } from 'react-native';

import type { ReactionKind } from '../../reactions';

// The stage's sizes and timings (buddy-stage.tsx).

export const FLOOR = 22;
// The corner button's square (buddy-scene.tsx).
export const CORNER_SIZE = 36;
// Where the wall's things begin, below the name and level.
export const WALL_TOP = 34;
export const PROP_SCALE = 3;
// How wide the meal table is, in its pixels (sprites.ts, mealTable).
export const TABLE_CELLS = 27;
export const TICK_MS = 450;
// While evolving the old and new looks swap this fast.
export const FAST_TICK_MS = 90;
// Shaking its head, it sways from side to side this fast (a body moved, not mirrored: mirrored, only
// the light on its head jumped about).
export const SHAKE_TICK_MS = 150;
export const PET_MS = 900;

// Both petted it within this long: a bigger moment than either alone.
export const CO_PET_MS = 4000;

// How long the butterfly takes to come down onto the head, and to fly off again.
export const BUTTERFLY_FLY_MS = 700;
// The walk over to the window to watch the weather (weather.tsx) takes at most this long.
export const WINDOW_WALK_MAX_MS = 1200;
// The longest the walk over to the station may take before the work starts anyway.
export const JOB_WALK_MAX_MS = 4000;
// How long each point of the walk to work takes, in ms: a brisk walk.
export const JOB_WALK_MS = 12;
// How high the open book is held, in rows up from the bottom of the buddy's grid.
export const BOOK_ABOVE_FEET = 6;
// The station's left edge on the stage.
export const STATION_LEFT = 12;

// Leaving home: how long it waves before setting off, and how long each point of the walk takes.
export const LEAVE_WAVE_MS = 1100;
export const LEAVE_WALK_MS = 7;
// How often, left alone, it dances or sings.
export const IDLE_ACT_MIN_MS = 20_000;
export const IDLE_ACT_MAX_MS = 40_000;
// Floor kept free at the right end for the tour's egg.
export const EGG_ROOM = 72;

// How long each reaction plays.
export const REACTION_MS: Record<ReactionKind, number> = {
  message: 1400,
  fed: 3200,
  cleaned: 1800,
  pooped: 1400,
  worked: 1800,
  levelUp: 1600,
  maxLevel: 2600,
  evolved: 2600,
  jobChanged: 3200,
  together: 2400,
  here: 2000,
  joined: 3000,
};
// Of 'fed', the part spent chewing; the rest is a happy heart.
export const CHEW_MS = 2400;
// Of 'evolved' and 'jobChanged', the transformation (rings of light, old and new looks flickering);
// the rest shows off the new look with a burst of sparkles.
export const EVOLVE_MS = 1400;
// A note over the stage shows for this long: the next goal after growing ("Lv.5에 꼬마가 돼요"), or
// when the job can be changed.
export const NOTICE_MS = 4500;
// Between two notes in a row.
export const NOTICE_GAP_MS = 300;
// After a level up or a job change, the note waits this long for the buddy's new state to arrive.
export const NOTICE_AFTER_MS = 500;
export const GLOW_MS = 450;
// Where the burst's sparkles fly, from the buddy's middle.
export const BURST = [
  [-1, -1],
  [1, -1],
  [-1, 0.3],
  [1, 0.3],
] as const;
// The web has no native animation driver (it would warn and fall back anyway).
export const NATIVE_DRIVER = Platform.OS !== 'web';

// The most seen motions in the room, so each is short and lands softly: the thought of food bursts
// like a bubble when fed, the table drops into place for the meal and sinks away after, and a poop
// tapped away squashes, then hops up and away.
export const THOUGHT_POP_MS = 220;
// Where the thought of food floats over the head (styles.thought), and the extra room around it
// that a tap on it still counts in.
export const THOUGHT_TOP = 40;
export const THOUGHT_SLOP = 10;
export const TABLE_AWAY_MS = 240;
export const POOP_AWAY_MS = 460;

export function gridScale(height: number, gridHeight: number): number {
  // Up to 5 points per pixel, smaller on short screens so the grown-up buddy still fits.
  return Math.max(3, Math.min(5, Math.floor((height - 84) / gridHeight)));
}
