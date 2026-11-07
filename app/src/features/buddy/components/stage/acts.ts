import type { BuddyJob, BuddyView } from '../../api';
import type { ChatWord, Mood } from '../../chat-words';
import { isWinter } from '../../pixel/looks';
import type { Pose } from '../../pixel/sprites';
import { type Line, pick } from '../../use-buddy-talk';
import { GUEST_MS, type Guest, GUESTS, isFloorPasser } from '../room-props';

// What the buddy does on the stage (buddy-stage.tsx): the acts it picks by itself, the cues and
// moods it is asked for, and what it says with them.

// Things the buddy does by itself: a dance, a song, shaking its head at a full bowl, or the small
// happenings (docs/fun-improvements.md, 가끔 생기는 사건): a hiccup, a start, a look around, a yawn, and
// with pictures, a butterfly landing on its head, a shower under an umbrella, a shooting star in a sky
// gone dark for a moment.
export type Act =
  | 'dance'
  | 'sing'
  | 'refuse'
  | 'hiccup'
  | 'startle'
  | 'lookAround'
  | 'yawn'
  | 'butterfly'
  | 'rain'
  | 'snow'
  | 'shootingStar'
  // Guests the room has grown into (stage-decor.tsx): at the window, or a toy train on the floor.
  | Guest
  // A child or grown-up sits down on the rug for a while.
  | 'sit'
  // Or goes over to a thing in the room and uses it (USES).
  | Use
  | 'job';
// Left alone, a child or grown-up uses what the room has (docs/fun-improvements.md, 가끔 생기는
// 사건): it starts the music box and dances to it, waits at the window until a guest comes, watches
// the goldfish, takes a book from the shelf and reads it.
export const USES = ['musicBox', 'waitGuest', 'watchFish', 'read'] as const;
export type Use = (typeof USES)[number];
export const isUse = (act: Act | null): act is Use =>
  act !== null && (USES as readonly string[]).includes(act);
// A one-word message for the buddy ("밥", "춤", …, features/buddy/chat-words.ts), or the tour's
// script asking for a dance or a song.
// "job": the buddy does its work (only asked for by the art preview, app/preview.tsx).
// The happenings can be cued too, but only the preview screen does (app/preview.tsx).
const HAPPENINGS = [
  'hiccup',
  'startle',
  'lookAround',
  'yawn',
  'butterfly',
  'rain',
  'snow',
  'shootingStar',
  'snail',
  'sparrow',
  'catTail',
  'train',
  'robot',
  'kitten',
  'vacuum',
  'ladybug',
  'dragonfly',
  'swallow',
  'owl',
  'squirrel',
  'sit',
  ...USES,
] as const;
type Happening = (typeof HAPPENINGS)[number];
export const isHappening = (kind: string): kind is Happening =>
  (HAPPENINGS as readonly string[]).includes(kind);
export const isGuest = (act: Act | null): act is Guest =>
  act !== null && (GUESTS as readonly string[]).includes(act);
export type Cue = { id: string; kind: ChatWord | Mood | 'job' | Happening };
// How long a mood from the chat ("사랑해", "ㅋㅋ", …, chat-words.ts) shows, and what the buddy says.
export type StageMood = Mood | 'coPet';
export const MOOD_MS: Record<StageMood, number> = {
  coPet: 2400,
  laugh: 1800,
  love: 2200,
  goodnight: 4000,
  cheer: 1800,
  comfort: 1800,
  morning: 1400,
};
export const MOOD_LINE: Record<StageMood, Line> = {
  coPet: 'coPet',
  laugh: 'laugh',
  love: 'love',
  goodnight: 'goodnight',
  cheer: 'cheer',
  comfort: 'comfort',
  morning: 'morning',
};

export const ACT_REPEATS = 1;
export const ACT_MS: Record<Act, number> = {
  dance: 300,
  sing: 800,
  refuse: 900,
  hiccup: 900,
  startle: 900,
  lookAround: 1400,
  yawn: 1500,
  butterfly: 4200,
  rain: 5000,
  snow: 5000,
  shootingStar: 2800,
  ...GUEST_MS,
  // At the station, once there.
  job: 2400,
  // On the rug, once there.
  sit: 5000,
  // Using a thing, once there; at the window, how long it waits before a guest comes.
  musicBox: 5000,
  waitGuest: 2600,
  watchFish: 5000,
  read: 5500,
};
// The weather outside the window (weather.tsx), which the buddy goes over to watch.
export const WEATHER: readonly Act[] = ['rain', 'snow', 'shootingStar'];

// What it says as it happens, once grown.
export const ACT_LINE: Partial<Record<Act, Line>> = {
  hiccup: 'hiccup',
  startle: 'startle',
  lookAround: 'lookAround',
  yawn: 'yawn',
  butterfly: 'butterfly',
  rain: 'rain',
  snow: 'snow',
  shootingStar: 'shootingStar',
  snail: 'snail',
  sparrow: 'sparrow',
  catTail: 'catTail',
  train: 'train',
  robot: 'robot',
  kitten: 'kitten',
  vacuum: 'vacuum',
  ladybug: 'ladybug',
  dragonfly: 'dragonfly',
  swallow: 'swallow',
  owl: 'owl',
  squirrel: 'squirrel',
  sit: 'sit',
  musicBox: 'musicBox',
  waitGuest: 'waitGuest',
  watchFish: 'fish',
  read: 'read',
};
// What it says looking out of the window, by the sky (room.ts, skyAt).
export const WINDOW_LINE = { day: 'windowDay', dusk: 'windowDusk', night: 'windowNight' } as const;
// What it does when left alone, by weight: dancing and singing most, the small happenings between.
const IDLE_ACTS: readonly (readonly [Act, number])[] = [
  ['dance', 25],
  ['sing', 25],
  ['hiccup', 15],
  ['startle', 15],
  ['lookAround', 10],
  ['yawn', 10],
  ['butterfly', 8],
  ['rain', 6],
  ['shootingStar', 6],
];
// A grown buddy with a job also does its work (docs/fun-improvements.md, 직업).
const JOB_ACT_WEIGHT = 30;
// The room's guests, once it has them, as often as a butterfly.
const GUEST_WEIGHT = 8;
// The floor's passers (the train, the tin robot, the kitten, the vacuum) together, a little more
// often: one about every 8 to 10 minutes while the stage is open and the buddy left alone.
const PASSER_WEIGHT = 12;
// A child or grown-up sits down on the rug now and then.
const SIT_WEIGHT = 10;
// And uses each thing the room has a little less often, so the dancing and singing stay the most.
const USE_WEIGHT = 6;

// `dark`: from the evening on (room.ts, skyAt), when a shooting star can be seen. The weather is
// seen through the window, so none before the room has one (Lv.3). `uses`: the things there are to
// use (a child or grown-up's).
export function pickIdleAct(
  job: BuddyJob | null,
  guests: readonly Guest[],
  sits: boolean,
  dark: boolean,
  hasWindow: boolean,
  uses: readonly Use[],
): Act {
  const passers = guests.filter(isFloorPasser);
  const acts: readonly (readonly [Act, number])[] = [
    ...IDLE_ACTS.filter(
      ([act]) => (hasWindow || !WEATHER.includes(act)) && (dark || act !== 'shootingStar'),
    ),
    ...(sits ? [['sit', SIT_WEIGHT] as const] : []),
    ...uses.map((use) => [use, USE_WEIGHT] as const),
    ...guests
      .filter((guest) => !isFloorPasser(guest))
      .map((guest) => [guest, GUEST_WEIGHT] as const),
    // Those passing along the floor take turns, as one happening: one of them, now and then.
    ...(passers.length > 0 ? [[pick(passers), PASSER_WEIGHT] as const] : []),
    ...(job ? [['job', JOB_ACT_WEIGHT] as const] : []),
  ];
  let roll = Math.random() * acts.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [act, weight] of acts) {
    roll -= weight;
    // In winter the rain comes as snow.
    if (roll < 0) return act === 'rain' && isWinter(new Date()) ? 'snow' : act;
  }
  return 'dance';
}

// The face at work, at its station (JOB_STATIONS); the station's own frames do the rest.
export function jobPose(job: BuddyJob, tick: number): Pose {
  switch (job) {
    case 'CHEF': // stirring the pot, swaying to it
      return tick % 2 === 0 ? 'happy' : 'idle';
    case 'GARDENER': // watering the plant
      return 'happy';
    case 'DJ': // on air, nodding to the music
      return tick % 2 === 0 ? 'happy' : 'blink';
    case 'WRITER': // writing, and liking it
      return tick % 3 === 0 ? 'blink' : 'happy';
    case 'BARISTA': // talking over the coffee
      return tick % 2 === 0 ? 'eat' : 'happy';
  }
}

export type Notice = {
  key:
    | `nextStage.${BuddyView['stage']}`
    | `notice.${'jobChangeOpen' | 'jobChangeSoon' | 'jobChangeAt' | 'jobChangeFree' | 'newJob'}`;
  level?: number;
  job?: BuddyJob;
};
// After the job settled or changed: when it can be changed next, or that it can be any time.
export const nextJobChange = (now: BuddyView): Notice | null =>
  now.jobChangeAt
    ? { key: 'notice.jobChangeAt', level: now.jobChangeAt }
    : now.canChangeJob
      ? { key: 'notice.jobChangeFree' }
      : null;
