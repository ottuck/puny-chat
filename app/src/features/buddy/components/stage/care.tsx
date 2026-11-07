import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { type Frame, PixelSprite } from '../../pixel/pixel-sprite';
import {
  bowl,
  type BowlTier,
  mealTable,
  POOP,
  PROP_PALETTE,
  RICE,
  SIT_ROWS,
  SPARKLE,
  THOUGHT_FOOD,
} from '../../pixel/sprites';
import { FLOOR, PROP_SCALE, TABLE_CELLS, THOUGHT_SLOP, THOUGHT_TOP } from './constants';
import { DroppingIn, FlyingAway } from './motion';

// What the buddy's care is tapped on (buddy-stage.tsx): the bowl, the thought of food, the meal's
// table and the poops.

// The bowl, for the egg and the baby; older ones eat at the table.
export function Bowl({
  bowlRight,
  wantsFood,
  nudge,
  riceSparkle,
  feed,
  busy,
  kind,
  rice,
}: {
  bowlRight: number;
  wantsFood: boolean;
  nudge: Animated.Value;
  riceSparkle: boolean;
  feed: () => void;
  busy: boolean;
  kind: BowlTier;
  rice: Animated.Value;
}) {
  const { t } = useTranslation();
  return (
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
        <PixelSprite frame={bowl(false, kind)} palette={PROP_PALETTE} scale={PROP_SCALE} />
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
  );
}

// The thought of food can be tapped to feed, as people do. Drawn above the buddy's box it sits
// outside it, where an iPhone does not pass touches on; this follows it on the stage instead, a
// little larger than the cloud.
export function ThoughtTap({
  scale,
  workNod,
  sitting,
  frame,
  onRightHalf,
  workSway,
  x,
  feed,
}: {
  scale: number;
  workNod: number;
  sitting: boolean;
  frame: Frame;
  onRightHalf: boolean;
  workSway: number;
  x: Animated.Value;
  feed: () => void;
}) {
  const { t } = useTranslation();
  return (
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
  );
}

// The table, out for the meal and in front of the buddy, which eats behind it. `full`: rice on it.
export function MealTable({
  workSway,
  spriteWidth,
  table,
  eating,
  x,
  full,
  kind,
}: {
  workSway: number;
  spriteWidth: number;
  table: { value: Animated.Value };
  eating: boolean;
  x: Animated.Value;
  full: boolean;
  kind: BowlTier;
}) {
  return (
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
      <PixelSprite frame={mealTable(full, kind)} palette={PROP_PALETTE} scale={PROP_SCALE} />
    </Animated.View>
  );
}

// In front of the buddy, so one by its feet can still be tapped away.
export function Poops({
  slots,
  poopRight,
  nudge,
  clean,
  busy,
  flyingOff,
  doneLeaving,
}: {
  slots: number[];
  poopRight: number;
  nudge: Animated.Value;
  clean: (slot: number) => void;
  busy: boolean;
  flyingOff: { key: string; index: number }[];
  doneLeaving: (key: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
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
  passThrough: {
    pointerEvents: 'none',
  },
});
