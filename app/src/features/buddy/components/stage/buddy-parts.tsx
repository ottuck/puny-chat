import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { BUTTERFLY, HEART_BIG, type Layer } from '../../pixel/looks';
import { type Frame, PixelSprite } from '../../pixel/pixel-sprite';
import { BUNDLE, ROOM_PALETTE } from '../../pixel/room';
import { THINGS_PALETTE } from '../../pixel/room-things';
import {
  BUDDY_PALETTE,
  DREAM_FOOD,
  DREAM_PALETTE,
  EXCLAIM,
  HEART,
  LEVEL_UP,
  NOTE,
  PROP_PALETTE,
  SPARKLE,
  THOUGHT_FOOD,
  ZZZ,
} from '../../pixel/sprites';
import type { ReactionKind } from '../../reactions';
import type { Act } from './acts';
import { BURST, THOUGHT_TOP } from './constants';
import { LayerSprite } from './motion';

// The buddy in its box on the stage (buddy-stage.tsx): the marks around it, and the buddy itself
// with what it wears and holds.

// The evolution's rings, and what shows over and around the buddy: a level up, a heart, the thought
// of food, a start, its zzz, sparkles when cleaned, a note while singing, the evolution's burst.
export function BuddyMarks({
  evolving,
  glowSize,
  spriteWidth,
  spriteHeight,
  glow,
  levelingUp,
  showHeart,
  bigHeart,
  thought,
  thinking,
  onRightHalf,
  nudge,
  sleeping,
  active,
  act,
  tick,
  sparkling,
  note,
  bursting,
  burst,
}: {
  evolving: boolean;
  glowSize: number;
  spriteWidth: number;
  spriteHeight: number;
  glow: Animated.Value;
  levelingUp: boolean;
  showHeart: boolean;
  bigHeart: boolean;
  thought: { present: boolean; value: Animated.Value };
  thinking: boolean;
  onRightHalf: boolean;
  nudge: Animated.Value;
  sleeping: boolean;
  active: { kind: ReactionKind; phase: 'main' | 'after' } | null;
  act: Act | null;
  tick: number;
  sparkling: boolean;
  note: Animated.Value;
  bursting: boolean;
  burst: Animated.Value;
}) {
  return (
    <>
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
    </>
  );
}

// The buddy, tapped to pet it (or to feed it when it thinks of food), with what is drawn with it:
// its bundle when leaving, the season's looks behind and in front, an umbrella, a book, a butterfly.
export function BuddyFigure({
  leaving,
  gridWidth,
  scale,
  flipped,
  behind,
  evolving,
  thinking,
  feed,
  pet,
  buddyName,
  frame,
  front,
  umbrella,
  book,
  butterfly,
  flutter,
  spriteWidth,
  spriteHeight,
  tick,
}: {
  leaving: boolean;
  gridWidth: number;
  scale: number;
  flipped: boolean;
  behind: Layer | null;
  evolving: boolean;
  thinking: boolean;
  feed: () => void;
  pet: () => void;
  buddyName: string;
  frame: Frame;
  front: Layer | null;
  umbrella: Layer | null;
  book: Layer | null;
  butterfly: readonly [row: number, col: number] | null;
  flutter: Animated.Value;
  spriteWidth: number;
  spriteHeight: number;
  tick: number;
}) {
  const { t } = useTranslation();
  return (
    <>
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
        accessibilityLabel={thinking ? t('buddy.feed') : t('buddy.pet', { buddy: buddyName })}
      >
        <PixelSprite frame={frame} palette={BUDDY_PALETTE} scale={scale} flipped={flipped} smooth />
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
    </>
  );
}

const styles = StyleSheet.create({
  above: {
    position: 'absolute',
    top: -24,
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
  passThrough: {
    pointerEvents: 'none',
  },
});
