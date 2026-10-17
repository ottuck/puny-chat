import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { PixelSprite } from '../pixel/pixel-sprite';
import {
  CAT_FACE,
  DRAGONFLY,
  LADYBUG,
  OWL,
  PETAL,
  RAINBOW,
  SQUIRREL,
  SWALLOW,
  THINGS_PALETTE,
} from '../pixel/room-things';

// What the window grows into (docs/fun-improvements.md, 방 소품), drawn in its glass by RoomWindow
// (room-props.tsx): cherry petals drifting by, a rainbow after the rain, and the later guests.

const NATIVE_DRIVER = Platform.OS !== 'web';

export type Glass = { width: number; height: number };

// Once from 0 to 1 over the visit.
function useVisit(ms: number): Animated.Value {
  const [along] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const move = Animated.timing(along, {
      toValue: 1,
      duration: ms,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    });
    move.start();
    return () => move.stop();
  }, [along, ms]);
  return along;
}

// Points along the visit (0..1) and where the guest is at each.
function path(along: Animated.Value, at: number[], to: number[]) {
  return along.interpolate({ inputRange: at, outputRange: to });
}

// A ladybug climbing the glass from the bottom left, then flying off.
export function Ladybug({ glass, scale, tick, ms }: GuestProps) {
  const along = useVisit(ms);
  const height = LADYBUG[0].length * scale;
  return (
    <Animated.View
      style={[
        styles.at,
        {
          opacity: path(along, [0, 0.05, 0.85, 1], [0, 1, 1, 0]),
          transform: [
            {
              translateX: path(
                along,
                [0, 0.85, 1],
                [glass.width * 0.15, glass.width * 0.6, glass.width],
              ),
            },
            {
              translateY: path(
                along,
                [0, 0.85, 1],
                [glass.height - height, glass.height * 0.15, -height],
              ),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={LADYBUG[tick % 2]} palette={THINGS_PALETTE} scale={scale} />
    </Animated.View>
  );
}

// A red dragonfly comes in from the right, hovers a while, bobbing, and darts off to the left.
export function Dragonfly({ glass, scale, tick, ms }: GuestProps) {
  const along = useVisit(ms);
  const width = DRAGONFLY[0][0].length * scale;
  const middle = (glass.width - width) / 2;
  return (
    <Animated.View
      style={[
        styles.at,
        {
          transform: [
            {
              translateX: path(
                along,
                [0, 0.2, 0.5, 0.8, 1],
                [glass.width, middle, middle - 4, middle, -width],
              ),
            },
            {
              translateY: path(
                along,
                [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1],
                [
                  -4,
                  glass.height * 0.15,
                  glass.height * 0.2,
                  glass.height * 0.12,
                  glass.height * 0.2,
                  glass.height * 0.15,
                  0,
                ],
              ),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={DRAGONFLY[tick % 2]} palette={THINGS_PALETTE} scale={scale} />
    </Animated.View>
  );
}

// A swallow darts across the sky, dipping on the way.
export function Swallow({ glass, scale, tick, ms }: GuestProps) {
  const along = useVisit(ms);
  const width = SWALLOW[0][0].length * scale;
  return (
    <Animated.View
      style={[
        styles.at,
        {
          transform: [
            { translateX: path(along, [0, 1], [-width, glass.width]) },
            {
              translateY: path(along, [0, 0.5, 1], [glass.height * 0.05, glass.height * 0.35, 0]),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={SWALLOW[tick % 2]} palette={THINGS_PALETTE} scale={scale} />
    </Animated.View>
  );
}

// Rises from below the glass, stays a while, and goes down again: the owl, the cat's face.
function Rising({
  glass,
  ms,
  width,
  height,
  right,
  children,
}: {
  glass: Glass;
  ms: number;
  width: number;
  height: number;
  // From the glass's right edge (else in the middle).
  right?: number;
  children: React.ReactNode;
}) {
  const along = useVisit(ms);
  return (
    <Animated.View
      style={[
        styles.at,
        {
          left: right === undefined ? (glass.width - width) / 2 : glass.width - width - right,
          top: glass.height - height,
          transform: [{ translateY: path(along, [0, 0.15, 0.85, 1], [height, 0, 0, height]) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// An owl at night, blinking now and then.
export function Owl({ glass, scale, tick, ms }: GuestProps) {
  return (
    <Rising
      glass={glass}
      ms={ms}
      width={OWL[0][0].length * scale}
      height={(OWL[0].length - 1) * scale}
    >
      <PixelSprite frame={OWL[tick % 5 === 0 ? 1 : 0]} palette={THINGS_PALETTE} scale={scale} />
    </Rising>
  );
}

// The stray cat's face, looking in and blinking.
export function CatFace({ glass, scale, tick, ms }: GuestProps) {
  return (
    <Rising
      glass={glass}
      ms={ms}
      width={CAT_FACE[0][0].length * scale}
      height={(CAT_FACE[0].length - 1) * scale}
      right={scale}
    >
      <PixelSprite
        frame={CAT_FACE[tick % 4 === 0 ? 1 : 0]}
        palette={THINGS_PALETTE}
        scale={scale}
      />
    </Rising>
  );
}

// A squirrel hopping over the hills from left to right.
const HOPS = 5;
export function Squirrel({ glass, scale, ms }: GuestProps) {
  const along = useVisit(ms);
  const width = SQUIRREL[0].length * scale;
  const height = SQUIRREL.length * scale;
  const at = Array.from({ length: HOPS * 2 + 1 }, (_, i) => i / (HOPS * 2));
  return (
    <Animated.View
      style={[
        styles.at,
        {
          top: glass.height - height,
          transform: [
            { translateX: path(along, [0, 1], [-width, glass.width]) },
            {
              translateY: path(
                along,
                at,
                at.map((_, i) => (i % 2 === 1 ? -3 * scale : 0)),
              ),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={SQUIRREL} palette={THINGS_PALETTE} scale={scale} />
    </Animated.View>
  );
}

type GuestProps = { glass: Glass; scale: number; tick: number; ms: number };

// Cherry petals drifting down across the glass, over and over (in spring).
const PETALS = [
  { x: 0.2, ms: 5200, delay: 0 },
  { x: 0.55, ms: 6400, delay: 1700 },
  { x: 0.9, ms: 5800, delay: 3100 },
  { x: 0.7, ms: 7000, delay: 4400 },
] as const;

export function Petals({ glass, scale }: { glass: Glass; scale: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {PETALS.map((petal) => (
        <Petal key={petal.x} glass={glass} scale={scale} {...petal} />
      ))}
    </View>
  );
}

function Petal({
  glass,
  scale,
  x,
  ms,
  delay,
}: {
  glass: Glass;
  scale: number;
  x: number;
  ms: number;
  delay: number;
}) {
  const [fall] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fall, {
          toValue: 1,
          duration: ms,
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fall, ms, delay]);
  return (
    <Animated.View
      style={[
        styles.at,
        {
          left: x * glass.width,
          transform: [
            {
              translateX: path(
                fall,
                [0, 0.25, 0.5, 0.75, 1],
                [0, -6, -10, -18, -26].map((d) => d * (scale / 2)),
              ),
            },
            { translateY: path(fall, [0, 1], [-2 * scale, glass.height]) },
            {
              rotate: path(fall, [0, 1], [0, 1]).interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '200deg'],
              }),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={PETAL} palette={THINGS_PALETTE} scale={scale} />
    </Animated.View>
  );
}

// A rainbow for a while after the rain, fading in: a little one high in the glass, clear of the
// things on the sill, with the sky still showing around it.
export function Rainbow({ glass, scale }: { glass: Glass; scale: number }) {
  const [shown] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const fade = Animated.timing(shown, {
      toValue: 0.75,
      duration: 1200,
      useNativeDriver: NATIVE_DRIVER,
    });
    fade.start();
    return () => fade.stop();
  }, [shown]);
  return (
    <Animated.View
      style={[
        styles.at,
        styles.passThrough,
        {
          left: (glass.width - RAINBOW[0].length * scale) / 2,
          top: 2 * scale,
          opacity: shown,
        },
      ]}
    >
      <PixelSprite frame={RAINBOW} palette={THINGS_PALETTE} scale={scale} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  at: {
    position: 'absolute',
  },
  passThrough: {
    pointerEvents: 'none',
  },
});
