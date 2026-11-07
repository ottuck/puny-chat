import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { type Frame, PixelSprite } from '../pixel/pixel-sprite';
import {
  TABLE,
  LAMP,
  MUSIC_BOX,
  type RugTier,
  RUGS,
  ROOM_PALETTE,
  skyAt,
  WINDOW,
  WINDOW_GLASS,
  WINDOW_SILL_ROW,
} from '../pixel/room';
import {
  BEAR,
  booksFrame,
  BUNNY,
  fishHome,
  type FishStyle,
  GRAMOPHONE,
  HANGING_PLANT,
  HANGING_PLANT_AT,
  HANGING_PLANT_FINE,
  PINK_SUCCULENT,
  RADIO,
  SHELF,
  SILL_POT,
  THINGS_PALETTE,
} from '../pixel/room-things';
import {
  type BowlTier,
  FALLEN_AT,
  FRUIT_AT,
  FRUIT_TREE,
  ORANGE,
  ORANGE_FALLEN,
  PLANTS,
  type PlantTier,
  PROP_PALETTE,
} from '../pixel/sprites';
import type { WindowWeather } from './weather';
import {
  Arrive,
  CUCKOO_CELLS,
  CuckooClock,
  Fireflies,
  FishBowl,
  FloorPattern,
  FloorToy,
  type Guest,
  GUESTS,
  isFloorPasser,
  LowTable,
  MusicBox,
  Radio,
  RoomWindow,
  SillPot,
  StandingLamp,
  TABLE_CELLS,
  Tappable,
  WallClock,
  type WindowThings,
} from './room-props';

// The stage's decorations (docs/PROJECT.md 무대 꾸미기, docs/fun-improvements.md 방 소품). Every level
// the room gets something: a spot not used yet fills (the left of the floor, the wall, the window,
// its sill, the side table, the middle of the rug), or a thing already there gets finer (the pot,
// the bowl, the rug, the floor, the clock, the radio). Nothing pushes anything out, one thing to a
// spot. A few are only out in their season. They belong to the buddy: when it goes its own way it
// takes them along, the new egg's room starts bare, and its photo goes into the album (album-gallery.tsx).

export type Reward =
  | 'plant1'
  | 'crate'
  | 'bowl1'
  | 'toys'
  | 'window'
  | 'plant2'
  | 'rug1'
  | 'clock'
  | 'musicBox'
  | 'snail'
  | 'rug2'
  | 'plant3'
  | 'wood'
  | 'firefly'
  | 'bowl2'
  | 'rug3'
  | 'plant4'
  | 'train'
  | 'robot'
  | 'kitten'
  | 'vacuum'
  | 'sparrow'
  | 'tatami'
  | 'lamp'
  | 'catTail'
  | 'plant5'
  | 'bowl3'
  | 'hangingPlant'
  | 'ladybug'
  | 'radio'
  | 'sillPot'
  | 'fishbowl'
  | 'furin'
  | 'dragonfly'
  | 'bear'
  | 'cuckoo'
  | 'kotatsu'
  | 'swallow'
  | 'sakura'
  | 'goldMusicBox'
  | 'tea'
  | 'owl'
  | 'lampShade'
  | 'mochi'
  | 'rug4'
  | 'books'
  | 'bookshelf'
  | 'pinkSucculent'
  | 'rainbow'
  | 'squirrel'
  | 'gramophone'
  | 'waterPlants'
  | 'catFace'
  | 'bunny'
  | 'sillFlower';

// Shown in the guide and the buddy sheet ("next: Lv.4 table") as well. One for every level but a
// new stage (2, 5, 8) and the top one, 60, where the whole room sparkles. The job (10) and the first
// chance to change it (20) bring the bowl's next tiers, seen at every meal; the later chances (30, 40,
// 50) each bring a thing that comes only in its season (the wind chime, the cherry petals, the New
// Year's mochi).
export const REWARDS: readonly { level: number; reward: Reward }[] = [
  { level: 3, reward: 'window' },
  { level: 4, reward: 'crate' },
  { level: 6, reward: 'plant1' },
  { level: 7, reward: 'toys' },
  { level: 9, reward: 'bowl1' },
  { level: 10, reward: 'bowl2' },
  { level: 11, reward: 'rug1' },
  { level: 12, reward: 'clock' },
  { level: 13, reward: 'plant2' },
  { level: 14, reward: 'snail' },
  { level: 15, reward: 'musicBox' },
  { level: 16, reward: 'rug2' },
  { level: 17, reward: 'wood' },
  { level: 18, reward: 'sparrow' },
  { level: 19, reward: 'plant3' },
  { level: 20, reward: 'bowl3' },
  { level: 21, reward: 'hangingPlant' },
  { level: 22, reward: 'firefly' },
  { level: 23, reward: 'ladybug' },
  { level: 24, reward: 'train' },
  { level: 25, reward: 'radio' },
  { level: 26, reward: 'sillPot' },
  // After the shelf (15).
  { level: 27, reward: 'books' },
  { level: 28, reward: 'lamp' },
  { level: 29, reward: 'rug3' },
  // The job's later chances bring a thing of the season (seen only in its season, so the level's own
  // news is the job; the levels between keep the things there all year).
  { level: 30, reward: 'furin' },
  { level: 31, reward: 'robot' },
  { level: 32, reward: 'plant4' },
  { level: 33, reward: 'dragonfly' },
  { level: 34, reward: 'bear' },
  { level: 35, reward: 'catTail' },
  { level: 36, reward: 'cuckoo' },
  { level: 37, reward: 'tatami' },
  { level: 38, reward: 'kotatsu' },
  { level: 39, reward: 'swallow' },
  { level: 40, reward: 'sakura' },
  { level: 41, reward: 'kitten' },
  { level: 42, reward: 'fishbowl' },
  { level: 43, reward: 'goldMusicBox' },
  { level: 44, reward: 'tea' },
  { level: 45, reward: 'plant5' },
  { level: 46, reward: 'owl' },
  { level: 47, reward: 'lampShade' },
  { level: 48, reward: 'pinkSucculent' },
  { level: 49, reward: 'vacuum' },
  { level: 50, reward: 'mochi' },
  { level: 51, reward: 'rug4' },
  { level: 52, reward: 'bookshelf' },
  { level: 53, reward: 'rainbow' },
  { level: 54, reward: 'squirrel' },
  { level: 55, reward: 'gramophone' },
  { level: 56, reward: 'waterPlants' },
  { level: 57, reward: 'catFace' },
  { level: 58, reward: 'bunny' },
  { level: 59, reward: 'sillFlower' },
];

export function rewardLevel(reward: Reward): number {
  return REWARDS.find((entry) => entry.reward === reward)?.level ?? 0;
}

// The reward a level brings, if any (the chat's level-up line names it).
export function rewardAt(level: number): Reward | null {
  return REWARDS.find((entry) => entry.level === level)?.reward ?? null;
}

// The things out only in their season, by the device's date: from [month, day] through [month,
// day], over the new year for the kotatsu and the mochi. Their names say when (buddy.reward.*).
// Out of season the kotatsu is a plain low table and the rest are put away.
export const SEASONAL = {
  sakura: [
    [3, 20],
    [4, 30],
  ],
  furin: [
    [6, 1],
    [9, 15],
  ],
  dragonfly: [
    [9, 1],
    [10, 31],
  ],
  kotatsu: [
    [11, 15],
    [3, 15],
  ],
  mochi: [
    [12, 28],
    [1, 15],
  ],
} as const;

export function inSeason(thing: keyof typeof SEASONAL, date: Date): boolean {
  const [[fromMonth, fromDay], [toMonth, toDay]] = SEASONAL[thing];
  const day = (date.getMonth() + 1) * 100 + date.getDate();
  const from = fromMonth * 100 + fromDay;
  const to = toMonth * 100 + toDay;
  return from <= to ? day >= from && day <= to : day >= from || day <= to;
}

// Which kind a pot grows into, drawn once per room and buddy: the same on both phones and every
// time the app opens (a hash of the buddy's name and the tier, not a fresh random number).
function kindOf(seed: string, tier: PlantTier, kinds: number): number {
  let hash = tier * 31;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash % kinds;
}

// The highest tier reached of a chain of rewards.
function tierOf<T extends number>(has: (reward: Reward) => boolean, chain: Reward[]): T | 0 {
  for (let i = chain.length; i > 0; i--) if (has(chain[i - 1])) return i as T;
  return 0;
}

// `seed`: the buddy's name. `kind`: a kind to show regardless (the art preview). `now`: the room's
// time, for what is out in its season and which guests come (the owl only at night).
export function decorFor(level: number, seed = '', kind?: number, now = new Date()) {
  const has = (reward: Reward) => level >= rewardLevel(reward);
  const plant = tierOf<PlantTier>(has, ['plant1', 'plant2', 'plant3', 'plant4', 'plant5']);
  const kinds = plant === 0 ? 1 : PLANTS[plant].length;
  const night = skyAt(now.getHours()) === 'night';
  const windowThings: WindowThings = {
    furin: has('furin') && inSeason('furin', now),
    petals: has('sakura') && inSeason('sakura', now),
    rainbow: has('rainbow'),
    catFace: has('catFace'),
  };
  return {
    level,
    plant,
    plantKind: kind !== undefined ? kind % kinds : plant === 0 ? 0 : kindOf(seed, plant, kinds),
    plantScale: plantScale(plant, level),
    bowl: tierOf<Exclude<BowlTier, 0>>(has, ['bowl1', 'bowl2', 'bowl3']) as BowlTier,
    // The left of the floor until a station takes it: 1 a table, 2 toys on it (ids stay crate, toys).
    toy: tierOf<1 | 2>(has, ['crate', 'toys']),
    rug: tierOf<Exclude<RugTier, 0>>(has, ['rug1', 'rug2', 'rug3', 'rug4']) as RugTier,
    floor: has('tatami') ? ('tatami' as const) : has('wood') ? ('wood' as const) : null,
    window: has('window'),
    hangingPlant: has('hangingPlant'),
    windowThings,
    clock: has('clock'),
    cuckoo: has('cuckoo'),
    musicBox: has('musicBox'),
    goldMusicBox: has('goldMusicBox'),
    // On the sill: 1 a radio, 2 a gramophone; 1 a pot, 2 in flower.
    radio: tierOf<1 | 2>(has, ['radio', 'gramophone']),
    sillPot: tierOf<1 | 2>(has, ['sillPot', 'sillFlower']),
    pinkSucculent: has('pinkSucculent'),
    // By the lamp: 1 a goldfish bowl on a side table, 2 a tall planted tank on the floor with a
    // second fish.
    fish: tierOf<1 | 2>(has, ['fishbowl', 'waterPlants']),
    table: has('kotatsu')
      ? inSeason('kotatsu', now)
        ? ('kotatsu' as const)
        : ('table' as const)
      : null,
    tea: has('tea'),
    mochi: has('mochi') && inSeason('mochi', now),
    bear: has('bear'),
    // On the shelf: 1 a few books, 2 a shelf full.
    books: tierOf<1 | 2>(has, ['books', 'bookshelf']),
    bunny: has('bunny'),
    lamp: has('lamp'),
    lampShade: has('lampShade'),
    fireflies: has('firefly'),
    fishStyle: (has('waterPlants') ? 'floor' : 'table') as FishStyle,
    guests: GUESTS.filter(
      (guest) =>
        has(guest) &&
        (guest !== 'dragonfly' || inSeason('dragonfly', now)) &&
        (guest !== 'owl' || night),
    ),
  };
}

export type Decor = ReturnType<typeof decorFor>;

// The next reward to look forward to, if any.
export function nextReward(level: number) {
  return REWARDS.find((entry) => entry.level > level) ?? null;
}

// Each plant grows a little with every level until the next one replaces it: smallest when it
// arrives, full size by the next reward (or the top level). The small tree (32) and the tree in
// fruit (45) are one tree: it keeps growing through both, and fruits without shrinking back.
const PLANT_SMALLEST = 2.2;
const PLANT_LARGEST = 3.2;
const PLANT_FROM: Record<PlantTier, number> = { 1: 6, 2: 13, 3: 19, 4: 32, 5: 32 };
const PLANT_FULL_AT: Record<PlantTier, number> = { 1: 12, 2: 18, 3: 31, 4: 60, 5: 60 };

function plantScale(tier: PlantTier | 0, level: number): number {
  if (tier === 0) return 0;
  const grown = (level - PLANT_FROM[tier]) / (PLANT_FULL_AT[tier] - PLANT_FROM[tier]);
  const progress = Math.min(1, Math.max(0, grown));
  return PLANT_SMALLEST + (PLANT_LARGEST - PLANT_SMALLEST) * progress;
}

// Floor the plant takes in the corner, so poops and the walk stay clear of it.
export function plantRoom(decor: Decor): number {
  if (decor.plant === 0) return 0;
  const frame = PLANTS[decor.plant][decor.plantKind];
  return Math.ceil(frame[0].length * decor.plantScale) + 8;
}

// The things on the floor are drawn at this size, like the bowl.
const FLOOR_SCALE = 3;
// Floor the standing lamp and the side table take beside the plant.
const LAMP_ROOM = LAMP[0].length * FLOOR_SCALE + 6;
// How wide the goldfish's home is drawn, and the floor it takes (none when its tank is in the wall).
const fishWidth = (decor: Decor) => fishHome(decor.fishStyle, 0, false)[0].length * FLOOR_SCALE;
const fishRoom = (decor: Decor) => (decor.fishStyle === 'wall' ? 0 : fishWidth(decor) + 6);

// Floor kept on the right, besides the plant's, for the lamp and the goldfish's side table: the bowl
// and the poops stand left of it.
export function sideRoom(decor: Decor): number {
  return (decor.lamp ? LAMP_ROOM : 0) + (decor.fish ? fishRoom(decor) : 0);
}

const TOY_LEFT = 14;
const TOY_WIDTH = TABLE[0].length * FLOOR_SCALE;
const CLOCK_LEFT = 16;
// The shelf, under the corner's buttons (CORNER_SIZE in stage/constants.ts, 4 from the top).
const SHELF_RIGHT = 12;
// The music box is drawn a little smaller than the shelf's other things: it is the tallest, and in
// the corner under the buttons it looked heavy.
const MUSIC_BOX_SIZE = 0.85;
// How high over the floor a tank built into the wall sits.
const WALL_TANK_ABOVE = 40;
const SILL_POT_SIZE = 1.35;
const SHELF_TOP = 48;
// How long a rainbow stays after the rain.
const RAINBOW_MS = 20_000;

// The things in the room the buddy answers when tapped (buddy-stage.tsx); the rest only move.
export type RoomProp =
  'plant' | 'clock' | 'window' | 'fish' | 'plush' | 'kotatsu' | 'table' | 'rug';

type WallProps = {
  decor: Decor;
  floor: number;
  // Below the name and level.
  top: number;
  width: number;
  height: number;
  // Where a job's station on the left of the floor ends (0: no station; the table is there).
  stationRight: number;
  // Floor kept at the right for the plant, or the season's corner.
  plantRoom: number;
  // A guest at the window now, and which visit (a new one each time).
  guest: Guest | null;
  run: number;
  tick: number;
  // The buddy is singing: the music box plays along. Dancing: the radio does.
  singing: boolean;
  dancing: boolean;
  // It just stopped raining (a new value each time): a rainbow shows for a while.
  rainEnded: number;
  // Rain, snow or a shooting star outside the window, and for how long.
  weather: WindowWeather | null;
  weatherMs: number;
  onToy: () => void;
  onMusic: () => void;
  // The buddy is reading a book from the shelf: its place there is empty.
  reading: boolean;
  // Bubbles from the goldfish as the buddy watches (a new run each time).
  fishRun: number;
  // A tap on a thing the buddy has something to say about.
  onProp: (prop: RoomProp) => void;
  // The room's time: the device's, or the art preview's.
  now: Date;
  // The lamp is on (the stage keeps it: the room's light follows it too), and a tap to switch it.
  lit: boolean;
  onLamp: (on: boolean) => void;
};

// The table and what is in front of it stand in the middle of the floor left free: between the
// station and the things on the right (on a narrow stage the station takes a good part of it).
function middleOf(decor: Decor, width: number, stationRight: number, plantSpace: number) {
  return (stationRight + width - 8 - plantSpace - sideRoom(decor)) / 2;
}

// Where the window goes (and the sizes around it): smaller on a short stage, so it stays above a
// grown-up's head; in the middle, but clear of the shelf and the clock.
export function windowPlace(decor: Decor, width: number, height: number) {
  const wall = height >= 250 ? 4 : height >= 220 ? 3 : 2;
  const clockScale = Math.min(3, wall);
  const windowWidth = WINDOW[0].length * wall;
  const shelfScale = wall >= 4 ? 2.5 : 2;
  const shelfWidth = SHELF[0].length * shelfScale;
  const shelfLeft = decor.musicBox ? width - SHELF_RIGHT - shelfWidth : width;
  const clockRight = CLOCK_LEFT + (decor.cuckoo ? CUCKOO_CELLS : 13) * clockScale;
  const windowLeft = Math.max(
    clockRight + 12,
    Math.min((width - windowWidth) / 2, shelfLeft - 10 - windowWidth),
  );
  return { wall, clockScale, windowWidth, windowLeft, shelfScale, shelfWidth };
}

// Where across the stage (from the left) the things the buddy goes over to use stand: the music
// box and the books on the shelf, the goldfish's side table on the floor (buddy-stage.tsx).
export function thingsAt(decor: Decor, width: number, height: number, plantSpace: number) {
  const { shelfScale, shelfWidth } = windowPlace(decor, width, height);
  const shelfLeft = width - SHELF_RIGHT - shelfWidth;
  // The shelf's row: the radio, the books and the music box spread out (shelfRow).
  const radioWidth = (decor.radio === 2 ? GRAMOPHONE : RADIO)[0][0].length * shelfScale;
  const booksWidth = booksFrame(decor.books || 1, false)[0].length * shelfScale;
  const musicWidth = MUSIC_BOX[0][0].length * shelfScale * MUSIC_BOX_SIZE;
  const gap = (shelfWidth - 4 * shelfScale - radioWidth - booksWidth - musicWidth) / 2;
  return {
    musicBox: width - SHELF_RIGHT - 2 * shelfScale - musicWidth / 2,
    books: shelfLeft + 2 * shelfScale + radioWidth + gap + booksWidth / 2,
    fish: width - 8 - plantSpace - (decor.lamp ? LAMP_ROOM : 0) - fishRoom(decor) / 2,
  };
}

// The window's glass on the stage (for the light it lets in, room-light.tsx); `top` as WallDecor's.
export function glassOf(decor: Decor, width: number, height: number, top: number) {
  if (!decor.window) return null;
  const { wall, windowLeft } = windowPlace(decor, width, height);
  return {
    left: windowLeft + WINDOW_GLASS.col * wall,
    top: top + 4 + WINDOW_GLASS.row * wall,
    width: WINDOW_GLASS.cols * wall,
    height: WINDOW_GLASS.rows * wall,
  };
}

// The middle of the standing lamp's shade, from the stage's top left.
export function lampShadeAt(width: number, height: number, floor: number, plantSpace: number) {
  return {
    x: width - 8 - plantSpace - (LAMP_ROOM - 6) / 2,
    y: height - (floor - 2) - LAMP.length * FLOOR_SCALE + 3 * FLOOR_SCALE,
  };
}

// Behind the buddy: the floor, the rug, the window and clock on the wall, the shelf (the music box
// and the radio), the things on the floor and the sill (the plush friends). The plant and the bowl are drawn by the
// stage, and so is the train, which passes in front.
export function WallDecor({
  decor,
  floor,
  top,
  width,
  height,
  stationRight,
  plantRoom: plantSpace,
  guest,
  run,
  tick,
  singing,
  dancing,
  rainEnded,
  weather,
  weatherMs,
  onToy,
  onMusic,
  reading,
  fishRun,
  onProp,
  now,
  lit,
  onLamp,
}: WallProps) {
  const { t } = useTranslation();
  // What came after the stage opened pops in; what was there already does not.
  const [openedAt] = useState(decor.level);
  const fresh = (reward: Reward) => rewardLevel(reward) > openedAt;
  const sky = skyAt(now.getHours());
  const { wall, clockScale, windowWidth, windowLeft, shelfScale, shelfWidth } = windowPlace(
    decor,
    width,
    height,
  );
  const radioWidth = (decor.radio === 2 ? GRAMOPHONE : RADIO)[0][0].length * shelfScale;
  const toyShown = stationRight === 0 && decor.toy > 0;
  // On the sill: the plush friends side by side at its left end, the little pot at the right end.
  const sillScale = wall >= 4 ? 2 : wall === 3 ? 1.5 : 1;
  const sillTop = top + 4 + (WINDOW_SILL_ROW + 1) * wall;
  const bearLeft = windowLeft + wall;
  const bunnyLeft = bearLeft + (BEAR[0].length - 1) * sillScale;
  // The little pot is drawn a size up from the plush friends, or it is hard to see.
  const potScale = sillScale * SILL_POT_SIZE;
  const potWidth = SILL_POT[0][0].length * potScale;
  const potLeft = windowLeft + windowWidth - wall - potWidth;
  // The pink succulent stands beside it, toward the middle (both ends hold two, the glass between
  // stays clear for the guests).
  const pinkLeft = potLeft - PINK_SUCCULENT[0].length * potScale;
  const rug = RUGS[decor.rug];
  const rugWidth = rug[0].length * 3;
  const tableWidth = TABLE_CELLS * FLOOR_SCALE;
  const tableLeft = middleOf(decor, width, stationRight, plantSpace) - tableWidth / 2;
  const guestHere = guest && !isFloorPasser(guest) ? guest : null;
  // The cuckoo comes out when the clock is tapped.
  const [cuckooRun, setCuckooRun] = useState(0);
  // A rainbow after the rain, by day.
  const [rainbowAfter, setRainbowAfter] = useState(rainEnded);
  useEffect(() => {
    if (rainEnded === rainbowAfter) return;
    const timer = setTimeout(() => setRainbowAfter(rainEnded), RAINBOW_MS);
    return () => clearTimeout(timer);
  }, [rainEnded, rainbowAfter]);
  const things = {
    ...decor.windowThings,
    rainbow: decor.windowThings.rainbow && rainEnded !== rainbowAfter && sky !== 'night',
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {decor.floor && width > 0 ? (
        <View key={decor.floor} style={[styles.floor, { height: floor }]}>
          <Arrive fresh={fresh(decor.floor)} width={width}>
            <FloorPattern kind={decor.floor} width={width} height={floor} />
          </Arrive>
        </View>
      ) : null}

      {decor.window ? (
        <View style={[styles.at, { left: windowLeft, top: top + 4 }]}>
          <Arrive fresh={fresh('window')} width={windowWidth}>
            <Tappable shine label={t('buddy.room.window')} onTap={() => onProp('window')}>
              <RoomWindow
                scale={wall}
                now={now}
                guest={guestHere}
                weather={weather}
                weatherMs={weatherMs}
                run={run}
                tick={tick}
                things={things}
              />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {/* Hung at the window's top right, swinging from its strings when tapped. */}
      {decor.window && decor.hangingPlant ? (
        <View
          style={[
            styles.at,
            {
              left: windowLeft + HANGING_PLANT_AT.col * wall,
              top: top + 4 - HANGING_PLANT_AT.above * wall,
            },
          ]}
        >
          <Arrive
            fresh={fresh('hangingPlant')}
            width={HANGING_PLANT[0].length * wall * HANGING_PLANT_FINE}
          >
            <Tappable
              kind="swing"
              label={t('buddy.room.hangingPlant')}
              onTap={() => onProp('plant')}
            >
              <PixelSprite
                frame={HANGING_PLANT}
                palette={THINGS_PALETTE}
                scale={wall * HANGING_PLANT_FINE}
              />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.bear ? (
        <View style={[styles.at, { left: bearLeft, top: sillTop - BEAR.length * sillScale }]}>
          <Arrive fresh={fresh('bear')} width={BEAR[0].length * sillScale}>
            <Tappable kind="squish" label={t('buddy.room.bear')} onTap={() => onProp('plush')}>
              <PixelSprite frame={BEAR} palette={THINGS_PALETTE} scale={sillScale} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.sillPot ? (
        <View
          key={`pot${decor.sillPot}`}
          style={[styles.at, { left: potLeft, top: sillTop - SILL_POT[0].length * potScale }]}
        >
          <Arrive fresh={fresh(decor.sillPot === 2 ? 'sillFlower' : 'sillPot')} width={potWidth}>
            <Tappable
              kind="sway"
              shine
              label={t('buddy.room.sillPot')}
              onTap={() => onProp('plant')}
            >
              <SillPot flowers={decor.sillPot === 2} scale={potScale} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.pinkSucculent ? (
        <View
          style={[styles.at, { left: pinkLeft, top: sillTop - PINK_SUCCULENT.length * potScale }]}
        >
          <Arrive fresh={fresh('pinkSucculent')} width={potWidth}>
            <Tappable
              kind="sway"
              shine
              label={t('buddy.room.pinkSucculent')}
              onTap={() => onProp('plant')}
            >
              <PixelSprite frame={PINK_SUCCULENT} palette={THINGS_PALETTE} scale={potScale} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.bunny ? (
        <View style={[styles.at, { left: bunnyLeft, top: sillTop - BUNNY.length * sillScale }]}>
          <Arrive fresh={fresh('bunny')} width={BUNNY[0].length * sillScale}>
            <Tappable kind="squish" label={t('buddy.room.bunny')} onTap={() => onProp('plush')}>
              <PixelSprite frame={BUNNY} palette={THINGS_PALETTE} scale={sillScale} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.clock ? (
        <View
          key={decor.cuckoo ? 'cuckoo' : 'clock'}
          style={[styles.at, { left: CLOCK_LEFT, top: top + 8 }]}
        >
          <Arrive
            fresh={fresh(decor.cuckoo ? 'cuckoo' : 'clock')}
            width={(decor.cuckoo ? CUCKOO_CELLS : 13) * clockScale}
          >
            <Tappable
              kind="rattle"
              label={t('buddy.room.clock')}
              onTap={() => {
                setCuckooRun((n) => n + 1);
                onProp('clock');
              }}
            >
              {decor.cuckoo ? (
                <CuckooClock scale={clockScale} now={now} tick={tick} run={cuckooRun} />
              ) : (
                <WallClock scale={clockScale} now={now} />
              )}
            </Tappable>
          </Arrive>
        </View>
      ) : null}

      {/* The shelf in the top right, under the corner's buttons, comes with the music box: the radio
          at its left end, the books in the middle (a shelf full from Lv.52), and the music box, the tallest, at the right
          against the corner, where it looks steadier. Up there the buddy never hides them. */}
      {decor.musicBox ? (
        <View style={[styles.at, styles.box, { right: SHELF_RIGHT, top: SHELF_TOP }]}>
          <Arrive fresh={fresh('musicBox')} width={shelfWidth}>
            <View style={[styles.shelfRow, { paddingHorizontal: 2 * shelfScale }]}>
              {decor.radio ? (
                <Arrive
                  key={`radio${decor.radio}`}
                  fresh={fresh(decor.radio === 2 ? 'gramophone' : 'radio')}
                  width={radioWidth}
                >
                  <Radio
                    gramophone={decor.radio === 2}
                    scale={shelfScale}
                    playing={dancing}
                    tick={tick}
                    onPlay={onToy}
                  />
                </Arrive>
              ) : (
                <View style={{ width: radioWidth }} />
              )}
              {decor.books ? (
                <Arrive
                  key={`books${decor.books}`}
                  fresh={fresh(decor.books === 2 ? 'bookshelf' : 'books')}
                  width={booksFrame(decor.books, false)[0].length * shelfScale}
                >
                  <Tappable kind="rattle" label={t('buddy.room.books')}>
                    <PixelSprite
                      frame={booksFrame(decor.books, reading)}
                      palette={THINGS_PALETTE}
                      scale={shelfScale}
                    />
                  </Tappable>
                </Arrive>
              ) : (
                <View style={{ width: booksFrame(1, false)[0].length * shelfScale }} />
              )}
              <Arrive
                key={decor.goldMusicBox ? 'gold' : 'wood'}
                fresh={decor.goldMusicBox && fresh('goldMusicBox')}
                width={MUSIC_BOX[0][0].length * shelfScale * MUSIC_BOX_SIZE}
              >
                <MusicBox
                  scale={shelfScale * MUSIC_BOX_SIZE}
                  playing={singing}
                  tick={tick}
                  gold={decor.goldMusicBox}
                  onPlay={onMusic}
                />
              </Arrive>
            </View>
            <View style={{ marginTop: -shelfScale }}>
              <PixelSprite frame={SHELF} palette={THINGS_PALETTE} scale={shelfScale} />
            </View>
          </Arrive>
        </View>
      ) : null}

      {/* The rug is there from the egg on: it warms the room and keeps the empty stage balanced. */}
      <View
        key={`rug${decor.rug}`}
        style={[
          styles.at,
          { left: (width - rugWidth) / 2, bottom: floor - (rug.length > 4 ? 8 : 5) },
        ]}
      >
        <Arrive fresh={decor.rug > 0 && fresh(`rug${decor.rug}` as Reward)} width={rugWidth}>
          <Tappable kind="squish" label={t('buddy.room.rug')} onTap={() => onProp('rug')}>
            <PixelSprite frame={rug} palette={ROOM_PALETTE} scale={3} />
          </Tappable>
        </Arrive>
      </View>
      {/* The middle of the rug: the low table. */}
      {decor.table ? (
        <View key={decor.table} style={[styles.at, { left: tableLeft, bottom: floor - 2 }]}>
          <Arrive fresh={fresh('kotatsu')} width={tableWidth}>
            <Tappable
              kind="squish"
              label={t(decor.table === 'kotatsu' ? 'buddy.room.kotatsu' : 'buddy.room.table')}
              onTap={() => onProp(decor.table === 'kotatsu' ? 'kotatsu' : 'table')}
            >
              <LowTable
                kotatsu={decor.table === 'kotatsu'}
                tea={decor.tea}
                mochi={decor.mochi}
                scale={FLOOR_SCALE}
                tick={tick}
              />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {toyShown ? (
        <View
          key={`toy${decor.toy}`}
          style={[styles.at, styles.box, { left: TOY_LEFT, bottom: floor - 2 }]}
        >
          <Arrive fresh={fresh(decor.toy === 2 ? 'toys' : 'crate')} width={TOY_WIDTH}>
            <FloorToy toys={decor.toy === 2} scale={FLOOR_SCALE} onPlay={onToy} />
          </Arrive>
        </View>
      ) : null}
      {decor.lamp ? (
        <View
          key={decor.lampShade ? 'shade' : 'lamp'}
          style={[styles.at, { right: 8 + plantSpace, bottom: floor - 2 }]}
        >
          <Arrive fresh={fresh(decor.lampShade ? 'lampShade' : 'lamp')} width={LAMP_ROOM}>
            <Tappable label={t('buddy.room.lamp')} onTap={() => onLamp(!lit)}>
              <StandingLamp scale={FLOOR_SCALE} lit={lit} shade={decor.lampShade} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.fish ? (
        <View
          key={`fish${decor.fish}`}
          style={[
            styles.at,
            styles.box,
            {
              right: 8 + plantSpace + (decor.lamp ? LAMP_ROOM : 0),
              // In the wall: at about a counter's height over the floor.
              bottom: decor.fishStyle === 'wall' ? floor + WALL_TANK_ABOVE : floor - 2,
            },
          ]}
        >
          <Arrive
            fresh={fresh(decor.fish === 2 ? 'waterPlants' : 'fishbowl')}
            width={fishWidth(decor)}
          >
            <FishBowl
              plants={decor.fish === 2}
              style={decor.fishStyle}
              scale={FLOOR_SCALE}
              tick={tick}
              bubbleRun={fishRun}
              onTap={() => onProp('fish')}
            />
          </Arrive>
        </View>
      ) : null}

      {decor.fireflies && sky === 'night' && width > 0 ? (
        <Fireflies width={width} height={height - floor} />
      ) : null}
    </View>
  );
}

// The plant in the corner. The tree in fruit (Lv.45) has big oranges on its crown and one fallen on
// the pot; `sprout`: it has just fruited, so they pop out one by one.
export function Plant({
  tier,
  kind,
  scale,
  sprout = false,
}: {
  tier: PlantTier;
  kind: number;
  scale: number;
  sprout?: boolean;
}) {
  if (tier !== 5)
    return <PixelSprite frame={PLANTS[tier][kind]} palette={PROP_PALETTE} scale={scale} />;
  return (
    <View>
      <PixelSprite frame={FRUIT_TREE} palette={PROP_PALETTE} scale={scale} />
      {FRUIT_AT.map(([row, col], i) => (
        <Fruit
          key={i}
          frame={ORANGE}
          place={{ left: col * scale, top: row * scale }}
          scale={scale}
          delay={sprout ? FRUIT_FIRST_MS + i * FRUIT_EVERY_MS : null}
        />
      ))}
      <Fruit
        frame={ORANGE_FALLEN}
        place={{ left: FALLEN_AT[1] * scale, top: FALLEN_AT[0] * scale }}
        scale={scale}
        delay={sprout ? FRUIT_FIRST_MS + FRUIT_AT.length * FRUIT_EVERY_MS + 400 : null}
      />
    </View>
  );
}

const NATIVE_DRIVER = Platform.OS !== 'web';
// As the tree fruits: the first orange after this long, then one every so often.
const FRUIT_FIRST_MS = 500;
const FRUIT_EVERY_MS = 320;

// An orange, there already (`delay` null) or popping out from nothing after `delay` ms.
function Fruit({
  frame,
  place,
  scale,
  delay,
}: {
  frame: Frame;
  place: { left: number; top?: number; bottom?: number };
  scale: number;
  delay: number | null;
}) {
  const [grow] = useState(() => new Animated.Value(delay === null ? 1 : 0));
  useEffect(() => {
    if (delay === null) return;
    const pop = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(grow, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);
    pop.start();
    return () => pop.stop();
  }, [grow, delay]);
  return (
    <Animated.View style={[styles.at, place, { transform: [{ scale: grow }] }]}>
      <PixelSprite frame={frame} palette={PROP_PALETTE} scale={scale} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  passThrough: {
    pointerEvents: 'box-none',
  },
  at: {
    position: 'absolute',
  },
  // The things on the floor can be tapped; the rest of the room lets taps through.
  box: {
    pointerEvents: 'box-none',
  },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});
