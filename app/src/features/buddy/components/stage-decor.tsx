import { useState } from 'react';
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
  Cushion,
  Fireflies,
  FloorPattern,
  FloorToy,
  type Guest,
  MusicBox,
  RoomWindow,
  StandingLamp,
  Tappable,
  useNow,
  WallClock,
} from './room-props';

// The stage's decorations (docs/spec.md 무대 꾸미기, docs/fun-improvements.md 방 소품). Every level or
// two the room gets something: a spot not used yet fills (the left of the floor, the wall, the
// window), or a thing already there gets finer (the pot, the bowl, the rug, the floor). Nothing
// pushes anything out, one thing to a spot. They belong to the buddy: when it goes its own way it
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
  | 'cushion';

// Shown in the guide and the buddy sheet ("next: Lv.9 window") as well. Thick in the first twenty
// levels, when it is easiest to lose interest, and every two or three levels after. The levels that
// bring something of their own (a new stage at 3, 5, 10, the job at 12, a job change at 20, 30 and 40)
// bring no thing for the room; the top one, 50, ends with the gold cushion.
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
  { level: 22, reward: 'firefly' },
  { level: 24, reward: 'train' },
  { level: 27, reward: 'bowl2' },
  { level: 29, reward: 'rug3' },
  { level: 32, reward: 'plant4' },
  { level: 35, reward: 'catTail' },
  { level: 37, reward: 'tatami' },
  { level: 42, reward: 'lamp' },
  { level: 45, reward: 'plant5' },
  { level: 48, reward: 'bowl3' },
  { level: 50, reward: 'cushion' },
];

export function rewardLevel(reward: Reward): number {
  return REWARDS.find((entry) => entry.reward === reward)?.level ?? 0;
}

// The reward a level brings, if any (the chat's level-up line names it).
export function rewardAt(level: number): Reward | null {
  return REWARDS.find((entry) => entry.level === level)?.reward ?? null;
}

const FRAMES_SHOWN = 3;
const GUESTS: readonly Guest[] = ['snail', 'sparrow', 'catTail', 'train'];

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

// `seed`: the buddy's name. `kind`: a kind to show regardless (the art preview).
export function decorFor(level: number, album: AlbumEntry[], seed = '', kind?: number) {
  const has = (reward: Reward) => level >= rewardLevel(reward);
  const plant = tierOf<PlantTier>(has, ['plant1', 'plant2', 'plant3', 'plant4', 'plant5']);
  const kinds = plant === 0 ? 1 : PLANTS[plant].length;
  return {
    level,
    plant,
    plantKind: kind !== undefined ? kind % kinds : plant === 0 ? 0 : kindOf(seed, plant, kinds),
    plantScale: plantScale(plant, level),
    bowl: tierOf<Exclude<BowlTier, 0>>(has, ['bowl1', 'bowl2', 'bowl3']) as BowlTier,
    // The left of the floor until a station takes it: 1 a crate, 2 full of toys.
    toy: tierOf<1 | 2>(has, ['crate', 'toys']),
    rug: tierOf<Exclude<RugTier, 0>>(has, ['rug1', 'rug2', 'rug3']) as RugTier,
    floor: has('tatami') ? ('tatami' as const) : has('wood') ? ('wood' as const) : null,
    window: has('window'),
    clock: has('clock'),
    musicBox: has('musicBox'),
    lamp: has('lamp'),
    cushion: has('cushion'),
    fireflies: has('firefly'),
    guests: GUESTS.filter(has),
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
const PLANT_FULL_AT: Record<PlantTier, number> = { 1: 12, 2: 18, 3: 31, 4: 44, 5: 50 };

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
// Floor the standing lamp takes beside the plant.
export const LAMP_ROOM = LAMP[0].length * FLOOR_SCALE + 6;
const TOY_LEFT = 14;
const TOY_WIDTH = CRATE[0].length * FLOOR_SCALE;
// A portrait's frame: the picture at 1.5 with its padding and border.
const PORTRAIT_WIDTH = buddyFrame('ADULT', 'happy')[0].length * 1.5 + 12;
const PORTRAIT_GAP = 52;
const CLOCK_LEFT = 16;

// The things in the room the buddy answers when tapped (buddy-stage.tsx); the rest only move.
export type RoomProp = 'plant' | 'clock' | 'window' | 'portrait';

type WallProps = {
  decor: Decor;
  floor: number;
  // Below the name and level.
  top: number;
  width: number;
  height: number;
  // A job's station stands on the left of the floor; without one the crate is there.
  hasStation: boolean;
  // Floor kept at the right for the plant, or the season's corner.
  plantRoom: number;
  // A guest at the window now, and which visit (a new one each time).
  guest: Guest | null;
  run: number;
  tick: number;
  // The buddy is singing: the music box plays along.
  playing: boolean;
  onToy: () => void;
  onMusic: () => void;
  // A tap on a thing the buddy has something to say about.
  onProp: (prop: RoomProp) => void;
  // The hour to show instead of the device's (the art preview).
  hour?: number;
};

// Behind the buddy: the floor, the rug, the window and clock on the wall, portraits of buddies gone
// their own way, the things on the floor. The plant and the bowl are drawn by the stage, and so is
// the train, which passes in front.
export function WallDecor({
  decor,
  floor,
  top,
  width,
  height,
  hasStation,
  plantRoom: plantSpace,
  guest,
  run,
  tick,
  playing,
  onToy,
  onMusic,
  onProp,
  hour,
}: WallProps) {
  const { t } = useTranslation();
  const clock = useNow();
  const now = hour === undefined ? clock : new Date(2026, 0, 1, hour, 10);
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
  const clockRight = CLOCK_LEFT + 13 * clockScale;
  // In the middle, but clear of the portraits and the clock.
  const windowLeft = Math.max(
    clockRight + 12,
    Math.min((width - windowWidth) / 2, portraitsLeft - 10 - windowWidth),
  );
  const toyShown = !hasStation && decor.toy > 0;
  // The music box sits on the windowsill, at its left end: up there the buddy never hides it.
  const musicScale = wall >= 3 ? 2 : 1;
  const musicTop = top + 4 + (WINDOW_SILL_ROW + 1) * wall - MUSIC_BOX[0].length * musicScale;
  const rug = RUGS[decor.rug];
  const rugWidth = rug[0].length * 3;
  const guestHere = guest && guest !== 'train' ? guest : null;
  // A tap on the lamp switches it on or off, until the stage opens again.
  const [lampOn, setLampOn] = useState<boolean | null>(null);
  const lit = lampOn ?? sky !== 'day';

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
              <RoomWindow scale={wall} now={now} guest={guestHere} run={run} tick={tick} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}
      {decor.window && decor.musicBox ? (
        <View style={[styles.at, styles.box, { left: windowLeft + wall, top: musicTop }]}>
          <Arrive fresh={fresh('musicBox')} width={MUSIC_BOX[0][0].length * musicScale}>
            <MusicBox scale={musicScale} playing={playing} tick={tick} onPlay={onMusic} />
          </Arrive>
        </View>
      ) : null}
      {decor.clock ? (
        <View style={[styles.at, { left: CLOCK_LEFT, top: top + 8 }]}>
          <Arrive fresh={fresh('clock')} width={13 * clockScale}>
            <Tappable kind="rattle" label={t('buddy.room.clock')} onTap={() => onProp('clock')}>
              <WallClock scale={clockScale} now={now} />
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
      {decor.cushion ? (
        <View
          style={[
            styles.at,
            { left: (width - CUSHION[0].length * FLOOR_SCALE) / 2, bottom: floor - 7 },
          ]}
        >
          <Arrive fresh={fresh('cushion')} width={CUSHION[0].length * FLOOR_SCALE}>
            <Tappable kind="squish" label={t('buddy.room.cushion')}>
              <Cushion scale={FLOOR_SCALE} />
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
        <View style={[styles.at, { right: 8 + plantSpace, bottom: floor - 2 }]}>
          <Arrive fresh={fresh('lamp')} width={LAMP_ROOM}>
            <Tappable label={t('buddy.room.lamp')} onTap={() => setLampOn(!lit)}>
              <StandingLamp scale={FLOOR_SCALE} lit={lit} />
            </Tappable>
          </Arrive>
        </View>
      ) : null}

      {decor.fireflies && sky === 'night' && width > 0 ? (
        <Fireflies width={width} height={height - floor} />
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
