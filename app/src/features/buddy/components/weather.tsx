import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';

// Rain and snow over the stage (docs/fun-improvements.md, 가끔 생기는 사건), and the snow in the hot
// spring in winter.

// Drops this far apart down the stage, falling one gap again and again.
export const RAIN_GAP = 30;
const SNOW_FALL_MS = 1500;
const SNOW = '#FFFFFF';
const SNOW_SHADE = '#B9CCDD';
const NATIVE_DRIVER = Platform.OS !== 'web';

// The drops of one gap's worth of rain, column by column, each column a little off from the next.
// Under the umbrella (`shelter`, in the stage's points) none fall.
export function rainDrops(
  width: number,
  height: number,
  apart: number,
  shelter: { left: number; right: number; top: number } | null,
): [number, number][] {
  const drops: [number, number][] = [];
  for (let x = 6, i = 0; x < width; x += apart, i++) {
    for (let y = (i * 13) % RAIN_GAP; y < height + RAIN_GAP; y += RAIN_GAP) {
      if (shelter && x + 2 > shelter.left && x < shelter.right && y + 9 > shelter.top) continue;
      drops.push([x, y]);
    }
  }
  return drops;
}

// Snow drifting down over `height` points of a stage `width` wide, for as long as it is shown.
export function Snowfall({ width, height }: { width: number; height: number }) {
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
          top: -RAIN_GAP,
          transform: [
            { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, RAIN_GAP] }) },
          ],
        },
      ]}
    >
      <Svg width={width} height={height + RAIN_GAP}>
        {rainDrops(width, height, 34, null).map(([dx, dy]) => (
          <G key={dx + ',' + dy}>
            <Rect x={dx + 1} y={dy + 1} width={4} height={4} fill={SNOW_SHADE} />
            <Rect x={dx} y={dy} width={4} height={4} fill={SNOW} />
          </G>
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fall: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
});
