import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useColors } from '@/theme';

import type { BuddyView } from '../api';
import {
  BATH_PALETTE,
  BUCKET,
  CLOUD_BIG,
  CLOUD_SMALL,
  DROP,
  fence,
  STEAM,
  TUB_SINK,
  tubFor,
} from '../pixel/bath';
import { bathFrame, type Hatched } from '../pixel/looks';
import { type Frame, PixelSprite } from '../pixel/pixel-sprite';
import { BUDDY_PALETTE, buddyFrame, type Pose } from '../pixel/sprites';
import { CORNER_SIZE, FLOOR, gridScale } from './buddy-stage';
import { SpeechBubble } from './speech-bubble';
import { Snowfall } from './weather';

// The hot spring (docs/fun-improvements.md, 목욕): the buddy soaks in a wooden tub in the middle of
// the stage, steam rising, a towel on its head. Nothing happens to it here: it shows the buddy as it
// was when it came (buddy-scene.tsx keeps that), and what happens in the room meanwhile is only in the
// chat. Petting it splashes the water. From a child up it says something now and then.

const NATIVE_DRIVER = Platform.OS !== 'web';
const TICK_MS = 450;
// How long the eyes stay shut, blissful, then open for a while.
const BLISS_TICKS = 7;
const AWAKE_TICKS = 5;
const SPLASH_MS = 700;
const RATTLE_MS = 650;
const TALK_EVERY_MS = 9000;
const TALK_MS = 3000;
const LINES = ['bath1', 'bath2', 'bath3'] as const;
// Tile seams on the stone floor, in points.
const TILE = 28;

function useTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return tick;
}

// A wisp of steam drifting up off the water and fading, again and again.
function Steam({
  left,
  bottom,
  delay,
  scale,
}: {
  left: number;
  bottom: number;
  delay: number;
  scale: number;
}) {
  const [rise] = useState(() => new Animated.Value(0));
  const tick = useTick(TICK_MS * 2);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rise, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(rise, { toValue: 0, duration: 0, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rise, delay]);
  return (
    <Animated.View
      style={[
        styles.passThrough,
        styles.absolute,
        {
          left,
          bottom,
          opacity: rise.interpolate({
            inputRange: [0, 0.2, 0.7, 1],
            outputRange: [0, 0.9, 0.6, 0],
          }),
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -10 * scale] }) },
          ],
        },
      ]}
    >
      <PixelSprite frame={STEAM[tick % 2]} palette={BATH_PALETTE} scale={scale} />
    </Animated.View>
  );
}

// Clouds across the sky: where they start (a fraction of the way across), how high (a fraction of
// the sky), and how long one crossing takes. Slow enough to be noticed only now and then.
const CLOUDS = [
  { frame: CLOUD_BIG, from: 0.15, high: 0.12, ms: 70_000 },
  { frame: CLOUD_SMALL, from: 0.62, high: 0.3, ms: 52_000 },
  { frame: CLOUD_BIG, from: 0.9, high: 0.42, ms: 90_000 },
] as const;

// A cloud drifting left to right across `width`, coming back in from the left.
function Cloud({
  frame,
  from,
  top,
  ms,
  width,
  scale,
}: {
  frame: Frame;
  from: number;
  top: number;
  ms: number;
  width: number;
  scale: number;
}) {
  const [drift] = useState(() => new Animated.Value(from));
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    let stopped = false;
    const cross = (start: number) => {
      if (stopped) return;
      drift.setValue(start);
      anim = Animated.timing(drift, {
        toValue: 1,
        duration: ms * (1 - start),
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      });
      anim.start(({ finished }) => finished && cross(0));
    };
    cross(from);
    return () => {
      stopped = true;
      anim?.stop();
    };
  }, [drift, from, ms]);
  const cloudWidth = frame[0].length * scale;
  return (
    <Animated.View
      style={[
        styles.absolute,
        {
          top,
          left: 0,
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [-cloudWidth, width],
              }),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={frame} palette={BATH_PALETTE} scale={scale} />
    </Animated.View>
  );
}

export function BathStage({
  buddy,
  height,
  corner,
  snowing = false,
}: {
  // As it was when it came to the bath.
  buddy: BuddyView;
  height: number;
  // The way back home, in the top right corner.
  corner: React.ReactNode;
  // Winter: snow falls on the open-air bath (never rain).
  snowing?: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const stage = (buddy.stage === 'EGG' ? 'BABY' : buddy.stage) as Hatched;
  const tick = useTick(TICK_MS);
  const [splash] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [splashing, setSplashing] = useState(false);
  const splashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rattle] = useState(() => new Animated.Value(0));
  const [line, setLine] = useState<(typeof LINES)[number] | null>(null);

  // It sways a little in the water.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  // Now and then, a word about the water (from a child up, like everywhere).
  const talks = stage !== 'BABY';
  useEffect(() => {
    if (!talks) return;
    let hide: ReturnType<typeof setTimeout> | undefined;
    let next = 0;
    const timer = setInterval(() => {
      setLine(LINES[next++ % LINES.length]);
      hide = setTimeout(() => setLine(null), TALK_MS);
    }, TALK_EVERY_MS);
    return () => {
      clearInterval(timer);
      if (hide) clearTimeout(hide);
    };
  }, [talks]);

  useEffect(
    () => () => {
      if (splashTimer.current) clearTimeout(splashTimer.current);
    },
    [],
  );

  // The bucket by the tub: a tap knocks it about on the stone, a clatter of small shakes.
  const knock = () => {
    rattle.stopAnimation();
    rattle.setValue(0);
    Animated.timing(rattle, {
      toValue: 1,
      duration: RATTLE_MS,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  };

  const pet = () => {
    if (splashTimer.current) clearTimeout(splashTimer.current);
    setSplashing(true);
    splash.setValue(0);
    Animated.timing(splash, {
      toValue: 1,
      duration: SPLASH_MS,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
    splashTimer.current = setTimeout(() => {
      splashTimer.current = null;
      setSplashing(false);
    }, SPLASH_MS);
  };

  const grid = buddyFrame(stage, 'idle');
  const scale = gridScale(height, grid.length);
  const tub = tubFor(stage);
  const fenceHeight = fence(1).length * scale;
  const tubWidth = tub.front[0].length * scale;
  const tubLeft = Math.round((width - tubWidth) / 2);
  const tubBottom = FLOOR - 4;
  const waterTop = tubBottom + tub.front.length * scale;
  const buddyLeft = tubLeft + tub.inset * scale;
  const buddyBottom = tubBottom + TUB_SINK * scale;
  const spriteHeight = grid.length * scale;
  // Eyes shut and smiling most of the time; a blink in between; a big smile when splashed.
  const cycle = tick % (BLISS_TICKS + AWAKE_TICKS);
  const pose: Pose = splashing
    ? 'happy'
    : cycle < BLISS_TICKS
      ? 'happy'
      : cycle === BLISS_TICKS + 2
        ? 'blink'
        : 'idle';
  const drops = [
    { dx: -0.9, rise: 7 },
    { dx: -0.4, rise: 10 },
    { dx: 0.45, rise: 9 },
    { dx: 0.95, rise: 6 },
  ];

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, backgroundColor: colors.bath }}
    >
      {/* The sky with clouds drifting by, a bamboo fence along the back (both a shade darker at
          night), and a stone floor in two courses of tiles. */}
      {width > 0 ? (
        <View style={[styles.sky, styles.passThrough, { bottom: FLOOR }]}>
          {CLOUDS.map((cloud, i) => (
            <Cloud
              key={i}
              frame={cloud.frame}
              from={cloud.from}
              top={cloud.high * (height - FLOOR - fenceHeight)}
              ms={cloud.ms}
              width={width}
              scale={scale}
            />
          ))}
          <View style={[styles.absolute, { left: 0, bottom: 0 }]}>
            <PixelSprite
              frame={fence(Math.ceil(width / scale))}
              palette={BATH_PALETTE}
              scale={scale}
            />
          </View>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bathDim }]} />
        </View>
      ) : null}
      <View
        style={[
          styles.floor,
          { height: FLOOR, backgroundColor: colors.bathFloor, borderTopColor: colors.bathLine },
        ]}
      >
        {width > 0 ? (
          <Svg width={width} height={FLOOR}>
            <Rect x={0} y={FLOOR / 2 - 2} width={width} height={2} fill={colors.bathLine} />
            {[...Array(Math.ceil(width / TILE) + 1)].flatMap((_, i) => [
              <Rect
                key={`a${i}`}
                x={i * TILE}
                y={0}
                width={2}
                height={FLOOR / 2 - 2}
                fill={colors.bathLine}
              />,
              <Rect
                key={`b${i}`}
                x={i * TILE + TILE / 2}
                y={FLOOR / 2}
                width={2}
                height={FLOOR / 2}
                fill={colors.bathLine}
              />,
            ])}
          </Svg>
        ) : null}
      </View>

      {width > 0 ? (
        <>
          <View style={[styles.absolute, styles.passThrough, { left: tubLeft, bottom: waterTop }]}>
            <PixelSprite frame={tub.back} palette={BATH_PALETTE} scale={scale} />
          </View>
          <Pressable
            onPress={pet}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.pet', { buddy: buddy.name })}
            style={[styles.absolute, { left: buddyLeft, bottom: buddyBottom }]}
          >
            <Animated.View
              style={{
                transform: [
                  { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -scale] }) },
                ],
              }}
            >
              <PixelSprite
                frame={bathFrame(stage, pose)}
                palette={BUDDY_PALETTE}
                scale={scale}
                smooth
              />
            </Animated.View>
            {line ? (
              <SpeechBubble
                text={t(`buddy.say.${line}`)}
                side="right"
                above={spriteHeight * 0.85}
              />
            ) : null}
          </Pressable>
          <View style={[styles.absolute, styles.passThrough, { left: tubLeft, bottom: tubBottom }]}>
            <PixelSprite frame={tub.front} palette={BATH_PALETTE} scale={scale} />
          </View>
          <Pressable
            onPress={knock}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.bath.bucket')}
            hitSlop={8}
            style={[
              styles.absolute,
              { left: tubLeft - (BUCKET[0].length + 3) * scale, bottom: FLOOR - 2 },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: rattle.interpolate({
                      inputRange: [0, 0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 1],
                      outputRange: [
                        '0deg',
                        '-10deg',
                        '9deg',
                        '-8deg',
                        '7deg',
                        '-5deg',
                        '3deg',
                        '-1deg',
                        '0deg',
                      ],
                    }),
                  },
                  {
                    translateY: rattle.interpolate({
                      inputRange: [0, 0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 1],
                      outputRange: [0, -scale, 0, -scale, 0, -scale / 2, 0, 0],
                    }),
                  },
                ],
              }}
            >
              <PixelSprite frame={BUCKET} palette={BATH_PALETTE} scale={scale} />
            </Animated.View>
          </Pressable>
          {[0.05, 0.88, 0.13].map((at, i) => (
            <Steam
              key={at}
              left={tubLeft + tubWidth * at - scale}
              bottom={waterTop + 2 * scale}
              delay={i * 800}
              scale={scale}
            />
          ))}
          {splashing
            ? drops.map((drop) => (
                <Animated.View
                  key={drop.dx}
                  style={[
                    styles.absolute,
                    styles.passThrough,
                    {
                      left: tubLeft + tubWidth / 2 - scale,
                      bottom: waterTop - scale,
                      opacity: splash.interpolate({
                        inputRange: [0, 0.8, 1],
                        outputRange: [1, 1, 0],
                      }),
                      transform: [
                        {
                          translateX: splash.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, drop.dx * tubWidth * 0.6],
                          }),
                        },
                        {
                          translateY: splash.interpolate({
                            inputRange: [0, 0.45, 1],
                            outputRange: [0, -drop.rise * scale, 2 * scale],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <PixelSprite frame={DROP} palette={BATH_PALETTE} scale={scale * 0.7} />
                </Animated.View>
              ))
            : null}
        </>
      ) : null}

      {snowing && width > 0 ? <Snowfall width={width} height={height - FLOOR} /> : null}
      <View style={styles.corner}>{corner}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
  passThrough: {
    pointerEvents: 'none',
  },
  sky: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
  },
  corner: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
});
