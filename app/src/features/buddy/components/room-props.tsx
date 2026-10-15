import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useColors } from '@/theme';

import { PixelSprite } from '../pixel/pixel-sprite';
import {
  BALL,
  CAT_TAIL,
  clockAt,
  CRATE,
  CUSHION,
  LAMP,
  LAMP_LIT,
  MUSIC_BOX,
  ROOM_PALETTE,
  SKY_PALETTES,
  skyAt,
  SNAIL,
  SPARROW,
  TOY_BOX,
  TRAIN,
  WINDOW,
  WINDOW_GLASS,
  WINDOW_SILL_ROW,
} from '../pixel/room';
import { BUDDY_PALETTE, NOTE, PROP_PALETTE, SPARKLE } from '../pixel/sprites';

// The room's things that come with levels (docs/fun-improvements.md, 방 소품), drawn on the stage:
// what stands and hangs in the room (stage-decor.tsx places them), the guests that drop by, and
// the glow of fireflies at night.

const NATIVE_DRIVER = Platform.OS !== 'web';

// The guests that come now and then, like the small happenings (buddy-stage.tsx picks them).
export type Guest = 'snail' | 'sparrow' | 'catTail' | 'train';
export const GUEST_MS: Record<Guest, number> = {
  snail: 7000,
  sparrow: 4200,
  catTail: 4200,
  train: 4200,
};

// The time, checked once a minute: the window's sky, the clock's hands, the lamp and the fireflies
// follow it.
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const SPARKLE_AT = [
  [-0.15, 0.1],
  [0.95, 0.35],
] as const;

// A thing that just came with a new level pops in with a sparkle; the ones already there do not.
export function Arrive({
  fresh,
  width,
  children,
}: {
  fresh: boolean;
  width: number;
  children: ReactNode;
}) {
  const [pop] = useState(() => new Animated.Value(fresh ? 0 : 1));
  const [shining, setShining] = useState(fresh);
  useEffect(() => {
    if (!fresh) return;
    const spring = Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: NATIVE_DRIVER,
    });
    spring.start();
    const timer = setTimeout(() => setShining(false), 1400);
    return () => {
      spring.stop();
      clearTimeout(timer);
    };
  }, [fresh, pop]);
  return (
    <Animated.View
      style={{
        opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
      }}
    >
      {children}
      {shining
        ? SPARKLE_AT.map(([x, y]) => (
            <View key={x} style={[styles.at, { left: x * width, top: y * width - 8 }]}>
              <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={3} />
            </View>
          ))
        : null}
    </Animated.View>
  );
}

// --- On the wall ---

// The window (Lv.12): the sky by the device's clock, and the guests at the glass.
export function RoomWindow({
  scale,
  now,
  guest,
  run,
  tick,
}: {
  scale: number;
  now: Date;
  guest: Guest | null;
  // A new visit each time (the stage's count of its acts).
  run: number;
  tick: number;
}) {
  const glass = {
    left: WINDOW_GLASS.col * scale,
    top: WINDOW_GLASS.row * scale,
    width: WINDOW_GLASS.cols * scale,
    height: WINDOW_GLASS.rows * scale,
  };
  // The guests are drawn a little finer than the window.
  const small = Math.max(2, scale - 1);
  return (
    <View>
      <PixelSprite frame={WINDOW} palette={SKY_PALETTES[skyAt(now.getHours())]} scale={scale} />
      <View style={[styles.glass, glass]}>
        {guest === 'snail' ? (
          <Snail key={run} glass={glass} scale={small} tick={tick} />
        ) : guest === 'catTail' ? (
          <CatTail key={run} glass={glass} scale={small} tick={tick} />
        ) : null}
      </View>
      {guest === 'sparrow' ? (
        <Sparrow key={run} windowScale={scale} scale={small} tick={tick} />
      ) : null}
    </View>
  );
}

type Glass = { width: number; height: number };

// Crawling across the glass from right to left, over the hills.
function Snail({ glass, scale, tick }: { glass: Glass; scale: number; tick: number }) {
  const [crawl] = useState(() => new Animated.Value(0));
  const width = SNAIL[0][0].length * scale;
  const height = SNAIL[0].length * scale;
  useEffect(() => {
    const move = Animated.timing(crawl, {
      toValue: 1,
      duration: GUEST_MS.snail,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    });
    move.start();
    return () => move.stop();
  }, [crawl]);
  return (
    <Animated.View
      style={[
        styles.at,
        {
          top: glass.height - height - scale,
          transform: [
            {
              translateX: crawl.interpolate({
                inputRange: [0, 1],
                outputRange: [glass.width, -width],
              }),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={SNAIL[Math.floor(tick / 2) % 2]} palette={ROOM_PALETTE} scale={scale} />
    </Animated.View>
  );
}

// A cat walks by outside: its tail rises behind the sill, sways, and goes.
function CatTail({ glass, scale, tick }: { glass: Glass; scale: number; tick: number }) {
  const [rise] = useState(() => new Animated.Value(0));
  const width = CAT_TAIL[0][0].length * scale;
  const height = CAT_TAIL[0].length * scale;
  useEffect(() => {
    const move = Animated.sequence([
      Animated.timing(rise, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.delay(GUEST_MS.catTail - 1300),
      Animated.timing(rise, {
        toValue: 0,
        duration: 600,
        easing: Easing.in(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);
    move.start();
    return () => move.stop();
  }, [rise]);
  return (
    <Animated.View
      style={[
        styles.at,
        {
          left: glass.width - width - 2 * scale,
          top: glass.height - height + 2 * scale,
          transform: [
            {
              translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
            },
          ],
        },
      ]}
    >
      <PixelSprite frame={CAT_TAIL[tick % 2]} palette={ROOM_PALETTE} scale={scale} />
    </Animated.View>
  );
}

const SPARROW_FLY_MS = 600;

// A sparrow flies down onto the sill, pecks about, and flies off.
function Sparrow({
  windowScale,
  scale,
  tick,
}: {
  windowScale: number;
  scale: number;
  tick: number;
}) {
  const [flight] = useState(() => new Animated.Value(0));
  const [perched, setPerched] = useState(false);
  const height = SPARROW[0].length * scale;
  useEffect(() => {
    const move = Animated.sequence([
      Animated.timing(flight, {
        toValue: 1,
        duration: SPARROW_FLY_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.delay(GUEST_MS.sparrow - 2 * SPARROW_FLY_MS),
      Animated.timing(flight, {
        toValue: 2,
        duration: SPARROW_FLY_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);
    move.start();
    const timers = [
      setTimeout(() => setPerched(true), SPARROW_FLY_MS),
      setTimeout(() => setPerched(false), GUEST_MS.sparrow - SPARROW_FLY_MS),
    ];
    return () => {
      move.stop();
      timers.forEach(clearTimeout);
    };
  }, [flight]);
  return (
    <Animated.View
      style={[
        styles.at,
        {
          left: 13 * windowScale,
          top: WINDOW_SILL_ROW * windowScale - height + scale,
          opacity: flight.interpolate({
            inputRange: [0, 0.2, 1.8, 2],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            {
              translateX: flight.interpolate({ inputRange: [0, 1, 2], outputRange: [50, 0, -60] }),
            },
            {
              translateY: flight.interpolate({ inputRange: [0, 1, 2], outputRange: [-40, 0, -50] }),
            },
          ],
        },
      ]}
    >
      <PixelSprite
        frame={SPARROW[perched ? (tick % 3 === 0 ? 1 : 0) : 2]}
        palette={ROOM_PALETTE}
        scale={scale}
      />
    </Animated.View>
  );
}

// The wall clock (Lv.18), at the device's time.
export function WallClock({ scale, now }: { scale: number; now: Date }) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const face = useMemo(() => clockAt(hours, minutes), [hours, minutes]);
  return <PixelSprite frame={face} palette={ROOM_PALETTE} scale={scale} />;
}

// --- On the floor ---

// The left of the floor until a job's station takes it: a crate (Lv.6), then full of toys (Lv.9).
// A tap on the toys sends the ball bouncing out, and the buddy is glad.
export function FloorToy({
  toys,
  scale,
  onPlay,
}: {
  toys: boolean;
  scale: number;
  onPlay: () => void;
}) {
  const { t } = useTranslation();
  const [bounce] = useState(() => new Animated.Value(1));
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (run === 0) return;
    bounce.setValue(0);
    const move = Animated.timing(bounce, {
      toValue: 1,
      duration: 1100,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    });
    move.start();
    return () => move.stop();
  }, [run, bounce]);
  if (!toys) return <PixelSprite frame={CRATE} palette={ROOM_PALETTE} scale={scale} />;
  const play = () => {
    setRun((n) => n + 1);
    onPlay();
  };
  return (
    <Pressable onPress={play} accessibilityRole="button" accessibilityLabel={t('buddy.room.toys')}>
      <PixelSprite frame={TOY_BOX} palette={ROOM_PALETTE} scale={scale} />
      {run > 0 ? (
        <Animated.View
          style={[
            styles.at,
            styles.passThrough,
            {
              left: scale,
              top: scale,
              opacity: bounce.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0] }),
              transform: [
                {
                  translateX: bounce.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 30 * scale],
                  }),
                },
                {
                  // Up out of the box, down onto the floor, two smaller bounces.
                  translateY: bounce.interpolate({
                    inputRange: [0, 0.3, 0.6, 0.75, 0.9, 1],
                    outputRange: [0, -12 * scale, 12 * scale, 8 * scale, 12 * scale, 12 * scale],
                  }),
                },
              ],
            },
          ]}
        >
          <PixelSprite frame={BALL} palette={ROOM_PALETTE} scale={scale} />
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

// The music box (Lv.20): plays while the buddy sings, and a tap makes it sing.
export function MusicBox({
  scale,
  playing,
  tick,
  onPlay,
}: {
  scale: number;
  playing: boolean;
  tick: number;
  onPlay: () => void;
}) {
  const { t } = useTranslation();
  const [notes] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!playing) return;
    const rise = Animated.loop(
      Animated.timing(notes, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    rise.start();
    return () => {
      rise.stop();
      notes.setValue(0);
    };
  }, [playing, notes]);
  return (
    <Pressable
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={t('buddy.room.music')}
    >
      <PixelSprite frame={MUSIC_BOX[playing ? tick % 2 : 0]} palette={ROOM_PALETTE} scale={scale} />
      {playing ? (
        <Animated.View
          style={[
            styles.at,
            styles.passThrough,
            {
              left: (tick % 2 === 0 ? 2 : 8) * scale,
              top: -4 * scale,
              opacity: notes.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: notes.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) },
              ],
            },
          ]}
        >
          <PixelSprite frame={NOTE} palette={BUDDY_PALETTE} scale={3} />
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

// The standing lamp (Lv.36): lit in the evening and at night, with a soft glow around its shade.
export function StandingLamp({ scale, lit }: { scale: number; lit: boolean }) {
  const glow = 22 * scale;
  return (
    <View>
      {lit ? (
        <View
          style={[
            styles.glow,
            {
              width: glow,
              height: glow,
              borderRadius: glow / 2,
              left: (LAMP[0].length * scale - glow) / 2,
              top: 3 * scale - glow / 2,
            },
          ]}
        />
      ) : null}
      <PixelSprite frame={LAMP} palette={lit ? LAMP_LIT : ROOM_PALETTE} scale={scale} />
    </View>
  );
}

// The gold cushion (Lv.40), on the rug.
export function Cushion({ scale }: { scale: number }) {
  return <PixelSprite frame={CUSHION} palette={ROOM_PALETTE} scale={scale} />;
}

// The floor itself, once it changes (Lv.27, 35): boards, then tatami. Drawn across the stage's
// floor strip, in the theme's colors so it sits right in the dark too.
export function FloorPattern({
  kind,
  width,
  height,
}: {
  kind: 'wood' | 'tatami';
  width: number;
  height: number;
}) {
  const colors = useColors();
  const rects: { x: number; y: number; w: number; h: number; fill: string }[] = [];
  if (kind === 'wood') {
    const board = (height - 2) / 2;
    rects.push({ x: 0, y: 0, w: width, h: height, fill: colors.stageWood });
    rects.push({ x: 0, y: 0, w: width, h: 2, fill: colors.stageWoodLine });
    rects.push({ x: 0, y: 2 + board - 1, w: width, h: 2, fill: colors.stageWoodLine });
    // The boards' ends, staggered row by row.
    for (let x = 36; x < width; x += 96) {
      rects.push({ x, y: 2, w: 2, h: board - 1, fill: colors.stageWoodLine });
    }
    for (let x = 84; x < width; x += 96) {
      rects.push({ x, y: 2 + board + 1, w: 2, h: board - 1, fill: colors.stageWoodLine });
    }
  } else {
    rects.push({ x: 0, y: 0, w: width, h: height, fill: colors.stageTatami });
    // The weave, and the cloth edge along the top and between the mats.
    for (let x = 2; x < width; x += 4) {
      rects.push({ x, y: 5, w: 1, h: height - 5, fill: colors.stageTatamiLine });
    }
    rects.push({ x: 0, y: 0, w: width, h: 5, fill: colors.stageTatamiEdge });
    for (let x = Math.round(width / 3); x < width - 10; x += Math.round(width / 3)) {
      rects.push({ x: x - 2, y: 0, w: 4, h: height, fill: colors.stageTatamiEdge });
    }
  }
  return (
    <Svg width={width} height={height}>
      {rects.map((rect, i) => (
        <Rect key={i} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={rect.fill} />
      ))}
    </Svg>
  );
}

// --- In front of the buddy ---

// A toy train comes along the front of the floor and goes off the other side.
export function Train({ width, scale, tick }: { width: number; scale: number; tick: number }) {
  const [ride] = useState(() => new Animated.Value(0));
  const length = TRAIN[0][0].length * scale;
  useEffect(() => {
    const move = Animated.timing(ride, {
      toValue: 1,
      duration: GUEST_MS.train,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    });
    move.start();
    return () => move.stop();
  }, [ride]);
  return (
    <Animated.View
      style={[
        styles.at,
        styles.passThrough,
        {
          left: 0,
          bottom: 1,
          transform: [
            {
              translateX: ride.interpolate({ inputRange: [0, 1], outputRange: [-length, width] }),
            },
          ],
        },
      ]}
    >
      {/* Puffs from the chimney, one then the other. */}
      <View
        style={[
          styles.puff,
          {
            width: 2 * scale,
            height: 2 * scale,
            left: (tick % 2 === 0 ? 17 : 15) * scale,
            top: (tick % 2 === 0 ? -3 : -5) * scale,
          },
        ]}
      />
      <PixelSprite frame={TRAIN[tick % 2]} palette={ROOM_PALETTE} scale={scale} />
    </Animated.View>
  );
}

// Fireflies at night (Lv.28): three small glows drifting about the room, blinking.
const FIREFLIES = [
  { x: 0.22, y: 0.42, ms: 7000 },
  { x: 0.58, y: 0.26, ms: 9000 },
  { x: 0.82, y: 0.5, ms: 8000 },
] as const;

export function Fireflies({ width, height }: { width: number; height: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {FIREFLIES.map((fly) => (
        <Firefly key={fly.x} left={fly.x * width} top={fly.y * height} ms={fly.ms} />
      ))}
    </View>
  );
}

function Firefly({ left, top, ms }: { left: number; top: number; ms: number }) {
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: ms,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, ms]);
  return (
    <Animated.View
      style={[
        styles.firefly,
        {
          left,
          top,
          opacity: drift.interpolate({
            inputRange: [0, 0.15, 0.3, 0.5, 0.65, 0.85, 1],
            outputRange: [0.2, 1, 0.4, 1, 0.2, 0.9, 0.2],
          }),
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0, 22, 8, -16, 0],
              }),
            },
            {
              translateY: drift.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0, -12, -26, -8, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.fireflyCore} />
    </Animated.View>
  );
}

// The top level (Lv.40): the room sparkles all over for a moment.
const TWINKLES = [
  [0.08, 0.3],
  [0.22, 0.12],
  [0.35, 0.45],
  [0.5, 0.18],
  [0.63, 0.5],
  [0.76, 0.14],
  [0.9, 0.38],
  [0.15, 0.62],
  [0.84, 0.66],
] as const;

export function RoomSparkle({
  width,
  height,
  tick,
}: {
  width: number;
  height: number;
  tick: number;
}) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      {TWINKLES.map(([x, y], i) =>
        i % 2 === tick % 2 ? (
          <View key={i} style={[styles.at, { left: x * width, top: y * height }]}>
            <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={3} />
          </View>
        ) : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  at: {
    position: 'absolute',
  },
  passThrough: {
    pointerEvents: 'none',
  },
  glass: {
    position: 'absolute',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 214, 102, 0.28)',
  },
  puff: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
  firefly: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(222, 255, 120, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireflyCore: {
    width: 4,
    height: 4,
    backgroundColor: '#EAFF8C',
  },
});
