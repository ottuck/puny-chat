import { type ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import type { Layer } from '../../pixel/looks';
import { type Palette, PixelSprite } from '../../pixel/pixel-sprite';
import { BUDDY_PALETTE, POOP, PROP_PALETTE, SPARKLE } from '../../pixel/sprites';
import { NATIVE_DRIVER, POOP_AWAY_MS, PROP_SCALE } from './constants';

// Small moving pieces of the stage (buddy-stage.tsx).

// Something drawn with the buddy (a look behind it, an umbrella, a butterfly), placed by the cells
// of its grid and mirrored with it when it turns.
export function LayerSprite({
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

// A new poop drops onto the floor with a little bounce.
export function DroppingIn({ children }: { children: ReactNode }) {
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

// A poop just cleaned up: squashed by the tap for a moment, then up and away, spinning and fading,
// with a sparkle.
export function FlyingAway({
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

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
  },
  passThrough: {
    pointerEvents: 'none',
  },
  cleanSparkle: {
    position: 'absolute',
    top: -8,
    left: -8,
  },
});
