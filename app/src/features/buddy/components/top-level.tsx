import { useEffect, useId, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useColors } from '@/theme';

import { type Frame, PixelSprite } from '../pixel/pixel-sprite';

// Reaching the top level (docs/fun-improvements.md, 최고 레벨): light coming down from the sky onto
// the buddy, white feathers drifting down over the room, and three notes one after another: the top
// level reached, a letter from the developer in the mailbox (tap to read), and the job free to change.

const NATIVE_DRIVER = Platform.OS !== 'web';
// Each note shows this long; the whole moment lasts while they do.
export const TOP_NOTE_MS = 2800;

// --- Light from the sky ---

// A column of light coming down from the top of the stage onto the buddy, as if from the sky:
// brighter in its core, a glow pooling at its feet, specks of light drifting down it. It grows down
// from the top, shimmers, and fades. Drawn with the buddy (behind it), so it stays over the buddy.
export function TopLevelLight({
  width,
  height,
  stageHeight,
  ms,
}: {
  width: number;
  height: number;
  stageHeight: number;
  ms: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tall = stageHeight + 20;
  const wide = Math.round(width * 2);
  const [down] = useState(() => new Animated.Value(0));
  const [shimmer] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const show = Animated.sequence([
      Animated.timing(down, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.delay(ms - 1900),
      Animated.timing(down, { toValue: 2, duration: 1000, useNativeDriver: NATIVE_DRIVER }),
    ]);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    show.start();
    pulse.start();
    return () => {
      show.stop();
      pulse.stop();
    };
  }, [down, shimmer, ms]);
  const mid = wide / 2;
  const column = (top: number, bottom: number) =>
    `${mid - top / 2},0 ${mid + top / 2},0 ${mid + bottom / 2},${tall} ${mid - bottom / 2},${tall}`;
  return (
    <Animated.View
      style={[
        styles.at,
        styles.passThrough,
        {
          width: wide,
          height: tall,
          left: (width - wide) / 2,
          top: height - tall + 6,
          transformOrigin: 'center top',
          opacity: down.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0] }),
          transform: [
            { scaleY: down.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 1] }) },
          ],
        },
      ]}
    >
      <Animated.View
        style={{ opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }}
      >
        <Svg width={wide} height={tall}>
          <Defs>
            <LinearGradient id={`halo${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFF3C4" stopOpacity={0.35} />
              <Stop offset="0.6" stopColor="#FFE39A" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#FFD873" stopOpacity={0.6} />
            </LinearGradient>
            <LinearGradient id={`core${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6} />
              <Stop offset="1" stopColor="#FFFDF2" stopOpacity={0.8} />
            </LinearGradient>
            <RadialGradient id={`pool${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF4C2" stopOpacity={0.9} />
              <Stop offset="1" stopColor="#FFE08A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Polygon points={column(wide * 0.4, wide * 0.95)} fill={`url(#halo${id})`} />
          <Polygon points={column(wide * 0.16, wide * 0.5)} fill={`url(#core${id})`} />
          <Ellipse cx={mid} cy={tall - 10} rx={wide * 0.5} ry={14} fill={`url(#pool${id})`} />
        </Svg>
      </Animated.View>
      {SPECKS.map((speck) => (
        <Speck key={speck.x} left={mid + speck.x * wide * 0.4} tall={tall} {...speck} />
      ))}
    </Animated.View>
  );
}

// Specks of light drifting down the column.
const SPECKS = [
  { x: -0.6, delay: 0, ms: 2400 },
  { x: -0.2, delay: 700, ms: 2800 },
  { x: 0.25, delay: 300, ms: 2200 },
  { x: 0.6, delay: 1100, ms: 2600 },
  { x: 0.05, delay: 1600, ms: 3000 },
] as const;

function Speck({
  left,
  tall,
  delay,
  ms,
}: {
  left: number;
  tall: number;
  delay: number;
  ms: number;
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
  }, [fall, delay, ms]);
  return (
    <Animated.View
      style={[
        styles.speck,
        {
          left,
          opacity: fall.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, tall - 20] }) },
          ],
        },
      ]}
    />
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
  speck: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: 3,
    backgroundColor: '#FFFFFF',
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
