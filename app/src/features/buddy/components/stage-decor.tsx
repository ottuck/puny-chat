import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { AlbumEntry } from '@/features/room/api';

import { PixelSprite } from '../pixel/pixel-sprite';
import {
  CRATE,
  CUSHION,
  LAMP,
  MUSIC_BOX,
  type RugTier,
  RUGS,
  ROOM_PALETTE,
  skyAt,
  WINDOW,
  WINDOW_SILL_ROW,
} from '../pixel/room';
import { BEAR, fishBowl, GRAMOPHONE, RADIO, SILL_POT } from '../pixel/room-things';
import {
  BUDDY_PALETTE,
  type BowlTier,
  buddyFrame,
  HEART,
  PLANTS,
  type PlantTier,
  PROP_PALETTE,
} from '../pixel/sprites';
import {
  Arrive,
  Bear,
  Bunny,
  CUCKOO_CELLS,
  CuckooClock,
  Cushion,
  Fireflies,
  FishBowl,
  FloorPattern,
  FloorToy,
  type Guest,
  GUESTS,
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

// The stage's decorations (docs/spec.md 무대 꾸미기, docs/fun-improvements.md 방 소품). Every level
// the room gets something: a spot not used yet fills (the left of the floor, the wall, the window,
// its sill, the side table, the middle of the rug), or a thing already there gets finer (the pot,
// the bowl, the rug, the floor, the clock, the radio). Nothing pushes anything out, one thing to a
// spot. A few are only out in their season. They belong to the buddy: when it goes its own way it
// takes them along, the new egg's room starts bare, and only its portrait stays on the wall.

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
  | 'sparrow'
  | 'tatami'
  | 'lamp'
  | 'catTail'
  | 'plant5'
  | 'bowl3'
  | 'curtains'
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
  | 'rainbow'
  | 'squirrel'
  | 'gramophone'
  | 'waterPlants'
  | 'catFace'
  | 'bunny'
  | 'sillFlower'
  | 'cushion';

// Shown in the guide and the buddy sheet ("next: Lv.9 window") as well. One for every level that
// brings nothing of its own: a new stage (3, 5, 10), the job (12) and the job's changes (20, 30, 40,
// 50) bring no thing for the room; the top one, 60, ends with the gold cushion.
export const REWARDS: readonly { level: number; reward: Reward }[] = [
  { level: 2, reward: 'plant1' },
  { level: 4, reward: 'crate' },
  { level: 6, reward: 'bowl1' },
  { level: 7, reward: 'rug1' },
  { level: 8, reward: 'toys' },
  { level: 9, reward: 'window' },
  { level: 11, reward: 'clock' },
  { level: 13, reward: 'plant2' },
  { level: 14, reward: 'snail' },
  { level: 15, reward: 'musicBox' },
  { level: 16, reward: 'rug2' },
  { level: 17, reward: 'wood' },
  { level: 18, reward: 'sparrow' },
  { level: 19, reward: 'plant3' },
  { level: 21, reward: 'curtains' },
  { level: 22, reward: 'firefly' },
  { level: 23, reward: 'ladybug' },
  { level: 24, reward: 'train' },
  { level: 25, reward: 'radio' },
  { level: 26, reward: 'sillPot' },
  { level: 27, reward: 'bowl2' },
  { level: 28, reward: 'fishbowl' },
  { level: 29, reward: 'rug3' },
  { level: 31, reward: 'furin' },
  { level: 32, reward: 'plant4' },
  { level: 33, reward: 'dragonfly' },
  { level: 34, reward: 'bear' },
  { level: 35, reward: 'catTail' },
  { level: 36, reward: 'cuckoo' },
  { level: 37, reward: 'tatami' },
  { level: 38, reward: 'kotatsu' },
  { level: 39, reward: 'swallow' },
  { level: 41, reward: 'sakura' },
  { level: 42, reward: 'lamp' },
  { level: 43, reward: 'goldMusicBox' },
  { level: 44, reward: 'tea' },
  { level: 45, reward: 'plant5' },
  { level: 46, reward: 'owl' },
  { level: 47, reward: 'lampShade' },
  { level: 48, reward: 'bowl3' },
  { level: 49, reward: 'mochi' },
  { level: 51, reward: 'rug4' },
  { level: 52, reward: 'books' },
  { level: 53, reward: 'rainbow' },
  { level: 54, reward: 'squirrel' },
  { level: 55, reward: 'gramophone' },
  { level: 56, reward: 'waterPlants' },
  { level: 57, reward: 'catFace' },
  { level: 58, reward: 'bunny' },
  { level: 59, reward: 'sillFlower' },
  { level: 60, reward: 'cushion' },
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

const FRAMES_SHOWN = 3;

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
export function decorFor(
  level: number,
  album: AlbumEntry[],
  seed = '',
  kind?: number,
  now = new Date(),
) {
  const has = (reward: Reward) => level >= rewardLevel(reward);
  const plant = tierOf<PlantTier>(has, ['plant1', 'plant2', 'plant3', 'plant4', 'plant5']);
  const kinds = plant === 0 ? 1 : PLANTS[plant].length;
  const night = skyAt(now.getHours()) === 'night';
  const windowThings: WindowThings = {
    curtains: has('curtains'),
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
    // The left of the floor until a station takes it: 1 a crate, 2 full of toys.
    toy: tierOf<1 | 2>(has, ['crate', 'toys']),
    rug: tierOf<Exclude<RugTier, 0>>(has, ['rug1', 'rug2', 'rug3', 'rug4']) as RugTier,
    floor: has('tatami') ? ('tatami' as const) : has('wood') ? ('wood' as const) : null,
    window: has('window'),
    windowThings,
    clock: has('clock'),
    cuckoo: has('cuckoo'),
    musicBox: has('musicBox'),
    goldMusicBox: has('goldMusicBox'),
    // On the sill: 1 a radio, 2 a gramophone; 1 a pot, 2 in flower.
    radio: tierOf<1 | 2>(has, ['radio', 'gramophone']),
    sillPot: tierOf<1 | 2>(has, ['sillPot', 'sillFlower']),
    // The side table by the lamp: 1 a goldfish, 2 with plants and a second fish.
    fish: tierOf<1 | 2>(has, ['fishbowl', 'waterPlants']),
    table: has('kotatsu')
      ? inSeason('kotatsu', now)
        ? ('kotatsu' as const)
        : ('table' as const)
      : null,
    tea: has('tea'),
    mochi: has('mochi') && inSeason('mochi', now),
    bear: has('bear'),
    books: has('books'),
    bunny: has('bunny'),
    lamp: has('lamp'),
    lampShade: has('lampShade'),
    cushion: has('cushion'),
    fireflies: has('firefly'),
    guests: GUESTS.filter(
      (guest) =>
        has(guest) &&
        (guest !== 'dragonfly' || inSeason('dragonfly', now)) &&
        (guest !== 'owl' || night),
    ),
    // The latest ones, newest on the right.
    portraits: album.slice(-FRAMES_SHOWN),
  };
}

export type Decor = ReturnType<typeof decorFor>;

// The next reward to look forward to, if any.
export function nextReward(level: number) {
  return REWARDS.find((entry) => entry.level > level) ?? null;
}

// Each plant grows a little with every level until the next one replaces it: smallest when it
// arrives, full size by the next reward (or the top level).
const PLANT_SMALLEST = 2.2;
const PLANT_LARGEST = 3.2;
const PLANT_FROM: Record<PlantTier, number> = { 1: 2, 2: 13, 3: 19, 4: 32, 5: 45 };
const PLANT_FULL_AT: Record<PlantTier, number> = { 1: 12, 2: 18, 3: 31, 4: 44, 5: 60 };

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
const FISH_ROOM = fishBowl(0, false)[0].length * FLOOR_SCALE + 6;

// Floor kept on the right, besides the plant's, for the lamp and the goldfish's side table: the bowl
// and the poops stand left of it.
export function sideRoom(decor: Decor): number {
  return (decor.lamp ? LAMP_ROOM : 0) + (decor.fish ? FISH_ROOM : 0);
}

const TOY_LEFT = 14;
const TOY_WIDTH = CRATE[0].length * FLOOR_SCALE;
// A portrait's frame: the picture at 1.5 with its padding and border.
const PORTRAIT_WIDTH = buddyFrame('ADULT', 'happy')[0].length * 1.5 + 12;
const PORTRAIT_GAP = 52;
const CLOCK_LEFT = 16;
// In front of the low table, nearer the front of the floor: the gold cushion, and the plush
// friends either side of it (where it will be, before it comes).
const FRONT_ROW = 6;
const CUSHION_SCALE = 2;
const CUSHION_WIDTH = CUSHION[0].length * CUSHION_SCALE;
const PLUSH_SCALE = 2;
const PLUSH_GAP = 3;
const PLUSH_WIDTH = BEAR[0].length * PLUSH_SCALE;
// How long a rainbow stays after the rain.
const RAINBOW_MS = 20_000;

// The things in the room the buddy answers when tapped (buddy-stage.tsx); the rest only move.
export type RoomProp =
  'plant' | 'clock' | 'window' | 'portrait' | 'fish' | 'plush' | 'kotatsu' | 'table';

type WallProps = {
  decor: Decor;
  floor: number;
  // Below the name and level.
  top: number;
  width: number;
  height: number;
  // Where a job's station on the left of the floor ends (0: no station; the crate is there).
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
  onToy: () => void;
  onMusic: () => void;
  // A tap on a thing the buddy has something to say about.
  onProp: (prop: RoomProp) => void;
  // The room's time: the device's, or the art preview's.
  now: Date;
};

// The table and what is in front of it stand in the middle of the floor left free: between the
// station and the things on the right (on a narrow stage the station takes a good part of it).
function middleOf(decor: Decor, width: number, stationRight: number, plantSpace: number) {
  return (stationRight + width - 8 - plantSpace - sideRoom(decor)) / 2;
}

// Behind the buddy: the floor, the rug, the window and clock on the wall, portraits of buddies gone
// their own way, the things on the floor and the sill. The plant and the bowl are drawn by the
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
  onToy,
  onMusic,
  onProp,
  now,
}: WallProps) {
  const { t } = useTranslation();
  // What came after the stage opened pops in; what was there already does not.
  const [openedAt] = useState(decor.level);
  const fresh = (reward: Reward) => rewardLevel(reward) > openedAt;
  const sky = skyAt(now.getHours());
  // Smaller on a short stage, so the window stays above a grown-up's head.
  const wall = height >= 250 ? 4 : height >= 220 ? 3 : 2;
  const clockScale = Math.min(3, wall);
  const windowWidth = WINDOW[0].length * wall;
  const portraitsLeft =
    decor.portraits.length === 0
      ? width
      : width - 14 - (decor.portraits.length - 1) * PORTRAIT_GAP - PORTRAIT_WIDTH;
  const clockRight = CLOCK_LEFT + (decor.cuckoo ? CUCKOO_CELLS : 13) * clockScale;
  // In the middle, but clear of the portraits and the clock.
  const windowLeft = Math.max(
    clockRight + 12,
    Math.min((width - windowWidth) / 2, portraitsLeft - 10 - windowWidth),
  );
  const toyShown = stationRight === 0 && decor.toy > 0;
  // On the sill: the music box at its left end (up there the buddy never hides it), the radio at the
  // right, the little pot between them.
  const sillScale = wall >= 4 ? 2 : wall === 3 ? 1.5 : 1;
  const sillTop = top + 4 + (WINDOW_SILL_ROW + 1) * wall;
  const musicLeft = windowLeft + wall;
  const musicRight = musicLeft + (decor.musicBox ? MUSIC_BOX[0][0].length * sillScale : 0);
  const radioFrame = decor.radio === 2 ? GRAMOPHONE[0] : RADIO[0];
  const radioWidth = radioFrame[0].length * sillScale;
  const radioLeft = windowLeft + windowWidth - wall - radioWidth;
  const potWidth = SILL_POT[0][0].length * sillScale;
  const potLeft =
    (musicRight + (decor.radio ? radioLeft : windowLeft + windowWidth)) / 2 - potWidth / 2;
  const rug = RUGS[decor.rug];
  const rugWidth = rug[0].length * 3;
  const tableWidth = TABLE_CELLS * FLOOR_SCALE;
  const tableLeft = middleOf(decor, width, stationRight, plantSpace) - tableWidth / 2;
  const guestHere = guest && guest !== 'train' ? guest : null;
  // A tap on the lamp switches it on or off, until the stage opens again.
  const [lampOn, setLampOn] = useState<boolean | null>(null);
  const lit = lampOn ?? sky !== 'day';
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
                run={run}
                tick={tick}
                things={things}
              />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.musicBox ? (
        <View
          style={[
            styles.at,
            styles.box,
            { left: musicLeft, top: sillTop - MUSIC_BOX[0].length * sillScale },
          ]}
        >
          <Arrive
            fresh={fresh(decor.goldMusicBox ? 'goldMusicBox' : 'musicBox')}
            width={MUSIC_BOX[0][0].length * sillScale}
            key={decor.goldMusicBox ? 'gold' : 'wood'}
          >
            <MusicBox
              scale={sillScale}
              playing={singing}
              tick={tick}
              gold={decor.goldMusicBox}
              onPlay={onMusic}
            />
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.sillPot ? (
        <View
          key={`pot${decor.sillPot}`}
          style={[styles.at, { left: potLeft, top: sillTop - SILL_POT[0].length * sillScale }]}
        >
          <Arrive fresh={fresh(decor.sillPot === 2 ? 'sillFlower' : 'sillPot')} width={potWidth}>
            <Tappable
              kind="sway"
              shine
              label={t('buddy.room.sillPot')}
              onTap={() => onProp('plant')}
            >
              <SillPot flowers={decor.sillPot === 2} scale={sillScale} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.radio ? (
        <View
          key={`radio${decor.radio}`}
          style={[
            styles.at,
            styles.box,
            { left: radioLeft, top: sillTop - radioFrame.length * sillScale },
          ]}
        >
          <Arrive fresh={fresh(decor.radio === 2 ? 'gramophone' : 'radio')} width={radioWidth}>
            <Radio
              gramophone={decor.radio === 2}
              scale={sillScale}
              playing={dancing}
              tick={tick}
              onPlay={onToy}
            />
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

      {/* Snapshots of buddies gone their own way: smiling, in a pastel frame pinned at a tilt, with
          a heart, like a photo on a fridge rather than a formal portrait. */}
      {decor.portraits.map((entry, i) => (
        <View
          key={entry.graduatedAt}
          style={[
            styles.at,
            {
              top: top + 8,
              right: 14 + (decor.portraits.length - 1 - i) * PORTRAIT_GAP,
              transform: [{ rotate: i % 2 === 0 ? '-6deg' : '5deg' }],
            },
          ]}
        >
          <Tappable
            kind="swing"
            label={t('buddy.room.portrait', { name: entry.name })}
            onTap={() => onProp('portrait')}
          >
            <View style={styles.frame}>
              <PixelSprite
                frame={buddyFrame('ADULT', 'happy')}
                palette={BUDDY_PALETTE}
                scale={1.5}
              />
            </View>
            <View style={styles.heart}>
              <PixelSprite frame={HEART} palette={PROP_PALETTE} scale={1.5} />
            </View>
          </Tappable>
        </View>
      ))}

      {/* The rug is there from the egg on: it warms the room and keeps the empty stage balanced. */}
      <View
        key={`rug${decor.rug}`}
        style={[
          styles.at,
          { left: (width - rugWidth) / 2, bottom: floor - (rug.length > 4 ? 8 : 5) },
        ]}
      >
        <Arrive fresh={decor.rug > 0 && fresh(`rug${decor.rug}` as Reward)} width={rugWidth}>
          <Tappable kind="squish" label={t('buddy.room.rug')}>
            <PixelSprite frame={rug} palette={ROOM_PALETTE} scale={3} />
          </Tappable>
        </Arrive>
      </View>
      {/* The middle of the rug: the low table at the back (in front of it, FrontDecor). */}
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
            <Tappable label={t('buddy.room.lamp')} onTap={() => setLampOn(!lit)}>
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
            { right: 8 + plantSpace + (decor.lamp ? LAMP_ROOM : 0), bottom: floor - 2 },
          ]}
        >
          <Arrive fresh={fresh(decor.fish === 2 ? 'waterPlants' : 'fishbowl')} width={FISH_ROOM}>
            <FishBowl
              plants={decor.fish === 2}
              scale={FLOOR_SCALE}
              tick={tick}
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

// Nearer the front of the floor than the buddy and the station, so drawn over them (buddy-stage.tsx
// puts it after the station): the gold cushion in front of the low table, the plush friends sitting
// either side of it, small, so they fit on a narrow stage too.
export function FrontDecor({
  decor,
  width,
  stationRight,
  plantRoom: plantSpace,
  onProp,
}: Pick<WallProps, 'decor' | 'width' | 'stationRight' | 'plantRoom' | 'onProp'>) {
  const { t } = useTranslation();
  const [openedAt] = useState(decor.level);
  const fresh = (reward: Reward) => rewardLevel(reward) > openedAt;
  const cushionLeft = middleOf(decor, width, stationRight, plantSpace) - CUSHION_WIDTH / 2;
  if (!decor.cushion && !decor.bear && !decor.bunny) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {decor.cushion ? (
        <View style={[styles.at, { left: cushionLeft, bottom: FRONT_ROW }]}>
          <Arrive fresh={fresh('cushion')} width={CUSHION_WIDTH}>
            <Tappable kind="squish" label={t('buddy.room.cushion')}>
              <Cushion scale={CUSHION_SCALE} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.bear ? (
        <View
          key={decor.books ? 'books' : 'bear'}
          style={[styles.at, { left: cushionLeft - PLUSH_GAP - PLUSH_WIDTH, bottom: FRONT_ROW }]}
        >
          <Arrive fresh={fresh(decor.books ? 'books' : 'bear')} width={PLUSH_WIDTH}>
            <Tappable kind="squish" label={t('buddy.room.bear')} onTap={() => onProp('plush')}>
              <Bear books={decor.books} scale={PLUSH_SCALE} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.bunny ? (
        <View
          style={[styles.at, { left: cushionLeft + CUSHION_WIDTH + PLUSH_GAP, bottom: FRONT_ROW }]}
        >
          <Arrive fresh={fresh('bunny')} width={PLUSH_WIDTH}>
            <Tappable kind="squish" label={t('buddy.room.bunny')} onTap={() => onProp('plush')}>
              <Bunny scale={PLUSH_SCALE} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
    </View>
  );
}

export function Plant({ tier, kind, scale }: { tier: PlantTier; kind: number; scale: number }) {
  return <PixelSprite frame={PLANTS[tier][kind]} palette={PROP_PALETTE} scale={scale} />;
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
  frame: {
    padding: 3,
    borderWidth: 3,
    borderRadius: 8,
    borderColor: '#FF9EB5',
    backgroundColor: '#FFF4F7',
  },
  heart: {
    position: 'absolute',
    top: -7,
    right: -7,
  },
});
