import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { useColors } from '@/theme';

import { type Frame, PixelSprite } from '../pixel/pixel-sprite';

// Reaching the top level (docs/fun-improvements.md, 최고 레벨): rays of light turning slowly behind
// the buddy, white feathers drifting down over the room, and three notes one after another: the top
// level reached, a letter from the developer in the mailbox (tap to read), and the job free to change.

const NATIVE_DRIVER = Platform.OS !== 'web';
// Each note shows this long; the whole moment lasts while they do.
export const TOP_NOTE_MS = 2800;

// --- Rays ---

const RAYS = 12;

// Behind the buddy, centered on it: soft gold wedges, turning, fading in and out.
export function TopLevelRays({ width, height, ms }: { width: number; height: number; ms: number }) {
  const size = Math.round(height * 2.6);
  const [turn] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 14_000,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    const fade = Animated.sequence([
      Animated.timing(shown, { toValue: 1, duration: 700, useNativeDriver: NATIVE_DRIVER }),
      Animated.delay(ms - 1700),
      Animated.timing(shown, { toValue: 0, duration: 1000, useNativeDriver: NATIVE_DRIVER }),
    ]);
    spin.start();
    fade.start();
    return () => {
      spin.stop();
      fade.stop();
    };
  }, [turn, shown, ms]);
  const half = size / 2;
  const wedges = Array.from({ length: RAYS }, (_, i) => {
    const angle = (i / RAYS) * 2 * Math.PI;
    const spread = Math.PI / RAYS / 1.6;
    const point = (a: number) => `${half + Math.cos(a) * half},${half + Math.sin(a) * half}`;
    return `${half},${half} ${point(angle - spread)} ${point(angle + spread)}`;
  });
  return (
    <Animated.View
      style={[
        styles.at,
        styles.passThrough,
        {
          width: size,
          height: size,
          left: (width - size) / 2,
          top: (height - size) / 2,
          opacity: shown,
          transform: [
            { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size}>
        {wedges.map((points, i) => (
          <Polygon
            key={i}
            points={points}
            fill={i % 2 === 0 ? 'rgba(255, 214, 110, 0.38)' : 'rgba(255, 240, 190, 0.3)'}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

// --- Feathers ---

// A small white feather with a beige shaft.
// prettier-ignore
const FEATHER: Frame = [
  '..ww',
  '.wwn',
  '.wnw',
  'wnww',
  'wnw.',
  'nw..',
  'n...',
];
const FEATHER_PALETTE = { w: '#FFFFFF', n: '#D9CFC4' };

const FEATHERS = [
  { x: 0.08, delay: 0, ms: 4200 },
  { x: 0.22, delay: 900, ms: 5200 },
  { x: 0.36, delay: 300, ms: 4600 },
  { x: 0.5, delay: 1500, ms: 5000 },
  { x: 0.64, delay: 600, ms: 4400 },
  { x: 0.78, delay: 1200, ms: 5400 },
  { x: 0.9, delay: 200, ms: 4800 },
  { x: 0.3, delay: 2400, ms: 4300 },
  { x: 0.7, delay: 2800, ms: 4700 },
] as const;

// Over the whole room, drifting down and swaying.
export function Feathers({ width, height }: { width: number; height: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {FEATHERS.map((feather) => (
        <Feather
          key={`${feather.x}${feather.delay}`}
          height={height}
          left={feather.x * width}
          {...feather}
        />
      ))}
    </View>
  );
}

function Feather({
  left,
  height,
  delay,
  ms,
}: {
  left: number;
  height: number;
  delay: number;
  ms: number;
}) {
  const [fall] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const move = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(fall, {
        toValue: 1,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);
    move.start();
    return () => move.stop();
  }, [fall, delay, ms]);
  return (
    <Animated.View
      style={[
        styles.at,
        {
          left,
          top: 0,
          opacity: fall.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            {
              translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-20, height - 30] }),
            },
            {
              translateX: fall.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0, 14, 0, -14, 0],
              }),
            },
            {
              rotate: fall.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: ['-25deg', '20deg', '-20deg', '25deg', '-10deg'],
              }),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={FEATHER} palette={FEATHER_PALETTE} scale={3} />
    </Animated.View>
  );
}

// --- The notes ---

// One after another at the top of the stage, each fading in and out. A note with `onPress` can be
// tapped (the letter: opens the mailbox).
export function TopLevelNotes({ notes }: { notes: { text: string; onPress?: () => void }[] }) {
  const colors = useColors();
  const [step, setStep] = useState(0);
  const [shown] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (step >= notes.length) return;
    shown.setValue(0);
    const fade = Animated.sequence([
      Animated.timing(shown, { toValue: 1, duration: 300, useNativeDriver: NATIVE_DRIVER }),
      Animated.delay(TOP_NOTE_MS - 600),
      Animated.timing(shown, { toValue: 0, duration: 300, useNativeDriver: NATIVE_DRIVER }),
    ]);
    fade.start();
    const timer = setTimeout(() => setStep((s) => s + 1), TOP_NOTE_MS);
    return () => {
      fade.stop();
      clearTimeout(timer);
    };
  }, [step, notes.length, shown]);
  const note = notes[step];
  if (!note) return null;
  return (
    <Animated.View
      style={[
        styles.notes,
        note.onPress ? styles.boxOnly : styles.passThrough,
        {
          opacity: shown,
          transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        },
      ]}
    >
      <Pressable onPress={note.onPress} disabled={!note.onPress} accessibilityRole="button">
        <Text
          style={[
            styles.note,
            { color: colors.text, backgroundColor: colors.surface, borderColor: '#E8B53E' },
          ]}
        >
          {note.text}
        </Text>
      </Pressable>
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
  boxOnly: {
    pointerEvents: 'box-none',
  },
  notes: {
    position: 'absolute',
    top: 40,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  note: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
});
