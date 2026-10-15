import { StyleSheet, View } from 'react-native';

import type { AlbumEntry } from '@/features/room/api';

import { PixelSprite } from '../pixel/pixel-sprite';
import {
  BUDDY_PALETTE,
  type BowlTier,
  buddyFrame,
  HEART,
  PLANTS,
  type PlantTier,
  PROP_PALETTE,
  RUG,
} from '../pixel/sprites';

// The stage's decorations (docs/spec.md, 무대 꾸미기). Levels bring a reward every few levels,
// mostly making what is already there finer, so the stage does not fill up. They belong to the
// buddy: when it goes its own way it takes its things along, the new egg's room starts bare, and
// only its portrait stays on the wall.

export type Reward = 'plant1' | 'bowl1' | 'plant2' | 'plant3' | 'bowl2';

// Shown in the guide and the buddy sheet ("next: Lv.10 silver bowl") as well.
export const REWARDS: readonly { level: number; reward: Reward }[] = [
  { level: 4, reward: 'plant1' },
  { level: 8, reward: 'bowl1' },
  { level: 14, reward: 'plant2' },
  { level: 25, reward: 'plant3' },
  { level: 30, reward: 'bowl2' },
];

const FRAMES_SHOWN = 3;

// Which kind a pot grows into, drawn once per room and buddy: the same on both phones and every
// time the app opens (a hash of the buddy's name and the tier, not a fresh random number).
function kindOf(seed: string, tier: PlantTier, kinds: number): number {
  let hash = tier * 31;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash % kinds;
}

// `seed`: the buddy's name. `kind`: a kind to show regardless (the art preview).
export function decorFor(level: number, album: AlbumEntry[], seed = '', kind?: number) {
  const reached = level;
  const has = (reward: Reward) =>
    REWARDS.some((entry) => entry.reward === reward && reached >= entry.level);
  const plant: PlantTier | 0 = has('plant3') ? 3 : has('plant2') ? 2 : has('plant1') ? 1 : 0;
  const bowl: BowlTier = has('bowl2') ? 2 : has('bowl1') ? 1 : 0;
  const kinds = plant === 0 ? 1 : PLANTS[plant].length;
  return {
    plant,
    plantKind: kind !== undefined ? kind % kinds : plant === 0 ? 0 : kindOf(seed, plant, kinds),
    plantScale: plantScale(plant, reached),
    bowl,
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
const PLANT_FROM: Record<PlantTier, number> = { 1: 4, 2: 14, 3: 25 };
const PLANT_FULL_AT: Record<PlantTier, number> = { 1: 13, 2: 24, 3: 30 };

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

// Behind the buddy: portraits of buddies gone their own way, and the rug. The plant and the bowl
// are drawn by the stage.
export function WallDecor({ decor, floor, top }: { decor: Decor; floor: number; top: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {/* Snapshots of buddies gone their own way: smiling, in a pastel frame pinned at a tilt, with
          a heart, like a photo on a fridge rather than a formal portrait. */}
      {decor.portraits.map((entry, i) => (
        <View
          key={entry.graduatedAt}
          style={[
            styles.frame,
            {
              top: top + 8,
              right: 14 + (decor.portraits.length - 1 - i) * 52,
              transform: [{ rotate: i % 2 === 0 ? '-6deg' : '5deg' }],
            },
          ]}
          accessibilityLabel={entry.name}
        >
          <PixelSprite frame={buddyFrame('ADULT', 'happy')} palette={BUDDY_PALETTE} scale={1.5} />
          <View style={styles.heart}>
            <PixelSprite frame={HEART} palette={PROP_PALETTE} scale={1.5} />
          </View>
        </View>
      ))}
      {/* The rug is there from the egg on: it warms the room and keeps the empty stage balanced. */}
      <View style={[styles.rug, { bottom: floor - 5 }]}>
        <PixelSprite frame={RUG} palette={PROP_PALETTE} scale={3} />
      </View>
    </View>
  );
}

export function Plant({ tier, kind, scale }: { tier: PlantTier; kind: number; scale: number }) {
  return <PixelSprite frame={PLANTS[tier][kind]} palette={PROP_PALETTE} scale={scale} />;
}

const styles = StyleSheet.create({
  passThrough: {
    pointerEvents: 'none',
  },
  frame: {
    position: 'absolute',
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
  rug: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
