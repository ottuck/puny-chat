import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { boxPaths } from '../pixel/boxes';
import { PixelSprite } from '../pixel/pixel-sprite';
import { PROP_PALETTE, SPARKLE } from '../pixel/sprites';

// Rain, snow and a shooting star seen through the room's window (docs/fun-improvements.md, 가끔
// 생기는 사건): outside, not in the room. And the snow over the open-air hot spring in winter.

// Drops this far apart down the stage, falling one gap again and again.
export const RAIN_GAP = 30;
const SNOW_FALL_MS = 1500;
// The rain falls one gap in this long, again and again.
const RAIN_FALL_MS = 420;
export const SNOW = '#FFFFFF';
export const SNOW_SHADE = '#B9CCDD';
// The colors of what is drawn without a grid: the rain and its grey sky, the dusk sky and its stars.
const RAIN = '#8FB8D8';
const OVERCAST = 'rgba(70, 88, 112, 0.32)';
const DUSK = 'rgba(28, 36, 64, 0.62)';
const STAR = '#FFE9A8';
// Where the stars come out, as fractions of the glass.
const STARS = [
  [0.08, 0.2],
  [0.3, 0.1],
  [0.52, 0.32],
  [0.72, 0.12],
  [0.9, 0.4],
  [0.18, 0.5],
] as const;
const NATIVE_DRIVER = Platform.OS !== 'web';

// The drops of one gap's worth of rain, column by column, each column a little off from the next,
// `gap` apart down a column. Under the umbrella (`shelter`, in the stage's points) none fall.
export function rainDrops(
  width: number,
  height: number,
  apart: number,
  shelter: { left: number; right: number; top: number } | null,
  gap = RAIN_GAP,
): [number, number][] {
  const drops: [number, number][] = [];
  for (let x = Math.min(6, apart / 2), i = 0; x < width; x += apart, i++) {
    for (let y = (i * 13) % gap; y < height + gap; y += gap) {
      if (shelter && x + 2 > shelter.left && x < shelter.right && y + 9 > shelter.top) continue;
      drops.push([x, y]);
    }
  }
  return drops;
}

// Snow drifting down over `height` points of a stage `width` wide, for as long as it is shown:
// flakes `flake` points square, a column every `apart` points, `gap` apart down it.
export function Snowfall({
  width,
  height,
  flake = 4,
  apart = 34,
  gap = RAIN_GAP,
}: {
  width: number;
  height: number;
  flake?: number;
  apart?: number;
  gap?: number;
}) {
  const [fall] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(fall, {
        toValue: 1,
        duration: SNOW_FALL_MS,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [fall]);
  return (
    <Animated.View
      style={[
        styles.fall,
        {
          top: -gap,
          transform: [
            { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, gap] }) },
          ],
        },
      ]}
    >
      <Svg width={width} height={height + gap}>
        {boxPaths(
          rainDrops(width, height, apart, null, gap).flatMap(([x, y]) => [
            { x: x + 1, y: y + 1, w: flake, h: flake, fill: SNOW_SHADE },
            { x, y, w: flake, h: flake, fill: SNOW },
          ]),
        ).map(({ fill, d }) => (
          <Path key={fill} d={d} fill={fill} />
        ))}
      </Svg>
    </Animated.View>
  );
}

export type WindowWeather = 'rain' | 'snow' | 'shootingStar';

// The weather in the window's glass (`width` × `height`, the window drawn `scale` points a cell),
// for `ms`: drawn small to match the window, under its glazing bars.
export function WindowWeatherView({
  kind,
  width,
  height,
  scale,
  ms,
}: {
  kind: WindowWeather;
  width: number;
  height: number;
  scale: number;
  ms: number;
}) {
  if (kind === 'snow') {
    return (
      <Snowfall
        width={width}
        height={height}
        flake={Math.max(2, scale - 1)}
        apart={scale * 3}
        gap={scale * 4}
      />
    );
  }
  if (kind === 'rain') return <WindowRain width={width} height={height} scale={scale} />;
  return <ShootingStar width={width} height={height} scale={scale} ms={ms} />;
}

// A shower: the sky greys over and thin drops stream down.
function WindowRain({ width, height, scale }: { width: number; height: number; scale: number }) {
  const [fall] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(fall, {
        toValue: 1,
        duration: RAIN_FALL_MS,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [fall]);
  const drop = Math.max(1, Math.round(scale / 2));
  const gap = scale * 5;
  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERCAST }]} />
      <Animated.View
        style={[
          styles.fall,
          {
            top: -gap,
            transform: [
              { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, gap] }) },
            ],
          },
        ]}
      >
        <Svg width={width} height={height + gap}>
          <Path
            d={boxPaths(
              rainDrops(width, height, scale * 3, null, gap).map(([x, y]) => ({
                x,
                y,
                w: drop,
                h: scale * 2,
                fill: RAIN,
              })),
            )
              .map(({ d }) => d)
              .join('')}
            fill={RAIN}
          />
        </Svg>
      </Animated.View>
    </>
  );
}

// The sky darkens, stars come out, and a shooting star crosses it, trailing its tail; then the sky
// clears again (0→1 darkening, 1→2 the star, 2→3 light again).
function ShootingStar({
  width,
  height,
  scale,
  ms,
}: {
  width: number;
  height: number;
  scale: number;
  ms: number;
}) {
  const [dusk] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const to = (value: number, duration: number, easing = Easing.linear) =>
      Animated.timing(dusk, { toValue: value, duration, easing, useNativeDriver: NATIVE_DRIVER });
    const run = Animated.sequence([
      to(1, 500),
      to(2, 1000, Easing.in(Easing.quad)),
      Animated.delay(Math.max(0, ms - 2000)),
      to(3, 500),
    ]);
    run.start();
    return () => run.stop();
  }, [dusk, ms]);
  const star = Math.max(2, scale - 1);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: DUSK,
          opacity: dusk.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 1, 1, 0] }),
        },
      ]}
    >
      <Svg width={width} height={height}>
        <Path
          d={boxPaths(
            STARS.map(([sx, sy]) => ({
              x: sx * width,
              y: sy * height,
              w: star,
              h: star,
              fill: STAR,
            })),
          )
            .map(({ d }) => d)
            .join('')}
          fill={STAR}
        />
      </Svg>
      <Animated.View
        style={[
          styles.at,
          {
            opacity: dusk.interpolate({
              inputRange: [0.9, 1, 2, 2.1],
              outputRange: [0, 1, 1, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                translateX: dusk.interpolate({
                  inputRange: [1, 2],
                  outputRange: [width * 0.85, width * 0.12],
                  extrapolate: 'clamp',
                }),
              },
              {
                translateY: dusk.interpolate({
                  inputRange: [1, 2],
                  outputRange: [height * 0.08, height * 0.62],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        {/* The tail trails up and to the right of the falling star. */}
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.at,
              {
                width: star,
                height: star,
                left: star + i * (star + 1),
                top: -i * star * 0.8,
                opacity: 1 - i / 6,
                backgroundColor: '#FFD166',
              },
            ]}
          />
        ))}
        <PixelSprite frame={SPARKLE} palette={PROP_PALETTE} scale={Math.max(1, scale / 2)} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  at: {
    position: 'absolute',
  },
  fall: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
});
