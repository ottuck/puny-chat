import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Svg, { G, Rect } from 'react-native-svg';
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
import { useColors } from '@/theme';

import type { AlbumEntry } from '@/features/room/api';

import type { BuddyJob, BuddyView } from '../api';
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
import {
  bowl,
  BUDDY_PALETTE,
  buddyFrame,
  EXCLAIM,
  HEART,
  JOB_PROPS,
  JOB_STATIONS,
  type Station,
  LEVEL_UP,
  mealTable,
  NOTE,
  POOP,
  type Pose,
  PROP_PALETTE,
  RICE,
  SPARKLE,
  STAGE_ORDER,
  THOUGHT_FOOD,
  ZZZ,
} from '../pixel/sprites';
import type { Reaction, ReactionKind } from '../reactions';
import type { ChatWord, Mood } from '../chat-words';
import { JOB_LINES, type Line, pick, useBuddyTalk } from '../use-buddy-talk';
import { SpeechBubble } from './speech-bubble';
import { decorFor, Plant, plantRoom as plantRoomFor, WallDecor } from './stage-decor';

// The buddy's stage above the chat (docs/spec.md, 핵심 경험): the buddy walks around, waits by
// an empty bowl when hungry, leaves poops on the floor and sleeps at night. Tapping the bowl or a
// poop takes care of it right there, and it reacts to what happens in the room: eating when fed,
// straining when it poops, sparkling when cleaned, hopping at a new message, and evolving. Left
// alone it dances or sings now and then, and once grown it talks (use-buddy-talk.ts). It keeps its
// size while typing and reading back: a stage that folds and unfolds moved the chat under the
// finger and broke scrolling.

const FLOOR = 22;
const PROP_SCALE = 3;
// How wide the meal table is, in its pixels (sprites.ts, mealTable).
const TABLE_CELLS = 27;
const TICK_MS = 450;
// While evolving the old and new looks swap this fast.
const FAST_TICK_MS = 90;
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
  | 'job';
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
] as const;
type Happening = (typeof HAPPENINGS)[number];
const isHappening = (kind: string): kind is Happening =>
  (HAPPENINGS as readonly string[]).includes(kind);
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
  // At the station, once there.
  job: 2400,
};
// How long the butterfly takes to come down onto the head, and to fly off again.
const BUTTERFLY_FLY_MS = 700;
// The rain: drops this far apart down the stage, falling one gap in this long, again and again.
const RAIN_GAP = 30;
const RAIN_FALL_MS = 420;
// Snow drifts down more slowly.
const SNOW_FALL_MS = 1500;
// The colors of the happenings drawn without a grid: the dusk sky, its stars, the rain.
const DUSK = 'rgba(28, 36, 64, 0.62)';
const STAR = '#FFE9A8';
const RAIN = '#8FB8D8';
const SNOW = '#FFFFFF';
const SNOW_SHADE = '#B9CCDD';
// Where the stars come out, as fractions of the stage.
const STARS = [
  [0.08, 0.22],
  [0.3, 0.12],
  [0.52, 0.3],
  [0.7, 0.1],
  [0.9, 0.34],
  [0.18, 0.46],
] as const;
// The drops of one gap's worth of rain, column by column, each column a little off from the next.
// Under the umbrella (`shelter`, in the stage's points) none fall.
function rainDrops(
  width: number,
  height: number,
  apart: number,
  shelter: { left: number; right: number; top: number } | null,
): [number, number][] {
  const drops: [number, number][] = [];
  for (let x = 6, i = 0; x < width; x += apart, i++) {
    for (let y = (i * 13) % RAIN_GAP; y < height + RAIN_GAP; y += RAIN_GAP) {
      if (shelter && x + 2 > shelter.left && x < shelter.right && y + 9 > shelter.top) continue;
      drops.push([x, y]);
    }
  }
  return drops;
}
// The longest the walk over to the station may take before the work starts anyway.
const JOB_WALK_MAX_MS = 4000;
// How long each point of the walk to work takes, in ms: a brisk walk.
const JOB_WALK_MS = 12;
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
};
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

function pickIdleAct(job: BuddyJob | null): Act {
  const acts: readonly (readonly [Act, number])[] = job
    ? [...IDLE_ACTS, ['job', JOB_ACT_WEIGHT]]
    : IDLE_ACTS;
  let roll = Math.random() * acts.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [act, weight] of acts) {
    roll -= weight;
    // In winter the rain comes as snow.
    if (roll < 0) return act === 'rain' && isWinter(new Date()) ? 'snow' : act;
  }
  return 'dance';
}
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
  evolved: 2600,
  together: 2400,
  here: 2000,
};
// Of 'fed', the part spent chewing; the rest is a happy heart.
const CHEW_MS = 2400;
// Of 'evolved', the transformation (rings of light, old and new looks flickering); the rest shows
// off the new look with a burst of sparkles.
const EVOLVE_MS = 1400;
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
  // Buddies gone their own way: their portraits hang on the wall, and the decorations stay.
  album?: AlbumEntry[];
  // The season's look (pixel/looks.ts): by the date unless given (the art preview picks one).
  season?: Season | null;
};

// Local night hours, checked once a minute.
function useSleeping(job: BuddyJob | null): boolean {
  const [hour, setHour] = useState(() => new Date().getHours());
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
      <PixelSprite frame={layer.frame} palette={palette} scale={scale} flipped={flipped} />
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
      reaction.kind === 'fed' ? CHEW_MS : reaction.kind === 'evolved' ? EVOLVE_MS : undefined;
    if (main !== undefined) {
      timers.push(setTimeout(() => setActive({ kind: reaction.kind, phase: 'after' }), main));
    }
    timers.push(setTimeout(() => setActive(null), REACTION_MS[reaction.kind]));
    return () => timers.forEach(clearTimeout);
  }, [reaction]);
  return active;
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

// A poop just cleaned up: it spins up and away, fading, with a sparkle.
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
      duration: 650,
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
          opacity: away.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { translateY: away.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) },
            { rotate: away.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) },
            { scale: away.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
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

function gridScale(height: number, gridHeight: number): number {
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
  album,
  season: chosenSeason,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  // The stage mounts again each time it unfolds; what happened before that is not news. Without
  // this, focusing the composer and leaving it replayed the last evolution every time.
  const [mountedAfter] = useState(latest?.id);
  const reaction = latest && latest.id !== mountedAfter ? latest : null;
  const active = useActiveReaction(reaction);
  const [cueMountedAfter] = useState(latestCue?.id);
  const cue = latestCue && latestCue.id !== cueMountedAfter ? latestCue : null;
  const evolving = active?.kind === 'evolved' && active.phase === 'main';
  const [act, setAct] = useState<Act | null>(null);
  const [actRun, setActRun] = useState(0);
  const actTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useTick(evolving || act === 'refuse' ? FAST_TICK_MS : TICK_MS);
  const job = buddy.job;
  const night = useSleeping(job);
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
  const [tilt] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  const [nudge] = useState(() => new Animated.Value(0));
  const [note] = useState(() => new Animated.Value(0));
  const [flutter] = useState(() => new Animated.Value(0));
  const [rainFall] = useState(() => new Animated.Value(0));
  const [dusk] = useState(() => new Animated.Value(0));
  const [rainX, setRainX] = useState<number | null>(null);
  // Which half of the stage the buddy is heading to, so its speech bubble opens toward the middle.
  const [onRightHalf, setOnRightHalf] = useState(false);

  const egg = buddy.stage === 'EGG';
  // A reaction wakes a sleeping buddy for a moment, "good night" puts it to sleep by day too.
  const sleeping = ((night && !mood) || mood === 'goodnight') && !active && !petted;
  const idleFrame = buddyFrame(buddy.stage, 'idle');
  const scale = gridScale(height, idleFrame.length);
  const spriteWidth = idleFrame[0].length * scale;
  const spriteHeight = idleFrame.length * scale;
  const glowSize = Math.round(spriteWidth * 1.5);
  const bowlWidth = 12 * PROP_SCALE;
  // A child or grown-up has hands: no bowl stands about, a table comes out for the meal.
  const atTable = buddy.stage === 'CHILD' || buddy.stage === 'ADULT';
  const decor = decorFor(buddy.level, album ?? []);
  // The season's corner stands in for the plant that week.
  const corner = season ? SEASON_CORNER[season] : undefined;
  const plantRoom = corner
    ? Math.ceil(corner.frame[0].length * corner.size * scale) + 8
    : plantRoomFor(decor);
  // The bowl stands by the plant on the right; the poops land left of it.
  const bowlRight = 16 + plantRoom;
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
  const stationX = station ? STATION_LEFT + station.standAt * scale : 0;
  const eating = active?.kind === 'fed';
  const settled = sleeping || buddy.hungry || egg || eating || evolving;
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
        next === 'job' ? JOB_WALK_MAX_MS + ACT_MS.job : ACT_MS[next],
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
    if (width === 0) return;
    // Dancing, singing or feeling something on the spot.
    if (acting || mood) {
      x.stopAnimation();
      return;
    }
    let stopped = false;
    let current: Animated.CompositeAnimation | null = null;
    const home = buddy.hungry || eating ? maxX : (minX + maxX) / 2;
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
  }, [width, spriteWidth, settled, acting, mood, eating, buddy.hungry, atTable, minX, maxX, x]);

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
  // "노래" from the other one is a message too, and asks for the song.
  useEffect(() => {
    if (!reaction || reaction.kind === 'message') return;
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
      () => perform(pickIdleAct(job)),
      pace * (IDLE_ACT_MIN_MS + Math.random() * (IDLE_ACT_MAX_MS - IDLE_ACT_MIN_MS)),
    );
    return () => clearTimeout(timer);
  }, [egg, settled, active, acting, petted, mood, partnerHere, job, perform]);

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

  // A butterfly comes down onto the head and flies off again; the rain keeps falling; the sky goes
  // dark for a shooting star to cross it (dusk: 0→1 darkening, 1→2 the star, 2→3 light again).
  useEffect(() => {
    if (act !== 'butterfly' && act !== 'rain' && act !== 'snow' && act !== 'shootingStar') return;
    // It stands still under the umbrella: where, so the rain can miss it.
    if (act === 'rain') x.stopAnimation((value) => setRainX(value));
    const to = (value: Animated.Value, toValue: number, duration: number, easing = Easing.linear) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: NATIVE_DRIVER });
    const move =
      act === 'butterfly'
        ? Animated.sequence([
            to(flutter, 1, BUTTERFLY_FLY_MS, Easing.out(Easing.quad)),
            Animated.delay(ACT_MS.butterfly - 2 * BUTTERFLY_FLY_MS),
            to(flutter, 2, BUTTERFLY_FLY_MS, Easing.in(Easing.quad)),
          ])
        : act === 'rain' || act === 'snow'
          ? Animated.loop(to(rainFall, 1, act === 'rain' ? RAIN_FALL_MS : SNOW_FALL_MS))
          : Animated.sequence([
              to(dusk, 1, 500),
              to(dusk, 2, 1000, Easing.in(Easing.quad)),
              Animated.delay(ACT_MS.shootingStar - 2000),
              to(dusk, 3, 500),
            ]);
    move.start();
    return () => {
      move.stop();
      flutter.setValue(0);
      rainFall.setValue(0);
      dusk.setValue(0);
      setRainX(null);
    };
  }, [act, actRun, flutter, rainFall, dusk, x]);

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
  // feeds it.
  const thinking = wantsFood && !sleeping;
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
    if (!next) return;
    const say_ = next;
    const timer = setTimeout(() => say(say_), 0);
    return () => clearTimeout(timer);
  }, [active, job, say]);

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
        Animated.timing(hop, { toValue: -h, duration: 140, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: 140, useNativeDriver: NATIVE_DRIVER }),
      ]);
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, { toValue: 2, duration: 60, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(hop, { toValue: 0, duration: 60, useNativeDriver: NATIVE_DRIVER }),
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
      evolved: transform,
      // Both came today: two big happy jumps.
      together: Animated.sequence([jump(16), jump(16)]),
      // The partner is here: one happy hop.
      here: Animated.sequence([jump(12), jump(6)]),
    };
    const move = moves[reaction.kind];
    move?.start();
    return () => {
      move?.stop();
      glow.setValue(0);
      burst.setValue(1);
      flash.setValue(0);
    };
  }, [reaction, hop, flash, glow, burst]);

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

  const basePose: Pose = eating
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
          : act === 'job' && job
            ? atWork
              ? jobPose(job, tick)
              : tick % 2 === 0
                ? 'step'
                : 'idle'
            : act === 'yawn'
              ? 'yawn'
              : act === 'hiccup'
                ? 'hiccup'
                : act === 'startle' || act === 'shootingStar'
                  ? 'surprised'
                  : act === 'butterfly' || act === 'snow'
                    ? tick % 2 === 0
                      ? 'happy'
                      : 'idle'
                    : act === 'refuse' || act === 'lookAround'
                      ? 'idle'
                      : active?.kind === 'cleaned' ||
                          active?.kind === 'levelUp' ||
                          active?.kind === 'together' ||
                          active?.kind === 'here' ||
                          (active?.kind === 'evolved' && !evolving) ||
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
  // Dressed for the season or its job, but not in the middle of growing.
  const frame = evolving
    ? buddyFrame(tick % 2 === 0 ? previousStage : buddy.stage, tick % 2 === 0 ? 'idle' : pose)
    : dressedFrame(buddy.stage, pose, job, season);

  const gridWidth = frame[0].length;
  // Resting on the head while it is there.
  const butterfly = act === 'butterfly' && buddy.stage !== 'EGG' ? butterflyAt(buddy.stage) : null;

  // A writer's love, and a pet shared by both, show a big heart.
  const bigHeart = mood === 'coPet' || (mood === 'love' && job === 'WRITER');
  const showHeart =
    petted ||
    (act === 'job' && job === 'WRITER') ||
    mood === 'love' ||
    mood === 'coPet' ||
    (eating && active?.phase === 'after') ||
    active?.kind === 'together' ||
    active?.kind === 'here';
  const sparkling = active?.kind === 'cleaned';
  const bursting = active?.kind === 'evolved' && active.phase === 'after';
  const levelingUp = active?.kind === 'levelUp';

  // Rice in the bowl, but for when the buddy is hungry: then it is empty and asks to be filled.
  const bowlFull = !buddy.hungry || eating;
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

  // Poops tapped away fly up and fade; the ones still there stay in place.
  const [seenPoops, setSeenPoops] = useState(buddy.poops);
  const [poopRound, setPoopRound] = useState(0);
  const [leaving, setLeaving] = useState<{ key: string; index: number }[]>([]);
  if (buddy.poops !== seenPoops) {
    if (buddy.poops < seenPoops) {
      const gone = Array.from({ length: seenPoops - buddy.poops }, (_, k) => ({
        key: `${poopRound}-${buddy.poops + k}`,
        index: buddy.poops + k,
      }));
      setLeaving((prev) => [...prev, ...gone]);
    }
    setPoopRound(poopRound + 1);
    setSeenPoops(buddy.poops);
  }
  const doneLeaving = useCallback(
    (key: string) => setLeaving((prev) => prev.filter((poop) => poop.key !== key)),
    [],
  );
  // At work the cook sways to the pot and the DJ nods.
  const workSway = atWork && job === 'CHEF' ? (tick % 2 === 0 ? -scale : 0) : 0;
  const workNod = atWork && job === 'DJ' && tick % 2 === 0 ? scale : 0;
  // Dancing and head-shaking turn the buddy left and right.
  const flipped =
    act === 'dance' || act === 'refuse' || act === 'lookAround' ? tick % 2 === 0 : facingLeft;

  // The umbrella over it in the rain, and the part of the stage it keeps dry.
  const umbrella = act === 'rain' && buddy.stage !== 'EGG' ? umbrellaFor(buddy.stage) : null;
  const shelter = (() => {
    if (!umbrella || rainX === null) return null;
    const cells = umbrella.frame[0].length;
    const col = flipped ? gridWidth - umbrella.col - cells : umbrella.col;
    const left = rainX + workSway + col * scale;
    const top = height - (FLOOR - scale) - spriteHeight + umbrella.row * scale;
    return { left, right: left + cells * scale, top };
  })();
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
  const clean = () => {
    if (!buddy.canClean || busy) return;
    onClean();
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
      style={[styles.stage, { height, backgroundColor: colors.stage }]}
    >
      <Pressable
        onPress={onOpenDetail}
        accessibilityRole="button"
        accessibilityLabel={t('buddy.open', { buddy: buddy.name })}
        style={styles.info}
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
      </Pressable>

      {/* The job's mark: its tool, small, in the corner. */}
      {job ? (
        <View
          style={[styles.jobBadge, styles.passThrough]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t(`buddy.job.${job}`)}
        >
          <PixelSprite frame={JOB_PROPS[job][0]} palette={PROP_PALETTE} scale={2} />
        </View>
      ) : null}

      <View
        style={[
          styles.floor,
          { height: FLOOR, backgroundColor: colors.stageFloor, borderTopColor: colors.stageLine },
        ]}
      />

      <WallDecor decor={decor} floor={FLOOR} top={34} />
      {corner ? (
        <View style={[styles.poop, { bottom: FLOOR - 2, right: 8 }]} pointerEvents="none">
          <PixelSprite frame={corner.frame} palette={PROP_PALETTE} scale={scale * corner.size} />
        </View>
      ) : decor.plant ? (
        <View style={[styles.poop, { bottom: FLOOR - 2, right: 8 }]} pointerEvents="none">
          <Plant tier={decor.plant} scale={decor.plantScale} />
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

      {act === 'shootingStar' ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.passThrough,
            {
              backgroundColor: DUSK,
              opacity: dusk.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 1, 1, 0] }),
            },
          ]}
        >
          <Svg width={width} height={height - FLOOR}>
            {STARS.map(([sx, sy], i) => (
              <Rect key={i} x={sx * width} y={sy * height} width={4} height={4} fill={STAR} />
            ))}
          </Svg>
          <Animated.View
            style={[
              styles.layer,
              {
                opacity: dusk.interpolate({
                  inputRange: [0.9, 1, 2, 2.1],
                  outputRange: [0, 1, 1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateX: dusk.interpolate({
                      inputRange: [1, 2],
                      outputRange: [width * 0.85, width * 0.2],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: dusk.interpolate({
                      inputRange: [1, 2],
                      outputRange: [14, 64],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            {/* The tail trails up and to the right of the falling star. */}
            {Array.from({ length: 7 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.layer,
                  styles.streak,
                  { left: 4 + i * 7, top: 2 - i * 5, opacity: 1 - i / 7 },
                ]}
              />
            ))}
            <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={2} />
          </Animated.View>
        </Animated.View>
      ) : null}
      {(act === 'rain' || act === 'snow') && width > 0 ? (
        <Animated.View
          style={[
            styles.rain,
            styles.passThrough,
            {
              top: -RAIN_GAP,
              transform: [
                {
                  translateY: rainFall.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, RAIN_GAP],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={width} height={height - FLOOR + RAIN_GAP}>
            {act === 'rain'
              ? rainDrops(width, height - FLOOR, 26, shelter).map(([dx, dy]) => (
                  <Rect key={dx + ',' + dy} x={dx} y={dy} width={2} height={9} fill={RAIN} />
                ))
              : rainDrops(width, height - FLOOR, 34, null).map(([dx, dy]) => (
                  <G key={dx + ',' + dy}>
                    <Rect x={dx + 1} y={dy + 1} width={4} height={4} fill={SNOW_SHADE} />
                    <Rect x={dx} y={dy} width={4} height={4} fill={SNOW} />
                  </G>
                ))}
          </Svg>
        </Animated.View>
      ) : null}

      {companionEgg ? (
        <View style={[styles.poop, { bottom: FLOOR - 2, right: poopRight + 4 }]}>
          <PixelSprite frame={buddyFrame('EGG', 'idle')} palette={BUDDY_PALETTE} scale={3} />
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.buddy,
          {
            bottom: FLOOR - scale - workNod,
            left: workSway,
            transform: [
              { translateX: x },
              { translateY: hop },
              {
                rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }),
              },
            ],
          },
        ]}
      >
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
        ) : thinking ? (
          // Away from the speech bubble, its trail of puffs toward the head.
          <Animated.View
            style={[
              styles.thought,
              styles.passThrough,
              onRightHalf ? styles.thoughtRight : styles.thoughtLeft,
              { transform: [{ translateY: nudge }] },
            ]}
          >
            <PixelSprite
              frame={THOUGHT_FOOD}
              palette={PROP_PALETTE}
              scale={2}
              flipped={!onRightHalf}
            />
          </Animated.View>
        ) : active?.kind === 'message' || act === 'startle' ? (
          <View style={styles.above}>
            <PixelSprite frame={EXCLAIM} palette={BUDDY_PALETTE} scale={3} />
          </View>
        ) : sleeping && tick % 4 < 2 ? (
          <View style={styles.above}>
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
          <PixelSprite frame={frame} palette={BUDDY_PALETTE} scale={scale} flipped={flipped} />
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
          style={[
            styles.station,
            styles.passThrough,
            { left: STATION_LEFT, bottom: FLOOR - station.sink * scale },
          ]}
        >
          <PixelSprite
            frame={station.frames[atWork ? tick % 2 : 0]}
            palette={PROP_PALETTE}
            scale={scale}
          />
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
              transform: [{ translateX: x }, { translateY: hop }],
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

      {/* The table, out for the meal and in front of the buddy, which eats behind it. */}
      {atTable && eating ? (
        <Animated.View
          style={[
            styles.buddy,
            styles.passThrough,
            {
              bottom: FLOOR - 2,
              left: workSway + (spriteWidth - TABLE_CELLS * PROP_SCALE) / 2,
              transform: [{ translateX: x }],
            },
          ]}
        >
          <PixelSprite
            frame={mealTable(active?.phase === 'main', decor.bowl)}
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
              bottom: FLOOR - station.sink * scale,
              width: station.frames[0][0].length * scale,
              height: station.frames[0].length * scale,
            },
          ]}
        />
      ) : null}

      {/* In front of the buddy, so one by its feet can still be tapped away. */}
      {Array.from({ length: buddy.poops }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.poop,
            {
              bottom: FLOOR - 2,
              right: poopRight + i * 30,
              transform: [{ translateY: nudge }],
            },
          ]}
        >
          <Pressable
            onPress={clean}
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
      {leaving.map((poop) => (
        <FlyingAway
          key={poop.key}
          id={poop.key}
          onDone={doneLeaving}
          style={[styles.poop, { bottom: FLOOR - 2, right: poopRight + poop.index * 30 }]}
        />
      ))}

      {/* The evolution's quick flash as the new look settles, over the whole stage. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  info: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
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
  jobBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
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
    top: -40,
  },
  thoughtRight: {
    right: -4,
  },
  thoughtLeft: {
    left: -4,
  },
  aboveBig: {
    top: -44,
  },
  layer: {
    position: 'absolute',
  },
  rain: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  streak: {
    width: 4,
    height: 4,
    backgroundColor: '#FFD166',
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
