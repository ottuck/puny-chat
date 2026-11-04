import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { useColorMode, useColors } from '@/theme';

import { type BuddyJob, type BuddyView, JOB_CHANGE_LEVELS, NEXT_STEP_AT } from '../api';
import { JOB_ICON } from '../jobs';
import { isFullMoon } from '../moon';
import {
  BUTTERFLY,
  butterflyAt,
  dressedFrame,
  HEART_BIG,
  isWinter,
  type Layer,
  SEASON_CORNER,
  type Season,
  seasonBehind,
  seasonFront,
  seasonOn,
  umbrellaFor,
} from '../pixel/looks';
import { type Palette, PixelSprite } from '../pixel/pixel-sprite';
import { BUNDLE, ROOM_PALETTE, skyAt } from '../pixel/room';
import { type FishStyle, OPEN_BOOK, THINGS_PALETTE } from '../pixel/room-things';
import {
  bowl,
  BUDDY_PALETTE,
  buddyFrame,
  DREAM_FOOD,
  DREAM_PALETTE,
  EXCLAIM,
  HEART,
  JOB_STATIONS,
  type Station,
  LEVEL_UP,
  mealTable,
  NOTE,
  POOP,
  type Pose,
  PROP_PALETTE,
  RICE,
  seated,
  SIT_ROWS,
  SPARKLE,
  STAGE_ORDER,
  THOUGHT_FOOD,
  ZZZ,
} from '../pixel/sprites';
import type { Reaction, ReactionKind } from '../reactions';
import type { ChatWord, Mood } from '../chat-words';
import { JOB_LINES, type Line, NEW_JOB_LINE, pick, useBuddyTalk } from '../use-buddy-talk';
import { RoomLight, roomHour } from './room-light';
import { SpeechBubble } from './speech-bubble';
import { Feathers, TOP_NOTE_MS, TopLevelLight, TopLevelNotes } from './top-level';
import {
  Arrive,
  GUEST_MS,
  type Guest,
  GUESTS,
  isFloorPasser,
  RoomSparkle,
  Tappable,
  Passer,
  useNow,
} from './room-props';
import {
  decorFor,
  glassOf,
  lampShadeAt,
  Plant,
  plantRoom as plantRoomFor,
  type RoomProp,
  sideRoom,
  thingsAt,
  WallDecor,
} from './stage-decor';

// The buddy's stage above the chat (docs/PROJECT.md, 핵심 경험): the buddy walks around, waits by
// an empty bowl when hungry, leaves poops on the floor and sleeps at night. Tapping the bowl or a
// poop takes care of it right there, and it reacts to what happens in the room: eating when fed,
// straining when it poops, sparkling when cleaned, hopping at a new message, and evolving. Left
// alone it dances or sings now and then, and once grown it talks (use-buddy-talk.ts). It keeps its
// size while typing and reading back: a stage that folds and unfolds moved the chat under the
// finger and broke scrolling.

export const FLOOR = 22;
// The corner button's square (buddy-scene.tsx).
export const CORNER_SIZE = 36;
// Where the wall's things begin, below the name and level.
const WALL_TOP = 34;
const PROP_SCALE = 3;
// How wide the meal table is, in its pixels (sprites.ts, mealTable).
const TABLE_CELLS = 27;
const TICK_MS = 450;
// While evolving the old and new looks swap this fast.
const FAST_TICK_MS = 90;
// Shaking its head, it sways from side to side this fast (a body moved, not mirrored: mirrored, only
// the light on its head jumped about).
const SHAKE_TICK_MS = 150;
const PET_MS = 900;
// Things the buddy does by itself: a dance, a song, shaking its head at a full bowl, or the small
// happenings (docs/fun-improvements.md, 가끔 생기는 사건): a hiccup, a start, a look around, a yawn, and
// with pictures, a butterfly landing on its head, a shower under an umbrella, a shooting star in a sky
// gone dark for a moment.
type Act =
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
const USES = ['musicBox', 'waitGuest', 'watchFish', 'read'] as const;
type Use = (typeof USES)[number];
const isUse = (act: Act | null): act is Use =>
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
const isHappening = (kind: string): kind is Happening =>
  (HAPPENINGS as readonly string[]).includes(kind);
const isGuest = (act: Act | null): act is Guest =>
  act !== null && (GUESTS as readonly string[]).includes(act);
export type Cue = { id: string; kind: ChatWord | Mood | 'job' | Happening };
// How long a mood from the chat ("사랑해", "ㅋㅋ", …, chat-words.ts) shows, and what the buddy says.
type StageMood = Mood | 'coPet';
const MOOD_MS: Record<StageMood, number> = {
  coPet: 2400,
  laugh: 1800,
  love: 2200,
  goodnight: 4000,
  cheer: 1800,
  comfort: 1800,
  morning: 1400,
};
const MOOD_LINE: Record<StageMood, Line> = {
  coPet: 'coPet',
  laugh: 'laugh',
  love: 'love',
  goodnight: 'goodnight',
  cheer: 'cheer',
  comfort: 'comfort',
  morning: 'morning',
};
// Both petted it within this long: a bigger moment than either alone.
const CO_PET_MS = 4000;
const ACT_REPEATS = 1;
const ACT_MS: Record<Act, number> = {
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
// How long the butterfly takes to come down onto the head, and to fly off again.
const BUTTERFLY_FLY_MS = 700;
// The weather outside the window (weather.tsx): the buddy goes over to watch it, in at most this long.
const WEATHER: readonly Act[] = ['rain', 'snow', 'shootingStar'];
const WINDOW_WALK_MAX_MS = 1200;
// The longest the walk over to the station may take before the work starts anyway.
const JOB_WALK_MAX_MS = 4000;
// How long each point of the walk to work takes, in ms: a brisk walk.
const JOB_WALK_MS = 12;
// How high the open book is held, in rows up from the bottom of the buddy's grid.
const BOOK_ABOVE_FEET = 6;
// The station's left edge on the stage.
const STATION_LEFT = 12;

// Where a held tool goes in the buddy's box: smaller than its own size, its right edge (the handle)
// stays at the hand and its middle at the same height.
function heldAt(held: NonNullable<Station['held']>, scale: number) {
  const width = held.frames[0][0].length;
  const height = held.frames[0].length;
  const own = scale * (held.size ?? 1);
  return {
    left: (held.col + width) * scale - width * own,
    top: held.row * scale + (height * (scale - own)) / 2,
  };
}
// What it says as it happens, once grown.
const ACT_LINE: Partial<Record<Act, Line>> = {
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
const WINDOW_LINE = { day: 'windowDay', dusk: 'windowDusk', night: 'windowNight' } as const;
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
function pickIdleAct(
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
// Leaving home: how long it waves before setting off, and how long each point of the walk takes.
export const LEAVE_WAVE_MS = 1100;
const LEAVE_WALK_MS = 7;
// How often, left alone, it dances or sings.
const IDLE_ACT_MIN_MS = 20_000;
const IDLE_ACT_MAX_MS = 40_000;
// Floor kept free at the right end for the tour's egg.
const EGG_ROOM = 72;
const SLEEP_FROM = 23;
const SLEEP_UNTIL = 7;
// The radio DJ (DJ) keeps the opposite hours: on air in the small hours, asleep through the morning.
const DJ_SLEEP_FROM = 3;
const DJ_SLEEP_UNTIL = 11;

// The face at work, at its station (JOB_STATIONS); the station's own frames do the rest.
function jobPose(job: BuddyJob, tick: number): Pose {
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
// How long each reaction plays.
const REACTION_MS: Record<ReactionKind, number> = {
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
const CHEW_MS = 2400;
// Of 'evolved' and 'jobChanged', the transformation (rings of light, old and new looks flickering);
// the rest shows off the new look with a burst of sparkles.
const EVOLVE_MS = 1400;
// A note over the stage shows for this long: the next goal after growing ("Lv.5에 꼬마가 돼요"), or
// when the job can be changed.
const NOTICE_MS = 4500;
// Between two notes in a row.
const NOTICE_GAP_MS = 300;
// After a level up or a job change, the note waits this long for the buddy's new state to arrive.
const NOTICE_AFTER_MS = 500;
type Notice = {
  key:
    | `nextStage.${BuddyView['stage']}`
    | `notice.${'jobChangeOpen' | 'jobChangeSoon' | 'jobChangeAt' | 'jobChangeFree' | 'newJob'}`;
  level?: number;
  job?: BuddyJob;
};
// After the job settled or changed: when it can be changed next, or that it can be any time.
const nextJobChange = (now: BuddyView): Notice | null =>
  now.jobChangeAt
    ? { key: 'notice.jobChangeAt', level: now.jobChangeAt }
    : now.canChangeJob
      ? { key: 'notice.jobChangeFree' }
      : null;
const GLOW_MS = 450;
// Where the burst's sparkles fly, from the buddy's middle.
const BURST = [
  [-1, -1],
  [1, -1],
  [-1, 0.3],
  [1, 0.3],
] as const;
// The web has no native animation driver (it would warn and fall back anyway).
const NATIVE_DRIVER = Platform.OS !== 'web';

type Props = {
  buddy: BuddyView;
  // A feed or clean request is in flight.
  busy: boolean;
  height: number;
  onFeed: () => void;
  onClean: () => void;
  // A grown-up's work at its station (EXP once an hour; the server decides).
  onWork: () => void;
  onOpenDetail: () => void;
  // The latest live event to react to.
  reaction: Reaction | null;
  // An egg resting at the far end: the tour's ending, "yours is next".
  companionEgg?: boolean;
  // Greets on opening ("good morning"); off in the tour.
  greets?: boolean;
  cue?: Cue | null;
  // When a text last came or went (ms): the buddy only starts a talk when it has been quiet.
  lastTalkAt?: number;
  // The partner petted the buddy just now (a new object each time), and this user did: to be
  // passed on to the partner.
  partnerPet?: { id: string } | null;
  onPet?: () => void;
  // The partner is connected too: the buddy is a little more lively.
  partnerHere?: boolean;
  // The season's look (pixel/looks.ts): by the date unless given (the art preview picks one).
  season?: Season | null;
  // Buttons in the top right corner (the hot spring, the album: buddy-scene.tsx), and how many.
  corner?: ReactNode;
  corners?: number;
  // Without its own margins and rounded frame: buddy-scene.tsx draws them around the scenes.
  bare?: boolean;
  // A cut of the dream (buddy-dream.tsx): no name or level, and the buddy stays in the middle.
  dream?: boolean;
  // Which kind of plant the pot shows, instead of the one the room drew (the art preview).
  plantKind?: number;
  // Told where the buddy's middle is across the stage as it walks (buddy-scene.tsx closes the iris
  // on it).
  onWalk?: (middle: number) => void;
  // Going its own way (buddy-scene.tsx): it waves goodbye with its things in a bundle on its back,
  // then walks off to the right.
  leaving?: boolean;
  // The hour the room's window, clock and lamp show instead of the device's (the art preview).
  hour?: number;
  // The day ("MM-DD") the room's seasonal things go by instead of today (the art preview).
  date?: string;
  // Opens the mailbox (the top level's note about the developer's letter).
  onOpenMail?: () => void;
  // Where the goldfish lives, being compared (the preview); the bowl on its table otherwise.
  fishStyle?: FishStyle;
};

// The room's time: the device's, or the hour and day the art preview picks (MM-DD this year, or
// YYYY-MM-DD for a moon).
function roomTime(clock: Date, hour?: number, date?: string): Date {
  if (hour === undefined && !date) return clock;
  const parts = date ? date.split('-').map(Number) : [clock.getMonth() + 1, clock.getDate()];
  const [year, month, day] = parts.length === 3 ? parts : [clock.getFullYear(), ...parts];
  return new Date(
    year,
    month - 1,
    day,
    hour ?? clock.getHours(),
    hour === undefined ? clock.getMinutes() : 10,
  );
}

// Local night hours, checked once a minute. `at`: the hour to go by instead (the art preview).
export function useSleeping(job: BuddyJob | null, at?: number): boolean {
  const [now, setHour] = useState(() => new Date().getHours());
  const hour = at ?? now;
  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);
  if (job === 'DJ') return hour >= DJ_SLEEP_FROM && hour < DJ_SLEEP_UNTIL;
  return hour >= SLEEP_FROM || hour < SLEEP_UNTIL;
}

// The season by the device's date, checked once an hour.
function useSeason(chosen: Season | null | undefined): Season | null {
  const [season, setSeason] = useState(() => seasonOn(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setSeason(seasonOn(new Date())), 3_600_000);
    return () => clearInterval(timer);
  }, []);
  return chosen === undefined ? season : chosen;
}

// Something drawn with the buddy (a look behind it, an umbrella, a butterfly), placed by the cells
// of its grid and mirrored with it when it turns.
function LayerSprite({
  layer,
  gridWidth,
  palette,
  scale,
  flipped,
}: {
  layer: Layer;
  gridWidth: number;
  palette: Palette;
  scale: number;
  flipped: boolean;
}) {
  const col = flipped ? gridWidth - layer.col - layer.frame[0].length : layer.col;
  return (
    <View style={[styles.layer, styles.passThrough, { left: col * scale, top: layer.row * scale }]}>
      <PixelSprite
        frame={layer.frame}
        palette={palette}
        scale={scale}
        flipped={flipped}
        smooth={palette === BUDDY_PALETTE}
      />
    </View>
  );
}

// A counter that drives frame changes (steps, blinks, chewing) at a toy-like pace.
function useTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return tick;
}

// The reaction playing now, and how far into it (in ticks of the phase that matters). A new event
// replaces the one playing.
function useActiveReaction(reaction: Reaction | null) {
  const [active, setActive] = useState<{ kind: ReactionKind; phase: 'main' | 'after' } | null>(
    null,
  );
  useEffect(() => {
    if (!reaction) return;
    const timers = [setTimeout(() => setActive({ kind: reaction.kind, phase: 'main' }), 0)];
    const main =
      reaction.kind === 'fed'
        ? CHEW_MS
        : reaction.kind === 'evolved' || reaction.kind === 'jobChanged'
          ? EVOLVE_MS
          : undefined;
    if (main !== undefined) {
      timers.push(setTimeout(() => setActive({ kind: reaction.kind, phase: 'after' }), main));
    }
    timers.push(setTimeout(() => setActive(null), REACTION_MS[reaction.kind]));
    return () => timers.forEach(clearTimeout);
  }, [reaction]);
  return active;
}

// The reaction to play: the latest, but a new level waits for the care that earned it
// (Reaction.follows, reactions.ts) to play to its end, and plays it first when it never came on its
// own (two events arriving together reach the stage as one change). A care played already is not
// played again.
function useQueuedReaction(latest: Reaction | null): Reaction | null {
  const [shown, setShown] = useState(latest);
  const playing = useRef<{ id?: string; at: number }>({ id: latest?.id, at: 0 });
  const played = useRef<string[]>([]);
  useEffect(() => {
    if (!latest || latest.id === playing.current.id) return;
    const show = (reaction: Reaction) => {
      playing.current = { id: reaction.id, at: Date.now() };
      played.current = [...played.current.slice(-9), reaction.id];
      setShown(reaction);
    };
    const care = latest.follows;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (care && care.id === playing.current.id) {
      const left = REACTION_MS[care.kind] - (Date.now() - playing.current.at);
      timers.push(setTimeout(() => show(latest), Math.max(0, left)));
    } else if (care && !played.current.includes(care.id)) {
      timers.push(
        setTimeout(() => show(care), 0),
        setTimeout(() => show(latest), REACTION_MS[care.kind]),
      );
    } else {
      timers.push(setTimeout(() => show(latest), 0));
    }
    return () => timers.forEach(clearTimeout);
  }, [latest]);
  return shown;
}

// A new poop drops onto the floor with a little bounce.
function DroppingIn({ children }: { children: React.ReactNode }) {
  const [drop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const fall = Animated.spring(drop, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: NATIVE_DRIVER,
    });
    fall.start();
    return () => fall.stop();
  }, [drop]);
  return (
    <Animated.View
      style={{
        opacity: drop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// Something that comes and goes with the moment (the thought of food, the meal's table): it springs
// in, and on the way out stays a beat to leave instead of blinking off. `value` runs 0 → 1 in, 1 → 0
// out; `present` is false once it has left.
function usePresence(on: boolean, leaveMs: number) {
  const [value] = useState(() => new Animated.Value(on ? 1 : 0));
  const [present, setPresent] = useState(on);
  if (on && !present) setPresent(true);
  useEffect(() => {
    const change = on
      ? Animated.spring(value, {
          toValue: 1,
          friction: 6,
          tension: 170,
          useNativeDriver: NATIVE_DRIVER,
        })
      : Animated.timing(value, {
          toValue: 0,
          duration: leaveMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        });
    // Gone once the leave ends, also when it is cut short: the thing's view making way for another
    // (the thought of food for the level-up mark or a heart) stops the animation, and it would
    // otherwise stay for good.
    change.start(() => !on && setPresent(false));
    return () => change.stop();
  }, [on, value, leaveMs]);
  return { present: on || present, value };
}

// The most seen motions in the room, so each is short and lands softly: the thought of food bursts
// like a bubble when fed, the table drops into place for the meal and sinks away after, and a poop
// tapped away squashes, then hops up and away.
const THOUGHT_POP_MS = 220;
// Where the thought of food floats over the head (styles.thought), and the extra room around it
// that a tap on it still counts in.
const THOUGHT_TOP = 40;
const THOUGHT_SLOP = 10;
const TABLE_AWAY_MS = 240;
const POOP_AWAY_MS = 460;

// A poop just cleaned up: squashed by the tap for a moment, then up and away, spinning and fading,
// with a sparkle.
function FlyingAway({
  id,
  onDone,
  style,
}: {
  id: string;
  onDone: (id: string) => void;
  style: StyleProp<ViewStyle>;
}) {
  const [away] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const fly = Animated.timing(away, {
      toValue: 1,
      duration: POOP_AWAY_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    });
    fly.start(({ finished }) => finished && onDone(id));
    return () => fly.stop();
  }, [away, id, onDone]);
  return (
    <Animated.View
      style={[
        style,
        styles.passThrough,
        {
          opacity: away.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1, 0] }),
          transform: [
            {
              translateY: away.interpolate({
                inputRange: [0, 0.12, 1],
                outputRange: [0, 2, -30],
              }),
            },
            {
              rotate: away.interpolate({
                inputRange: [0, 0.12, 1],
                outputRange: ['0deg', '0deg', '35deg'],
              }),
            },
            {
              scaleX: away.interpolate({
                inputRange: [0, 0.12, 0.3, 1],
                outputRange: [1, 1.25, 0.95, 0.55],
              }),
            },
            {
              scaleY: away.interpolate({
                inputRange: [0, 0.12, 0.3, 1],
                outputRange: [1, 0.7, 1.08, 0.55],
              }),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={POOP} palette={PROP_PALETTE} scale={PROP_SCALE} />
      <View style={styles.cleanSparkle}>
        <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={2} />
      </View>
    </Animated.View>
  );
}

export function gridScale(height: number, gridHeight: number): number {
  // Up to 5 points per pixel, smaller on short screens so the grown-up buddy still fits.
  return Math.max(3, Math.min(5, Math.floor((height - 84) / gridHeight)));
}

export function BuddyStage({
  buddy,
  busy,
  height,
  onFeed,
  onClean,
  onWork,
  onOpenDetail,
  reaction: latest,
  companionEgg,
  greets = true,
  cue: latestCue,
  lastTalkAt = 0,
  partnerPet: latestPartnerPet,
  onPet,
  partnerHere = false,
  season: chosenSeason,
  corner: cornerButton,
  corners = 1,
  bare = false,
  dream = false,
  plantKind,
  onWalk,
  leaving = false,
  hour,
  date,
  onOpenMail,
  fishStyle,
}: Props) {
  const colors = useColors();
  const colorMode = useColorMode();
  const { t } = useTranslation();
  // The stage mounts again each time it unfolds; what happened before that is not news. Without
  // this, focusing the composer and leaving it replayed the last evolution every time.
  const [mountedAfter] = useState(latest?.id);
  const reaction = useQueuedReaction(latest && latest.id !== mountedAfter ? latest : null);
  const active = useActiveReaction(reaction);
  const [cueMountedAfter] = useState(latestCue?.id);
  const cue = latestCue && latestCue.id !== cueMountedAfter ? latestCue : null;
  // Transforming: into the next stage, or into a new job.
  const changingJob = active?.kind === 'jobChanged';
  const evolving = (active?.kind === 'evolved' || changingJob) && active.phase === 'main';
  const [act, setAct] = useState<Act | null>(null);
  const [actRun, setActRun] = useState(0);
  const actTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useTick(evolving ? FAST_TICK_MS : act === 'refuse' ? SHAKE_TICK_MS : TICK_MS);
  const job = buddy.job;
  // The job before the latest change, for the change's old and new looks in turn.
  const [jobs, setJobs] = useState({ now: job, before: job });
  if (job !== jobs.now) setJobs({ now: job, before: jobs.now });
  const night = useSleeping(job, hour);
  const season = useSeason(chosenSeason);
  const [width, setWidth] = useState(0);
  const [walking, setWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [petted, setPetted] = useState(false);
  const petTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mood, setMood] = useState<StageMood | null>(null);
  const myPetAt = useRef(0);
  const partnerPetAt = useRef(0);
  const [petMountedAfter] = useState(latestPartnerPet?.id);
  const partnerPet =
    latestPartnerPet && latestPartnerPet.id !== petMountedAfter ? latestPartnerPet : null;
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placed = useRef(false);
  const [x] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  // A reaction's hops, on top of the buddy's own (dancing, a hiccup), so that neither stops the
  // other halfway.
  const [leap] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => Animated.add(hop, leap));
  const [tilt] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  const [nudge] = useState(() => new Animated.Value(0));
  const [note] = useState(() => new Animated.Value(0));
  const [flutter] = useState(() => new Animated.Value(0));
  // How many showers have ended (the window shows a rainbow after one).
  const [rainEnded, setRainEnded] = useState(0);
  // Which half of the stage the buddy is heading to, so its speech bubble opens toward the middle.
  const [onRightHalf, setOnRightHalf] = useState(false);

  const egg = buddy.stage === 'EGG';
  // A reaction wakes a sleeping buddy for a moment, "good night" puts it to sleep by day too.
  const sleeping = ((night && !mood) || mood === 'goodnight') && !active && !petted && !leaving;
  const idleFrame = buddyFrame(buddy.stage, 'idle');
  const scale = gridScale(height, idleFrame.length);
  const spriteWidth = idleFrame[0].length * scale;
  const spriteHeight = idleFrame.length * scale;
  const glowSize = Math.round(spriteWidth * 1.5);
  const bowlWidth = 12 * PROP_SCALE;
  // A child or grown-up has hands: no bowl stands about, a table comes out for the meal.
  const atTable = buddy.stage === 'CHILD' || buddy.stage === 'ADULT';
  const clock = useNow();
  const now = roomTime(clock, hour, date);
  const roomDecor = decorFor(buddy.level, buddy.name, plantKind, now);
  const decor = fishStyle ? { ...roomDecor, fishStyle } : roomDecor;
  // The lamp, lit in the evening and at night unless switched (until the stage opens again).
  const [lampOn, setLampOn] = useState<boolean | null>(null);
  // The tree fruits while the stage is open (Lv.45): its oranges pop out one by one, and the buddy
  // says so. Counted, so the tree is drawn again for each time (the preview goes back and forth).
  const [plantNow, setPlantNow] = useState(decor.plant);
  const [fruiting, setFruiting] = useState(0);
  if (decor.plant !== plantNow) {
    if (decor.plant === 5 && plantNow === 4) setFruiting(fruiting + 1);
    setPlantNow(decor.plant);
  }
  // Evening and night: the lamp is lit, and a shooting star may cross the sky.
  const darkSky = skyAt(now.getHours()) !== 'day';
  const lampLit = lampOn ?? darkSky;
  // The season's corner stands in for the plant that week.
  const corner = season ? SEASON_CORNER[season] : undefined;
  const plantRoom = corner
    ? Math.ceil(corner.frame[0].length * corner.size * scale) + 8
    : plantRoomFor(decor);
  // The bowl stands by the plant (and the lamp and the side table) on the right; the poops land
  // left of it.
  const bowlRight = 16 + plantRoom + sideRoom(decor);
  const guests = decor.guests.join(',');
  // The guests that come to the window (not along the floor).
  const windowGuests = decor.guests.filter((guest) => !isFloorPasser(guest));
  // What a child or grown-up can go over and use (USES): the music box, the window once guests come
  // to it, the goldfish, the books.
  const uses = (
    atTable
      ? [
          decor.musicBox && 'musicBox',
          decor.window && windowGuests.length > 0 && 'waitGuest',
          decor.fish > 0 && 'watchFish',
          decor.books > 0 && 'read',
        ]
      : []
  )
    .filter((use): use is Use => typeof use === 'string')
    .join(',');
  const poopRight = atTable ? bowlRight : bowlRight + bowlWidth + 12;
  // The walkable strip: from the left (in front of a job's station) up to the bowl.
  // Wings stick out on both sides: the walk keeps them on the stage and off the bowl.
  const behind = seasonBehind(buddy.stage, season);
  const reach = behind ? Math.max(0, -behind.col) * scale : 0;
  const minX = 16 + reach;
  const maxX = Math.max(
    minX,
    width -
      spriteWidth -
      reach -
      bowlRight -
      (atTable ? 0 : bowlWidth) -
      8 -
      (companionEgg ? EGG_ROOM : 0),
  );
  // A grown-up's station on the left, where it goes to work.
  const station = buddy.stage === 'ADULT' && job ? JOB_STATIONS[job] : null;
  // A station that comes while the stage is open (the job settled at Lv.10, or changed) pops in.
  const [jobAtMount] = useState(job);
  // The station's cell: the buddy's pixel, or finer.
  const cell = scale * (station?.fine ?? 1);
  const stationX = station ? STATION_LEFT + station.standAt * cell : 0;
  // Its right end, past what stands behind the buddy too, so the buddy walks clear of it.
  const stationRight = station
    ? STATION_LEFT +
      Math.max(
        station.frames[0][0].length,
        station.behind ? station.behind.col + station.behind.frame[0].length : 0,
      ) *
        cell
    : 0;
  const eating = active?.kind === 'fed';
  const settled = sleeping || buddy.hungry || egg || eating || evolving || dream || leaving;
  const acting = act !== null;
  const { line, say, hush } = useBuddyTalk({
    stage: buddy.stage,
    quiet: sleeping || !!active || acting || !!mood,
    greets,
    lastTalkAt,
    job,
  });
  // The evolution has the stage to itself: what was being said ("배고파…") goes, and nothing is
  // shown over the growing and shrinking body until it settles.
  useEffect(() => {
    if (evolving) hush();
  }, [evolving, hush]);
  // Fed: no more "배고파…" over the meal.
  const fedNow = !buddy.hungry;
  useEffect(() => {
    if (fedNow && line === 'hungry') hush();
  }, [fedNow, line, hush]);

  useEffect(() => {
    if (!onWalk) return;
    const id = x.addListener(({ value }) => onWalk(value + spriteWidth / 2));
    return () => x.removeListener(id);
  }, [onWalk, x, spriteWidth]);

  const perform = useCallback(
    (next: Act, replaceCurrent = false, spoken?: Line) => {
      // Only explicit cues replace an action. A queued idle callback must respect the tap lock.
      if (!replaceCurrent && (actTimer.current || petTimer.current)) return;
      if (actTimer.current) clearTimeout(actTimer.current);
      if (petTimer.current) clearTimeout(petTimer.current);
      petTimer.current = null;
      setPetted(false);
      setAct(next);
      // The same cue must restart the finite animation even when its kind has not changed.
      setActRun((run) => run + 1);
      const line = spoken ?? (next === 'job' && job ? pick(JOB_LINES[job]) : ACT_LINE[next]);
      if (line) say(line);
      actTimer.current = setTimeout(
        () => {
          actTimer.current = null;
          setAct(null);
        },
        // Work starts on arrival (see below), which restarts this; the walk is the most it waits.
        next === 'job' || next === 'sit' || isUse(next)
          ? JOB_WALK_MAX_MS + ACT_MS[next]
          : ACT_MS[next],
      );
    },
    [say, job],
  );

  // A word from the chat that moves it: for a moment it shows how it feels, and says so once grown.
  const startMood = useCallback(
    (next: StageMood) => {
      if (actTimer.current) clearTimeout(actTimer.current);
      if (petTimer.current) clearTimeout(petTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
      actTimer.current = null;
      petTimer.current = null;
      setAct(null);
      setPetted(false);
      setMood(next);
      // A writer answers "love" in its own words.
      say(job === 'WRITER' && next === 'love' ? 'writerLove' : MOOD_LINE[next]);
      moodTimer.current = setTimeout(() => {
        moodTimer.current = null;
        setMood(null);
      }, MOOD_MS[next]);
    },
    [say, job],
  );

  // Wander: walk to a random spot, look around, repeat. A hungry or eating buddy stays by the bowl,
  // a sleeping one stays put, and an egg only wobbles.
  useEffect(() => {
    if (width === 0 || leaving) return;
    // Dancing, singing or feeling something on the spot.
    if (acting || mood) {
      // Stopped short of where it was heading: what it says opens toward the middle from here.
      x.stopAnimation((at) => setOnRightHalf(at + spriteWidth / 2 > width / 2));
      return;
    }
    let stopped = false;
    let current: Animated.CompositeAnimation | null = null;
    // The egg rests in the middle of the stage, on the rug, not of the strip it could walk.
    const middle = Math.min(maxX, Math.max(minX, (width - spriteWidth) / 2));
    const home = buddy.hungry || eating ? maxX : egg ? middle : (minX + maxX) / 2;
    // At the table it eats where it is, and a hungry one waits where it is, thinking of food.
    const stay = atTable && (buddy.hungry || eating);
    const leg = (from: number) => {
      if (stopped) return;
      const to = settled ? (stay ? from : home) : minX + Math.random() * (maxX - minX);
      const distance = Math.abs(to - from);
      if (distance > 2) {
        setFacingLeft(to < from);
        setWalking(true);
      } else if (buddy.hungry || eating) {
        setFacingLeft(false); // looking at the bowl
      }
      // By the stage itself: the walkable strip is lopsided with a station and a corner.
      setOnRightHalf(to + spriteWidth / 2 > width / 2);
      current = Animated.sequence([
        Animated.timing(x, {
          toValue: to,
          duration: distance * (eating ? 12 : 28),
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.delay(settled ? 60_000 : 1500 + Math.random() * 3500),
      ]);
      current.start(({ finished }) => {
        if (finished) leg(to);
      });
      // The walk part ends before the pause; stop stepping then.
      setTimeout(() => !stopped && setWalking(false), distance * (eating ? 12 : 28));
    };
    x.stopAnimation((value) => {
      // The first time, appear where the buddy belongs instead of walking in from the edge.
      if (!placed.current) {
        placed.current = true;
        x.setValue(home);
        leg(home);
      } else {
        leg(value);
      }
    });
    return () => {
      stopped = true;
      current?.stop();
    };
  }, [
    width,
    spriteWidth,
    settled,
    acting,
    mood,
    eating,
    buddy.hungry,
    atTable,
    egg,
    minX,
    maxX,
    x,
    leaving,
  ]);

  // Leaving home: a wave and a goodbye where it stands, then off to the right and out of the room.
  useEffect(() => {
    if (!leaving || width === 0) return;
    let stopped = false;
    let walk: Animated.CompositeAnimation | null = null;
    say('farewell');
    const timer = setTimeout(() => {
      x.stopAnimation((from) => {
        if (stopped) return;
        setFacingLeft(false);
        setWalking(true);
        walk = Animated.timing(x, {
          toValue: width + 10,
          duration: Math.max(600, (width + 10 - from) * LEAVE_WALK_MS),
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        });
        walk.start();
      });
    }, LEAVE_WAVE_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
      walk?.stop();
    };
    // Once, as it sets off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving, width]);

  // Work: walk over to the station, then work there for a while. Without one (not grown up yet,
  // or no job) it works where it stands.
  const [arrivedRun, setArrivedRun] = useState(-1);
  const atWork = act === 'job' && arrivedRun === actRun;
  useEffect(() => {
    if (act !== 'job' || width === 0) return;
    let stopped = false;
    const startWork = () => {
      if (stopped) return;
      setWalking(false);
      setArrivedRun(actRun);
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = setTimeout(() => {
        actTimer.current = null;
        setAct(null);
      }, ACT_MS.job);
    };
    if (!station) {
      startWork();
      return () => {
        stopped = true;
      };
    }
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(stationX - from);
      // The plant is watered from its right, looking left.
      setFacingLeft(station.held ? true : stationX < from);
      setOnRightHalf(false);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: stationX,
        duration: Math.min(JOB_WALK_MAX_MS - 200, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) startWork();
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each piece of work, not for every change of the stage's size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun]);

  // Sitting: walk over to the middle of the rug, then sit there a while. Only with legs to fold
  // (a child or grown-up); otherwise it does not.
  const [seatedRun, setSeatedRun] = useState(-1);
  const measured = width > 0;
  // Arrived at a thing to use (below).
  const [usingRun, setUsingRun] = useState(-1);
  const sitting =
    (act === 'sit' && seatedRun === actRun) ||
    ((act === 'read' || act === 'watchFish') && usingRun === actRun);
  useEffect(() => {
    if (act !== 'sit' || width === 0) return;
    let stopped = false;
    const done = (after: number) => {
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = setTimeout(() => {
        actTimer.current = null;
        setAct(null);
      }, after);
    };
    if (!atTable) {
      done(0);
      return () => {
        stopped = true;
      };
    }
    const rug = Math.min(maxX, Math.max(minX, (width - spriteWidth) / 2));
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(rug - from);
      setFacingLeft(rug < from);
      setOnRightHalf(false);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: rug,
        duration: Math.min(JOB_WALK_MAX_MS - 200, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        setWalking(false);
        setSeatedRun(actRun);
        done(ACT_MS.sit);
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each sit, not for every change of the stage's size (but once it has one: a cue
    // can come before the stage is measured).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun, measured]);

  // A one-word message: dance or sing; for "밥" when full or "청소" with nothing to clean, an
  // answer instead of nothing (the care itself, when needed, comes from the server as an event).
  const canFeed = buddy.canFeed;
  const poops = buddy.poops;
  useEffect(() => {
    if (!cue || egg) return;
    const timer = setTimeout(() => {
      if (
        cue.kind === 'dance' ||
        cue.kind === 'sing' ||
        cue.kind === 'job' ||
        isHappening(cue.kind)
      )
        perform(cue.kind, true);
      else if (cue.kind !== 'feed' && cue.kind !== 'clean' && cue.kind !== 'work')
        startMood(cue.kind);
      else if (cue.kind === 'feed' && !canFeed) {
        perform('refuse', true);
        say('full');
      } else if (cue.kind === 'clean' && poops === 0 && !station) say('alreadyClean');
      else if (cue.kind === 'work' && station) perform('job', true);
    }, 0);
    return () => clearTimeout(timer);
    // Answer each cue once, with the state as it was when it came.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue]);

  // Care or growth takes priority over petting, dancing or singing. A new message does not:
  // "노래" from the other one is a message too, and asks for the song. Nor a new level after the
  // care that earned it: the work that care started goes on.
  useEffect(() => {
    if (!reaction || reaction.kind === 'message' || reaction.follows) return;
    const timer = setTimeout(() => {
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = null;
      if (petTimer.current) clearTimeout(petTimer.current);
      petTimer.current = null;
      setAct(null);
      setPetted(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [reaction]);

  // The partner petted the buddy: it glows, and if this user did too just now, more so.
  useEffect(() => {
    if (!partnerPet || egg) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      partnerPetAt.current = now;
      startMood(now - myPetAt.current < CO_PET_MS ? 'coPet' : 'love');
    }, 0);
    return () => clearTimeout(timer);
    // One reaction per pet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerPet]);

  // A hiccup is three small hops, a start one big one.
  useEffect(() => {
    if (act !== 'hiccup' && act !== 'startle') return;
    const jump = (h: number, ms: number) =>
      Animated.sequence([
        Animated.timing(hop, { toValue: -h, duration: ms, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: ms, useNativeDriver: NATIVE_DRIVER }),
      ]);
    const move =
      act === 'startle'
        ? jump(18, 200)
        : Animated.sequence([jump(5, 110), jump(5, 110), jump(5, 110)]);
    move.start();
    return () => {
      move.stop();
      hop.setValue(0);
    };
  }, [act, actRun, hop]);

  // Little hops for a mood; a good night sleeps instead.
  useEffect(() => {
    if (!mood) return;
    const jump = (h: number, ms = 140) =>
      Animated.sequence([
        Animated.timing(hop, { toValue: -h, duration: ms, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: ms, useNativeDriver: NATIVE_DRIVER }),
      ]);
    const moves: Record<StageMood, Animated.CompositeAnimation | null> = {
      coPet: Animated.sequence([jump(16), jump(16)]),
      laugh: Animated.sequence(Array.from({ length: 4 }, () => jump(6, 90))),
      love: Animated.sequence([jump(10), jump(6)]),
      goodnight: null,
      cheer: Animated.sequence([jump(16), jump(16)]),
      comfort: jump(4, 220),
      morning: jump(12),
    };
    const move = moves[mood];
    move?.start();
    return () => {
      move?.stop();
      hop.setValue(0);
    };
  }, [mood, job, hop]);

  // Left alone, now and then a dance or a song.
  useEffect(() => {
    if (egg || settled || active || acting || petted || mood) return;
    // With the partner here too it is livelier: twice as often.
    const pace = partnerHere ? 0.5 : 1;
    const timer = setTimeout(
      () =>
        perform(
          pickIdleAct(
            job,
            guests ? (guests.split(',') as Guest[]) : [],
            atTable,
            darkSky,
            decor.window,
            uses ? (uses.split(',') as Use[]) : [],
          ),
        ),
      pace * (IDLE_ACT_MIN_MS + Math.random() * (IDLE_ACT_MAX_MS - IDLE_ACT_MIN_MS)),
    );
    return () => clearTimeout(timer);
  }, [
    egg,
    settled,
    active,
    acting,
    petted,
    mood,
    partnerHere,
    job,
    guests,
    atTable,
    darkSky,
    decor.window,
    uses,
    perform,
  ]);

  // Little hops while dancing, notes rising while singing.
  useEffect(() => {
    if (act !== 'dance' && act !== 'sing') return;
    const move =
      act === 'dance'
        ? Animated.loop(
            Animated.sequence([
              Animated.timing(hop, { toValue: -6, duration: 150, useNativeDriver: NATIVE_DRIVER }),
              Animated.timing(hop, { toValue: 0, duration: 150, useNativeDriver: NATIVE_DRIVER }),
            ]),
            { iterations: ACT_REPEATS },
          )
        : Animated.loop(
            Animated.sequence([
              Animated.timing(note, { toValue: 0, duration: 0, useNativeDriver: NATIVE_DRIVER }),
              Animated.timing(note, {
                toValue: 1,
                duration: ACT_MS.sing / ACT_REPEATS,
                useNativeDriver: NATIVE_DRIVER,
              }),
            ]),
            { iterations: ACT_REPEATS },
          );
    move.start();
    return () => {
      move.stop();
      hop.setValue(0);
      note.setValue(0);
    };
  }, [act, actRun, hop, note]);

  // A butterfly comes down onto the head and flies off again.
  useEffect(() => {
    if (act !== 'butterfly') return;
    const to = (toValue: number, easing: (value: number) => number) =>
      Animated.timing(flutter, {
        toValue,
        duration: BUTTERFLY_FLY_MS,
        easing,
        useNativeDriver: NATIVE_DRIVER,
      });
    const move = Animated.sequence([
      to(1, Easing.out(Easing.quad)),
      Animated.delay(ACT_MS.butterfly - 2 * BUTTERFLY_FLY_MS),
      to(2, Easing.in(Easing.quad)),
    ]);
    move.start();
    return () => {
      move.stop();
      flutter.setValue(0);
    };
  }, [act, actRun, flutter]);
  // A shower over: the window may show a rainbow after it.
  useEffect(() => {
    if (act !== 'rain') return;
    return () => setRainEnded((n) => n + 1);
  }, [act, actRun]);

  // Rain, snow or a shooting star outside: it goes over beside the window and turns to watch, under
  // its umbrella in the rain (the weather itself is drawn in the glass, weather.tsx). Beside, not in
  // front: a grown-up's head and umbrella would hide the glass.
  const glass = glassOf(decor, width, height, WALL_TOP);
  const watching = act !== null && WEATHER.includes(act);
  // Beside the window, on the side with more room: right of a window left of the middle, else left
  // of it. `onRight`: it stands right of the window (and turns left to look).
  const besideWindow = (window: NonNullable<typeof glass>) => {
    const onRight = window.left + window.width / 2 < width / 2;
    const beside = onRight ? window.left + window.width + 4 : window.left - spriteWidth - 4;
    return { onRight, spot: Math.min(maxX, Math.max(minX, beside)) };
  };
  useEffect(() => {
    if (!watching || !glass) return;
    let stopped = false;
    const { onRight, spot } = besideWindow(glass);
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(spot - from);
      setFacingLeft(spot < from);
      setOnRightHalf(spot + spriteWidth / 2 > width / 2);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: spot,
        duration: Math.min(WINDOW_WALK_MAX_MS, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        setWalking(false);
        // Turned to the window.
        setFacingLeft(onRight);
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each shower or star, not for every change of the stage's size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun]);

  // Using a thing in the room: walk over (under the shelf, beside the window, up to the goldfish),
  // turn to it, and use it for a while. At the window a guest comes after the wait. Without the
  // thing (cued by the art preview) or legs to walk on (a baby), it does not.
  const using = isUse(act) && usingRun === actRun;
  // A new run of bubbles each time it starts watching the goldfish.
  const [fishRun, setFishRun] = useState(0);
  useEffect(() => {
    if (!isUse(act) || width === 0) return;
    let stopped = false;
    const done = (after: number, then?: () => void) => {
      if (actTimer.current) clearTimeout(actTimer.current);
      actTimer.current = setTimeout(() => {
        actTimer.current = null;
        setAct(null);
        then?.();
      }, after);
    };
    const at = thingsAt(decor, width, height, plantRoom);
    const window = act === 'waitGuest' && glass ? besideWindow(glass) : null;
    // Where it stands, and which way it looks once there.
    const target =
      act === 'waitGuest'
        ? windowGuests.length > 0 && window
          ? { spot: window.spot, left: window.onRight }
          : null
        : act === 'musicBox' && decor.musicBox
          ? at.musicBox
          : act === 'read' && decor.books
            ? at.books
            : act === 'watchFish' && decor.fish
              ? at.fish
              : null;
    if (!atTable || target === null) {
      done(0);
      return () => {
        stopped = true;
      };
    }
    const place =
      typeof target === 'number'
        ? {
            spot: Math.min(maxX, Math.max(minX, target - spriteWidth / 2)),
            left: target < width / 2,
          }
        : target;
    x.stopAnimation((from) => {
      if (stopped) return;
      const distance = Math.abs(place.spot - from);
      setFacingLeft(place.spot < from);
      setOnRightHalf(place.spot + spriteWidth / 2 > width / 2);
      setWalking(distance > 2);
      Animated.timing(x, {
        toValue: place.spot,
        duration: Math.min(JOB_WALK_MAX_MS - 200, distance * JOB_WALK_MS),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        setWalking(false);
        setFacingLeft(place.left);
        setUsingRun(actRun);
        if (act === 'watchFish') setFishRun((n) => n + 1);
        // At the window, one of the room's guests comes along.
        done(
          ACT_MS[act],
          act === 'waitGuest' ? () => perform(pick(windowGuests), true) : undefined,
        );
      });
    });
    return () => {
      stopped = true;
    };
    // A new walk for each use, not for every change of the stage's size (once it has one).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, actRun, measured]);
  // Dancing to the music box once it plays.
  const musicDance = act === 'musicBox' && using;
  useEffect(() => {
    if (!musicDance) return;
    const move = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: -6, duration: 150, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: 150, useNativeDriver: NATIVE_DRIVER }),
        Animated.delay(150),
      ]),
    );
    move.start();
    return () => {
      move.stop();
      hop.setValue(0);
    };
  }, [musicDance, hop]);

  // Work done (by either of them) is shown at the station; the gardener likes the tidy plant.
  useEffect(() => {
    // Already off to work (this side's own tap): no need to start again.
    if (reaction?.kind !== 'worked' || !station || act === 'job') return;
    const timer = setTimeout(
      () => perform('job', true, job === 'GARDENER' ? 'gardenerCleaned' : undefined),
      0,
    );
    return () => clearTimeout(timer);
    // Once per piece of work done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction?.id]);

  // The bowl and the poops bob now and then while they need tapping.
  const wantsFood = buddy.hungry && !eating;
  // Hungry, it thinks of food over its head from the egg on (no words needed), and a tap on it
  // feeds it. Asleep, it dreams of it (DREAM_FOOD) with its zzz beside, so a sleeping buddy can be
  // seen to be hungry and fed too.
  const thinking = wantsFood;
  const thought = usePresence(thinking, THOUGHT_POP_MS);
  const hasPoop = buddy.poops > 0;
  useEffect(() => {
    if (!wantsFood && !hasPoop) return;
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: -3, duration: 120, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(nudge, { toValue: 0, duration: 120, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(nudge, { toValue: -2, duration: 100, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(nudge, { toValue: 0, duration: 100, useNativeDriver: NATIVE_DRIVER }),
        Animated.delay(1600),
      ]),
    );
    bob.start();
    return () => {
      bob.stop();
      nudge.setValue(0);
    };
  }, [wantsFood, hasPoop, nudge]);

  // A word back for care, once grown.
  useEffect(() => {
    let next: Line | null = null;
    if (active?.kind === 'fed' && active.phase === 'after')
      next = job === 'CHEF' ? 'chefFed' : pick(['thanks', 'yummy'] as const);
    else if (active?.kind === 'cleaned')
      next = job === 'GARDENER' ? 'gardenerCleaned' : pick(['refreshed', 'digestion'] as const);
    else if (active?.kind === 'together') next = 'together';
    else if (active?.kind === 'here') next = 'bothHere';
    else if (active?.kind === 'joined') next = 'friendCame';
    else if (active?.kind === 'jobChanged' && active.phase === 'after' && job)
      next = NEW_JOB_LINE[job];
    if (!next) return;
    const say_ = next;
    const timer = setTimeout(() => say(say_), 0);
    return () => clearTimeout(timer);
  }, [active, job, say]);

  // Its oranges out, a word about them.
  useEffect(() => {
    if (fruiting === 0) return;
    const timer = setTimeout(() => say('oranges'), 1400);
    return () => clearTimeout(timer);
  }, [fruiting, say]);

  useEffect(() => {
    if (!buddy.hungry || sleeping) return;
    const timer = setTimeout(() => say('hungry'), 600);
    return () => clearTimeout(timer);
  }, [buddy.hungry, sleeping, say]);

  // The egg rocks in small, stepped moves now and then.
  useEffect(() => {
    if (!egg) return;
    const step = (to: number) =>
      Animated.timing(tilt, { toValue: to, duration: 1, useNativeDriver: NATIVE_DRIVER });
    const rock = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        step(-1),
        Animated.delay(220),
        step(1),
        Animated.delay(220),
        step(-1),
        Animated.delay(220),
        step(0),
      ]),
    );
    rock.start();
    return () => {
      rock.stop();
      // stop() preserves the last angle; evolution must not inherit a tilted egg.
      tilt.setValue(0);
    };
  }, [egg, tilt]);

  // Movement that goes with a reaction: hops for a message or a new level, a shudder while
  // straining. Evolving: rings of light spread from the buddy while it changes, a quick flash as the
  // new look settles, then a burst of sparkles.
  useEffect(() => {
    if (!reaction) return;
    const jump = (h: number) =>
      Animated.sequence([
        Animated.timing(leap, { toValue: -h, duration: 140, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(leap, { toValue: 0, duration: 140, useNativeDriver: NATIVE_DRIVER }),
      ]);
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(leap, { toValue: 2, duration: 60, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(leap, { toValue: 0, duration: 60, useNativeDriver: NATIVE_DRIVER }),
      ]),
      { iterations: 10 },
    );
    const transform = Animated.sequence([
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 0, duration: 0, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(glow, {
            toValue: 1,
            duration: GLOW_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
        { iterations: Math.floor(EVOLVE_MS / GLOW_MS) },
      ),
      Animated.timing(flash, { toValue: 0.6, duration: 60, useNativeDriver: NATIVE_DRIVER }),
      Animated.parallel([
        Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: NATIVE_DRIVER }),
        jump(12),
        Animated.sequence([
          Animated.timing(burst, { toValue: 0, duration: 0, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(burst, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
      ]),
    ]);
    const moves: Partial<Record<ReactionKind, Animated.CompositeAnimation>> = {
      message: Animated.sequence([jump(14), jump(8)]),
      cleaned: jump(10),
      pooped: shake,
      levelUp: Animated.sequence([jump(10), jump(6)]),
      // The top level: three hops while the room sparkles.
      maxLevel: Animated.sequence([jump(12), jump(8), jump(12)]),
      evolved: transform,
      jobChanged: transform,
      // Both came today: two big happy jumps.
      together: Animated.sequence([jump(16), jump(16)]),
      // The partner is here: one happy hop.
      here: Animated.sequence([jump(12), jump(6)]),
      // A friend came in for the first time: three big hops.
      joined: Animated.sequence([jump(16), jump(12), jump(16)]),
    };
    const move = moves[reaction.kind];
    move?.start();
    return () => {
      move?.stop();
      // Cut short by the next one, it lands softly; the next one's hops start from where it is.
      Animated.timing(leap, { toValue: 0, duration: 100, useNativeDriver: NATIVE_DRIVER }).start();
      glow.setValue(0);
      burst.setValue(1);
      flash.setValue(0);
    };
  }, [reaction, leap, flash, glow, burst]);

  // Notes over the stage, so there is always something ahead to look forward to: grown into a new
  // stage, the next one (a grown-up's is its job, until it has one); and now and then when the job
  // can be changed: the level before a chance, the chance itself, and after a change, the next one.
  // Worked out when shown, from the buddy as it is by then (its new state follows the event).
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestBuddy = useRef(buddy);
  useEffect(() => {
    latestBuddy.current = buddy;
  });
  // `then`: another note right after this one.
  const showNotice = useCallback(
    (pick: (now: BuddyView) => Notice | null, after: number, then?: typeof pick) => {
      noticeTimers.current.forEach(clearTimeout);
      const show = (choose: typeof pick, rest?: typeof pick): void => {
        const next = choose(latestBuddy.current);
        if (!next) {
          if (rest) show(rest);
          return;
        }
        setNotice(next);
        noticeTimers.current.push(
          setTimeout(() => {
            setNotice(null);
            if (rest) noticeTimers.current.push(setTimeout(() => show(rest), NOTICE_GAP_MS));
          }, NOTICE_MS),
        );
      };
      noticeTimers.current = [setTimeout(() => show(pick, then), after)];
    },
    [],
  );
  useEffect(() => () => noticeTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (reaction?.kind === 'evolved') {
      showNotice(
        (now) =>
          now.stage === 'ADULT' && now.job
            ? null
            : { key: `nextStage.${now.stage}`, level: NEXT_STEP_AT[now.stage] },
        EVOLVE_MS,
      );
    } else if (reaction?.kind === 'jobChanged') {
      // A cheer for the new job as it settles, then when it can be changed next.
      showNotice(
        (now) => (now.job ? { key: 'notice.newJob', job: now.job } : null),
        EVOLVE_MS,
        nextJobChange,
      );
    } else if (reaction?.kind === 'levelUp' || reaction?.kind === 'maxLevel') {
      showNotice((now) => {
        if (!now.job) return null;
        // The top level's own notes say so (TopLevelNotes).
        if (reaction.kind === 'maxLevel') return null;
        if (now.canChangeJob && JOB_CHANGE_LEVELS.includes(now.level))
          return { key: 'notice.jobChangeOpen' };
        if (now.jobChangeAt === now.level + 1)
          return { key: 'notice.jobChangeSoon', level: now.jobChangeAt };
        return null;
      }, NOTICE_AFTER_MS);
    }
  }, [reaction, showNotice]);
  // The job settled while the stage is open: when it can be changed next. A change says so after its
  // own transformation ('jobChanged').
  const jobSeen = useRef(job);
  useEffect(() => {
    const before = jobSeen.current;
    if (job === before) return;
    jobSeen.current = job;
    if (!job || before) return;
    showNotice(nextJobChange, NOTICE_AFTER_MS + 1500);
  }, [job, showNotice]);
  const noticeShown = notice && !dream && !leaving ? notice : null;
  // Reaching the top level (top-level.tsx): once for each such reaction, over after the notes.
  const [topId, setTopId] = useState<string | null>(null);
  const [topDone, setTopDone] = useState<string | null>(null);
  if (reaction?.kind === 'maxLevel' && reaction.id !== topId) setTopId(reaction.id);
  const topOn = topId !== null && topDone !== topId;
  const topNotes = [
    { text: t('buddy.top.reached') },
    { text: t('buddy.top.letter'), onPress: onOpenMail },
    ...(job ? [{ text: t('buddy.notice.jobChangeFree') }] : []),
  ];
  const topMs = topNotes.length * TOP_NOTE_MS;
  useEffect(() => {
    if (!topOn) return;
    const timer = setTimeout(() => setTopDone(topId), topMs);
    return () => clearTimeout(timer);
  }, [topOn, topId, topMs]);

  useEffect(
    () => () => {
      if (petTimer.current) clearTimeout(petTimer.current);
      if (actTimer.current) clearTimeout(actTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
    },
    [],
  );

  // Petting: glad (and a thank-you once grown), or a dance, or a song.
  const pet = () => {
    // Timer refs lock immediately, including taps before React renders the new pose. The glow of
    // the partner's pet does not lock: petting along with them is the point.
    const glowing = mood === 'love';
    if (
      egg ||
      busy ||
      active ||
      acting ||
      petted ||
      (mood && !glowing) ||
      actTimer.current ||
      petTimer.current
    )
      return;
    const now = Date.now();
    myPetAt.current = now;
    onPet?.();
    if (now - partnerPetAt.current < CO_PET_MS) return startMood('coPet');
    if (glowing) return;
    const roll = Math.random();
    if (roll < 0.3) return perform('dance');
    if (roll < 0.6) return perform('sing');
    setPetted(true);
    say('thanks');
    petTimer.current = setTimeout(() => {
      petTimer.current = null;
      setPetted(false);
    }, PET_MS);
  };

  const basePose: Pose = leaving
    ? walking
      ? tick % 2 === 0
        ? 'step'
        : 'idle'
      : 'happy'
    : eating
      ? active?.phase === 'main'
        ? tick % 2 === 0
          ? 'eat'
          : 'idle'
        : 'happy'
      : active?.kind === 'pooped'
        ? 'strain'
        : act === 'dance'
          ? tick % 2 === 0
            ? 'happy'
            : 'step'
          : act === 'sing'
            ? tick % 2 === 0
              ? 'eat'
              : 'happy'
            : isUse(act)
              ? !using
                ? tick % 2 === 0
                  ? 'step'
                  : 'idle'
                : act === 'musicBox'
                  ? tick % 2 === 0
                    ? 'happy'
                    : 'step'
                  : act === 'watchFish'
                    ? 'happy'
                    : tick % 7 === 0
                      ? 'blink'
                      : 'idle'
              : act === 'sit'
                ? sitting
                  ? tick % 6 === 0
                    ? 'blink'
                    : 'happy'
                  : tick % 2 === 0
                    ? 'step'
                    : 'idle'
                : act === 'job' && job
                  ? atWork
                    ? jobPose(job, tick)
                    : tick % 2 === 0
                      ? 'step'
                      : 'idle'
                  : watching && walking
                    ? tick % 2 === 0
                      ? 'step'
                      : 'idle'
                    : act === 'yawn'
                      ? 'yawn'
                      : act === 'hiccup'
                        ? 'hiccup'
                        : act === 'startle' || act === 'shootingStar'
                          ? 'surprised'
                          : act === 'butterfly' || act === 'snow' || isGuest(act)
                            ? tick % 2 === 0
                              ? 'happy'
                              : 'idle'
                            : act === 'refuse' || act === 'lookAround'
                              ? 'idle'
                              : active?.kind === 'cleaned' ||
                                  active?.kind === 'levelUp' ||
                                  active?.kind === 'maxLevel' ||
                                  active?.kind === 'together' ||
                                  active?.kind === 'here' ||
                                  active?.kind === 'joined' ||
                                  ((active?.kind === 'evolved' || changingJob) && !evolving) ||
                                  petted
                                ? 'happy'
                                : sleeping
                                  ? 'sleep'
                                  : buddy.hungry
                                    ? 'hungry'
                                    : walking
                                      ? tick % 2 === 0
                                        ? 'step'
                                        : 'idle'
                                      : tick % 11 === 0
                                        ? 'blink'
                                        : 'idle';

  // A mood from the chat shows on the face unless something bigger (eating, straining) is going on.
  const moodPose: Pose | null =
    mood === 'laugh'
      ? tick % 2 === 0
        ? 'laugh'
        : 'happy'
      : mood === 'love' || mood === 'cheer' || mood === 'morning' || mood === 'coPet'
        ? 'happy'
        : mood === 'goodnight'
          ? 'sleep'
          : mood === 'comfort'
            ? 'worried'
            : null;
  const pose: Pose =
    moodPose && !eating && active?.kind !== 'pooped' && !acting ? moodPose : basePose;

  // While evolving, the old and new looks take turns quickly.
  const previousStage = STAGE_ORDER[Math.max(0, STAGE_ORDER.indexOf(buddy.stage) - 1)];
  // Dressed for the season or its job, but not in the middle of growing. Changing jobs, the old
  // job's look and the new one's take turns the same way.
  const dressed = evolving
    ? changingJob
      ? dressedFrame(
          buddy.stage,
          tick % 2 === 0 ? 'idle' : pose,
          tick % 2 === 0 ? jobs.before : job,
          null,
        )
      : buddyFrame(tick % 2 === 0 ? previousStage : buddy.stage, tick % 2 === 0 ? 'idle' : pose)
    : dressedFrame(buddy.stage, pose, job, season);
  const frame = sitting ? seated(buddy.stage, dressed) : dressed;

  const gridWidth = frame[0].length;
  // Resting on the head while it is there.
  const butterfly = act === 'butterfly' && buddy.stage !== 'EGG' ? butterflyAt(buddy.stage) : null;

  // A writer's love, love in Valentine's week, and a pet shared by both show a big heart.
  const bigHeart =
    mood === 'coPet' ||
    (mood === 'love' && (job === 'WRITER' || season === 'VALENTINE')) ||
    active?.kind === 'joined';
  const showHeart =
    petted ||
    (act === 'job' && job === 'WRITER') ||
    mood === 'love' ||
    mood === 'coPet' ||
    (eating && active?.phase === 'after') ||
    active?.kind === 'together' ||
    active?.kind === 'here' ||
    active?.kind === 'joined';
  const sparkling = active?.kind === 'cleaned';
  const bursting = (active?.kind === 'evolved' || changingJob) && active.phase === 'after';
  const levelingUp = active?.kind === 'levelUp' || active?.kind === 'maxLevel';

  // Rice in the bowl, but for when the buddy is hungry: then it is empty and asks to be filled.
  const bowlFull = !buddy.hungry || eating;
  const table = usePresence(atTable && eating, TABLE_AWAY_MS);
  // While the table sinks away it shows the empty bowl, as at the end of the meal.
  const [tableFull, setTableFull] = useState(active?.phase === 'main');
  if (eating && tableFull !== (active?.phase === 'main')) setTableFull(active?.phase === 'main');
  const [rice] = useState(() => new Animated.Value(bowlFull ? 1 : 0));
  const [riceSparkle, setRiceSparkle] = useState(false);
  const [riceWasFull] = useState(bowlFull);
  useEffect(() => {
    const change = bowlFull
      ? Animated.spring(rice, {
          toValue: 1,
          friction: 4,
          tension: 140,
          useNativeDriver: NATIVE_DRIVER,
        })
      : Animated.timing(rice, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        });
    change.start();
    // A sparkle as the bowl fills again (not when the stage first shows a full one).
    const timers =
      bowlFull && !riceWasFull
        ? [setTimeout(() => setRiceSparkle(true), 0), setTimeout(() => setRiceSparkle(false), 700)]
        : [];
    return () => {
      change.stop();
      timers.forEach(clearTimeout);
    };
  }, [bowlFull, rice, riceWasFull]);

  // Each poop keeps its spot on the floor (a slot). The one tapped is the one that flies up and
  // fades; the ones still there stay put. Cleaned some other way (the partner, "청소" in the chat),
  // the last ones go. A new poop takes the first free spot.
  const [slots, setSlots] = useState(() => Array.from({ length: buddy.poops }, (_, i) => i));
  const [tapped, setTapped] = useState<number[]>([]);
  const [poopRound, setPoopRound] = useState(0);
  const [flyingOff, setFlyingOff] = useState<{ key: string; index: number }[]>([]);
  if (buddy.poops !== slots.length) {
    let next = slots;
    let taps = tapped;
    const gone: number[] = [];
    while (next.length > buddy.poops) {
      const slot = taps.find((s) => next.includes(s)) ?? next[next.length - 1];
      taps = taps.filter((s) => s !== slot);
      next = next.filter((s) => s !== slot);
      gone.push(slot);
    }
    while (next.length < buddy.poops) {
      let free = 0;
      while (next.includes(free)) free++;
      next = [...next, free];
    }
    if (gone.length) {
      setFlyingOff((prev) => [
        ...prev,
        ...gone.map((slot) => ({ key: `${poopRound}-${slot}`, index: slot })),
      ]);
    }
    setPoopRound(poopRound + 1);
    setSlots(next);
    setTapped([]);
  }
  const doneLeaving = useCallback(
    (key: string) => setFlyingOff((prev) => prev.filter((poop) => poop.key !== key)),
    [],
  );
  // At work the cook sways to the pot and the DJ nods.
  const workSway = atWork && job === 'CHEF' ? (tick % 2 === 0 ? -scale : 0) : 0;
  const workNod = atWork && job === 'DJ' && tick % 2 === 0 ? scale : 0;
  // Shaking its head at a full bowl, it sways a pixel each way.
  const headShake = act === 'refuse' ? (tick % 2 === 0 ? -scale : scale) : 0;
  // Dancing and looking around turn the buddy left and right.
  const flipped =
    act === 'dance' || act === 'lookAround' || musicDance ? tick % 2 === 0 : facingLeft;

  // The book from the shelf, open in front of it as it reads.
  const book: Layer | null =
    act === 'read' && using
      ? {
          frame: OPEN_BOOK,
          row: frame.length - BOOK_ABOVE_FEET,
          col: Math.floor((gridWidth - OPEN_BOOK[0].length) / 2),
        }
      : null;
  // The umbrella over it as it watches the rain at the window.
  const umbrella = act === 'rain' && buddy.stage !== 'EGG' ? umbrellaFor(buddy.stage) : null;
  const front = evolving ? null : seasonFront(buddy.stage, season);

  const feed = () => {
    if (busy) return;
    if (!buddy.canFeed) {
      // Not hungry: a shake of the head.
      if (!egg) perform('refuse');
      say('full');
      return;
    }
    onFeed();
  };
  const clean = (slot: number) => {
    if (!buddy.canClean || busy) return;
    setTapped((prev) => [...prev, slot]);
    onClean();
  };
  // The room's toys: the ball bounces out and it dances; the music box plays and it sings along.
  const play = (next: 'dance' | 'sing') => {
    if (egg || leaving || active) return;
    perform(next, true);
  };
  // A tap on a thing in the room (stage-decor.tsx): the buddy notices. At the window a guest drops
  // by, if the room has grown any, or it looks out at the sky; the clock gives it a start; on the rug
  // a child or grown-up comes and sits down (a baby has no legs to fold); a plant or a portrait gets a
  // word (from a child up, like every word).
  const touchProp = (prop: RoomProp) => {
    if (egg || leaving || active || dream) return;
    if (prop === 'window') {
      if (isGuest(act)) return say(act);
      const atWindow = decor.guests.filter((guest) => !isFloorPasser(guest));
      if (atWindow.length > 0) return perform(pick(atWindow), true);
      const sky = skyAt(now.getHours());
      // Around the full moon the night sky has a round one.
      return perform(
        'lookAround',
        true,
        sky === 'night' && isFullMoon(now) ? 'windowFullMoon' : WINDOW_LINE[sky],
      );
    }
    if (prop === 'clock') return perform('startle', true, 'clock');
    if (prop === 'rug') {
      // Already there: it stays sitting.
      if (atTable && act !== 'sit') perform('sit', true);
      return;
    }
    say(prop);
  };
  // A grown-up's station: a tap sends it off to work there (EXP once an hour, the server decides).
  const work = () => {
    if (busy) return;
    onWork();
    perform('job', true);
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[
        bare ? null : [styles.stage, { borderColor: colors.stageLine }],
        { height, backgroundColor: colors.stage },
      ]}
    >
      <View
        style={[
          styles.info,
          cornerButton ? { right: 6 + corners * (CORNER_SIZE + 6) } : null,
          dream ? styles.hidden : null,
        ]}
      >
        {/* A tile like the corner buttons, with a chevron, so it reads as the way into the details. */}
        <Pressable
          onPress={onOpenDetail}
          disabled={dream}
          accessibilityRole="button"
          accessibilityLabel={t('buddy.open', { buddy: buddy.name })}
          hitSlop={4}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {buddy.name}
          </Text>
          <Text
            style={[
              styles.level,
              levelingUp ? styles.levelUp : null,
              { color: levelingUp ? colors.accent : colors.textMuted },
            ]}
          >
            {t('buddy.level', { level: buddy.level })}
          </Text>
          {/* Ready to go its own way (in the buddy's details). */}
          {buddy.grown ? <Text style={styles.grown}>🎓</Text> : null}
          {/* Both have talked today: the day's bonus is in. */}
          {buddy.togetherToday ? (
            <Text style={styles.grown} accessibilityLabel={t('buddy.together.badge')}>
              🤝
            </Text>
          ) : null}
          <View style={styles.bar}>
            <ProgressBar progress={buddy.levelProgress} />
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.floor,
          { height: FLOOR, backgroundColor: colors.stageFloor, borderTopColor: colors.stageLine },
        ]}
      />

      <WallDecor
        decor={decor}
        floor={FLOOR}
        top={WALL_TOP}
        width={width}
        height={height}
        stationRight={stationRight}
        plantRoom={plantRoom}
        guest={isGuest(act) ? act : null}
        run={actRun}
        tick={tick}
        singing={act === 'sing' || musicDance}
        dancing={act === 'dance'}
        reading={book !== null}
        fishRun={fishRun}
        rainEnded={rainEnded}
        weather={watching ? (act as 'rain' | 'snow' | 'shootingStar') : null}
        weatherMs={act ? ACT_MS[act] : 0}
        onToy={() => play('dance')}
        onMusic={() => play('sing')}
        onProp={touchProp}
        now={now}
        lit={lampLit}
        onLamp={setLampOn}
      />
      {/* What of the station stands behind the buddy (the gardener's lamp). */}
      {station?.behind ? (
        <View
          key={`behind${job}`}
          style={[
            styles.station,
            styles.passThrough,
            // Its last row below the floor line, like the station's own.
            { left: STATION_LEFT + station.behind.col * cell, bottom: FLOOR - cell },
          ]}
        >
          <Arrive fresh={job !== jobAtMount} width={station.behind.frame[0].length * cell}>
            <PixelSprite frame={station.behind.frame} palette={PROP_PALETTE} scale={cell} />
          </Arrive>
        </View>
      ) : null}
      {corner ? (
        <View
          style={[
            styles.poop,
            { bottom: FLOOR - 2 - (corner.sink ?? 0) * scale * corner.size, right: 8 },
          ]}
        >
          <Tappable kind="sway" shine label={t('buddy.room.corner')}>
            <PixelSprite
              frame={corner.frame}
              palette={corner.palette ?? PROP_PALETTE}
              scale={scale * corner.size}
            />
          </Tappable>
        </View>
      ) : decor.plant ? (
        <View style={[styles.poop, { bottom: FLOOR - 2, right: 8 }]}>
          <Tappable
            kind="sway"
            shine
            label={t('buddy.room.plant')}
            onTap={() => touchProp('plant')}
          >
            <Plant
              key={fruiting}
              tier={decor.plant}
              kind={decor.plantKind}
              scale={decor.plantScale}
              sprout={fruiting > 0}
            />
          </Tappable>
        </View>
      ) : null}

      {/* The bowl, for the egg and the baby; older ones eat at the table. */}
      {atTable ? null : (
        <Animated.View
          style={[
            styles.bowl,
            {
              bottom: FLOOR - 3,
              right: bowlRight,
              transform: [{ translateY: wantsFood ? nudge : 0 }],
            },
          ]}
        >
          {/* Hungry, the buddy thinks of food instead of a mark over the bowl. */}
          {riceSparkle ? (
            <View style={styles.bowlAsk}>
              <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={2} />
            </View>
          ) : null}
          <Pressable
            onPress={feed}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.feed')}
          >
            {/* Full, but empty while the buddy is hungry: the rice pops in and shrinks away. */}
            <PixelSprite
              frame={bowl(false, decor.bowl)}
              palette={PROP_PALETTE}
              scale={PROP_SCALE}
            />
            <Animated.View
              style={[
                styles.rice,
                {
                  opacity: rice.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                  transform: [
                    { translateY: rice.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) },
                    { scale: rice.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  ],
                },
              ]}
            >
              <PixelSprite frame={RICE} palette={PROP_PALETTE} scale={PROP_SCALE} />
            </Animated.View>
          </Pressable>
        </Animated.View>
      )}

      {companionEgg ? (
        <View style={[styles.poop, { bottom: FLOOR - 2, right: poopRight + 4 }]}>
          <PixelSprite frame={buddyFrame('EGG', 'idle')} palette={BUDDY_PALETTE} scale={3} smooth />
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.buddy,
          {
            bottom: FLOOR - scale - workNod - (sitting ? SIT_ROWS * scale : 0),
            left: workSway + headShake,
            transform: [
              { translateX: x },
              { translateY: rise },
              {
                rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }),
              },
            ],
          },
        ]}
      >
        {topOn ? (
          <TopLevelLight
            key={topId}
            width={spriteWidth}
            height={spriteHeight}
            stageHeight={height}
            ms={topMs}
          />
        ) : null}
        {evolving ? (
          <Animated.View
            style={[
              styles.glow,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                left: (spriteWidth - glowSize) / 2,
                top: (spriteHeight - glowSize) / 2,
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                transform: [
                  { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.3] }) },
                ],
              },
            ]}
          />
        ) : null}
        {levelingUp ? (
          <View style={styles.above}>
            <PixelSprite frame={LEVEL_UP} palette={PROP_PALETTE} scale={3} />
          </View>
        ) : showHeart ? (
          <View style={[styles.above, bigHeart ? styles.aboveBig : null]}>
            <PixelSprite frame={bigHeart ? HEART_BIG : HEART} palette={PROP_PALETTE} scale={3} />
          </View>
        ) : thought.present ? (
          // Away from the speech bubble, its trail of puffs toward the head. It swells up when it
          // comes, and when fed it bursts like a bubble: a little bigger as it fades.
          <Animated.View
            style={[
              styles.thought,
              styles.passThrough,
              onRightHalf ? styles.thoughtRight : styles.thoughtLeft,
              {
                opacity: thinking
                  ? thought.value.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] })
                  : thought.value,
                transform: [
                  { translateY: nudge },
                  {
                    scale: thinking
                      ? thought.value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })
                      : thought.value.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }),
                  },
                ],
              },
            ]}
          >
            <PixelSprite
              frame={sleeping ? DREAM_FOOD : THOUGHT_FOOD}
              palette={sleeping ? DREAM_PALETTE : PROP_PALETTE}
              scale={2}
              flipped={!onRightHalf}
            />
          </Animated.View>
        ) : active?.kind === 'message' || act === 'startle' ? (
          <View style={styles.above}>
            <PixelSprite frame={EXCLAIM} palette={BUDDY_PALETTE} scale={3} />
          </View>
        ) : null}
        {sleeping && tick % 4 < 2 && !levelingUp && !showHeart && act !== 'startle' ? (
          // Over the head, on the side away from a dream of food.
          <View style={[styles.above, thought.present && !onRightHalf ? styles.aboveRight : null]}>
            <PixelSprite frame={ZZZ} palette={BUDDY_PALETTE} scale={3} />
          </View>
        ) : null}
        {sparkling && tick % 2 === 0 ? (
          <>
            <View style={[styles.sparkle, { left: -14, top: 6 }]}>
              <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={3} />
            </View>
            <View style={[styles.sparkle, { right: -14, top: 18 }]}>
              <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={3} />
            </View>
          </>
        ) : null}
        {act === 'sing' ? (
          <Animated.View
            style={[
              styles.sparkle,
              styles.passThrough,
              {
                left: tick % 4 < 2 ? spriteWidth * 0.75 : spriteWidth * 0.1,
                top: -6,
                opacity: note.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateY: note.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) },
                ],
              },
            ]}
          >
            <PixelSprite frame={NOTE} palette={BUDDY_PALETTE} scale={4} />
          </Animated.View>
        ) : null}
        {bursting
          ? BURST.map(([dx, dy], i) => (
              <Animated.View
                key={i}
                style={[
                  styles.sparkle,
                  styles.passThrough,
                  {
                    left: spriteWidth / 2 - 7,
                    top: spriteHeight / 2 - 7,
                    opacity: burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                    transform: [
                      {
                        translateX: burst.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, dx * (spriteWidth / 2 + 18)],
                        }),
                      },
                      {
                        translateY: burst.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, dy * (spriteHeight / 2 + 12)],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={3} />
              </Animated.View>
            ))
          : null}
        {leaving ? (
          <LayerSprite
            layer={{ frame: BUNDLE, row: 9, col: -3 }}
            gridWidth={gridWidth}
            palette={ROOM_PALETTE}
            scale={scale}
            flipped={flipped}
          />
        ) : null}
        {behind && !evolving ? (
          <LayerSprite
            layer={behind}
            gridWidth={gridWidth}
            palette={BUDDY_PALETTE}
            scale={scale}
            flipped={flipped}
          />
        ) : null}
        <Pressable
          nativeID="buddy-sprite-button"
          // Hungry at an age with hands, a tap brings the meal (there is no bowl to tap).
          onPress={thinking ? feed : pet}
          accessibilityRole="button"
          accessibilityLabel={thinking ? t('buddy.feed') : t('buddy.pet', { buddy: buddy.name })}
        >
          <PixelSprite
            frame={frame}
            palette={BUDDY_PALETTE}
            scale={scale}
            flipped={flipped}
            smooth
          />
        </Pressable>
        {front ? (
          <LayerSprite
            layer={front}
            gridWidth={gridWidth}
            palette={BUDDY_PALETTE}
            scale={scale}
            flipped={flipped}
          />
        ) : null}
        {umbrella ? (
          <LayerSprite
            layer={umbrella}
            gridWidth={gridWidth}
            palette={PROP_PALETTE}
            scale={scale}
            flipped={flipped}
          />
        ) : null}
        {book ? (
          <LayerSprite
            layer={book}
            gridWidth={gridWidth}
            palette={THINGS_PALETTE}
            scale={scale}
            flipped={flipped}
          />
        ) : null}
        {butterfly ? (
          <Animated.View
            style={[
              styles.layer,
              styles.passThrough,
              {
                left: butterfly[1] * scale,
                top: butterfly[0] * scale,
                transform: [
                  {
                    translateX: flutter.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [spriteWidth, 0, -spriteWidth],
                    }),
                  },
                  {
                    translateY: flutter.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [-spriteHeight * 0.6, 0, -spriteHeight * 0.7],
                    }),
                  },
                ],
              },
            ]}
          >
            <PixelSprite frame={BUTTERFLY[tick % 2]} palette={PROP_PALETTE} scale={scale} />
          </Animated.View>
        ) : null}
        {/* In front of everything with the buddy, the umbrella too. */}
        {line && !evolving ? (
          <SpeechBubble
            text={t(`buddy.say.${line}`)}
            side={onRightHalf ? 'left' : 'right'}
            above={spriteHeight * 0.85}
          />
        ) : null}
      </Animated.View>
      {/* The station stands in front of the buddy, whether it is working there or walking by. */}
      {station ? (
        <View
          key={job}
          style={[
            styles.station,
            styles.passThrough,
            { left: STATION_LEFT, bottom: FLOOR - station.sink * cell },
          ]}
        >
          <Arrive fresh={job !== jobAtMount} width={station.frames[0][0].length * cell}>
            <PixelSprite
              frame={station.frames[atWork ? tick % 2 : 0]}
              palette={PROP_PALETTE}
              scale={cell}
            />
          </Arrive>
        </View>
      ) : null}
      {/* What it holds at work goes in front of the station too (the can over the plant's pot). */}
      {atWork && station?.held ? (
        <Animated.View
          style={[
            styles.buddy,
            styles.passThrough,
            {
              bottom: FLOOR - scale,
              left: workSway,
              width: spriteWidth,
              height: spriteHeight,
              transform: [{ translateX: x }, { translateY: rise }],
            },
          ]}
        >
          <View style={[styles.jobProp, heldAt(station.held, scale)]}>
            <PixelSprite
              frame={station.held.frames[tick % 2]}
              palette={PROP_PALETTE}
              scale={scale * (station.held.size ?? 1)}
            />
          </View>
        </Animated.View>
      ) : null}

      {/* The thought of food can be tapped to feed, as people do. Drawn above the buddy's box it
          sits outside it, where an iPhone does not pass touches on; this follows it on the stage
          instead, a little larger than the cloud. */}
      {thinking ? (
        <Animated.View
          style={[
            styles.buddy,
            {
              bottom:
                FLOOR -
                scale -
                workNod -
                (sitting ? SIT_ROWS * scale : 0) +
                frame.length * scale +
                THOUGHT_TOP -
                THOUGHT_FOOD.length * 2 -
                THOUGHT_SLOP,
              left:
                workSway +
                (onRightHalf ? frame[0].length * scale + 4 - THOUGHT_FOOD[0].length * 2 : -4) -
                THOUGHT_SLOP,
              transform: [{ translateX: x }],
            },
          ]}
        >
          <Pressable
            onPress={feed}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.feed')}
            style={{
              width: THOUGHT_FOOD[0].length * 2 + THOUGHT_SLOP * 2,
              height: THOUGHT_FOOD.length * 2 + THOUGHT_SLOP * 2,
            }}
          />
        </Animated.View>
      ) : null}

      {/* The table, out for the meal and in front of the buddy, which eats behind it. */}
      {table.present ? (
        <Animated.View
          style={[
            styles.buddy,
            styles.passThrough,
            {
              bottom: FLOOR - 2,
              left: workSway + (spriteWidth - TABLE_CELLS * PROP_SCALE) / 2,
              opacity: table.value.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [0, 1, 1],
              }),
              transform: [
                { translateX: x },
                // Set down from just above, landing with a little bounce; sinking a touch as it goes.
                {
                  translateY: table.value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [eating ? -14 : 4, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <PixelSprite
            frame={mealTable(eating ? active?.phase === 'main' : tableFull, decor.bowl)}
            palette={PROP_PALETTE}
            scale={PROP_SCALE}
          />
        </Animated.View>
      ) : null}

      {/* A tap on the station sends the buddy to work there. */}
      {station ? (
        <Pressable
          onPress={work}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('buddy.work', { buddy: buddy.name })}
          style={[
            styles.station,
            {
              left: STATION_LEFT,
              bottom: FLOOR - station.sink * cell,
              width: station.frames[0][0].length * cell,
              height: station.frames[0].length * cell,
            },
          ]}
        />
      ) : null}

      {isGuest(act) && isFloorPasser(act) && width > 0 ? (
        <Passer key={actRun} kind={act} width={width} scale={3} tick={tick} />
      ) : null}
      {active?.kind === 'maxLevel' && width > 0 ? (
        <RoomSparkle width={width} height={height - FLOOR} tick={tick} />
      ) : null}

      {/* In front of the buddy, so one by its feet can still be tapped away. */}
      {slots.map((slot) => (
        <Animated.View
          key={slot}
          style={[
            styles.poop,
            {
              bottom: FLOOR - 2,
              right: poopRight + slot * 30,
              transform: [{ translateY: nudge }],
            },
          ]}
        >
          <Pressable
            onPress={() => clean(slot)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.cleanUp')}
          >
            <DroppingIn>
              <PixelSprite frame={POOP} palette={PROP_PALETTE} scale={PROP_SCALE} />
            </DroppingIn>
          </Pressable>
        </Animated.View>
      ))}
      {flyingOff.map((poop) => (
        <FlyingAway
          key={poop.key}
          id={poop.key}
          onDone={doneLeaving}
          style={[styles.poop, { bottom: FLOOR - 2, right: poopRight + poop.index * 30 }]}
        />
      ))}

      {/* The light of the hour over the room and the buddy (room-light.tsx). */}
      {!dream ? (
        <RoomLight
          hour={roomHour(now.getHours())}
          width={width}
          height={height}
          floorTop={height - FLOOR}
          glass={glass}
          lamp={decor.lamp && lampLit ? lampShadeAt(width, height, FLOOR, plantRoom) : null}
          fullMoon={isFullMoon(now)}
          station={
            station
              ? station.light.onBehind && station.behind
                ? {
                    x: STATION_LEFT + (station.behind.col + station.light.col) * cell,
                    y:
                      height -
                      (FLOOR - cell) -
                      (station.behind.frame.length - station.light.row) * cell,
                    color: station.light.color,
                    aim: station.light.aim
                      ? {
                          x: STATION_LEFT + station.light.aim.col * cell,
                          y:
                            height -
                            (FLOOR - station.sink * cell) -
                            (station.frames[0].length - station.light.aim.row) * cell,
                        }
                      : undefined,
                  }
                : {
                    x: STATION_LEFT + station.light.col * cell,
                    y:
                      height -
                      (FLOOR - station.sink * cell) -
                      (station.frames[0].length - station.light.row) * cell,
                    color: station.light.color,
                  }
              : null
          }
          dark={colorMode === 'dark'}
        />
      ) : null}
      {topOn && width > 0 ? <Feathers key={`f${topId}`} width={width} height={height} /> : null}
      {topOn ? <TopLevelNotes key={`n${topId}`} notes={topNotes} /> : null}
      {noticeShown ? (
        <View style={[styles.notice, styles.passThrough]}>
          <Text
            style={[
              styles.noticeText,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.accent },
            ]}
          >
            {t(`buddy.${noticeShown.key}`, {
              level: noticeShown.level,
              icon: noticeShown.job ? JOB_ICON[noticeShown.job] : '',
              job: noticeShown.job ? t(`buddy.job.${noticeShown.job}`) : '',
            })}
          </Text>
        </View>
      ) : null}

      {/* The evolution's quick flash as the new look settles, over the whole stage. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
      {cornerButton ? <View style={styles.corner}>{cornerButton}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same as BuddyScene's frame (the demo uses the stage alone).
  stage: {
    borderBottomWidth: 2,
    overflow: 'hidden',
  },
  // The space left of the corner buttons; only the tile in it takes taps.
  info: {
    position: 'absolute',
    top: 8,
    left: 6,
    right: 6,
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
    // Over the room's light (room-light.tsx).
    zIndex: 2,
  },
  // Ends above WALL_TOP, so the wall's things stay clear of it.
  pill: {
    maxWidth: '100%',
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 13,
    borderWidth: 1,
  },
  chevron: {
    marginLeft: -2,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  level: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  // Row containers: the bar stretches with flex, which in a column would collapse its height.
  bar: {
    width: 72,
    flexDirection: 'row',
  },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
  },
  bowl: {
    position: 'absolute',
  },
  poop: {
    position: 'absolute',
  },
  rice: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  grown: {
    fontSize: 13,
  },
  bowlAsk: {
    position: 'absolute',
    top: -18,
    left: 15,
  },
  buddy: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  above: {
    position: 'absolute',
    top: -24,
  },
  corner: {
    position: 'absolute',
    top: 4,
    right: 6,
    zIndex: 2,
  },
  jobProp: {
    position: 'absolute',
  },
  station: {
    position: 'absolute',
  },
  // Room for the big heart of a pet shared by both.
  thought: {
    position: 'absolute',
    top: -THOUGHT_TOP,
  },
  thoughtRight: {
    right: -4,
  },
  thoughtLeft: {
    left: -4,
  },
  aboveRight: {
    right: 0,
  },
  aboveBig: {
    top: -44,
  },
  layer: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 244, 196, 0.85)',
    borderWidth: 4,
    borderColor: '#FFD166',
    pointerEvents: 'none',
  },
  hidden: {
    opacity: 0,
  },
  passThrough: {
    pointerEvents: 'none',
  },
  cleanSparkle: {
    position: 'absolute',
    top: -8,
    left: -8,
  },
  levelUp: {
    fontWeight: '700',
  },
  notice: {
    position: 'absolute',
    top: 40,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  flash: {
    backgroundColor: '#FFFFFF',
    pointerEvents: 'none',
  },
  folded: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foldedBar: {
    flex: 1,
    flexDirection: 'row',
  },
  status: {
    fontSize: 14,
  },
});
