import { useEffect, useId, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

// The light in the room by the hour (docs/fun-improvements.md, 방의 빛): one room, colored by the
// time instead of drawn again. Morning is fresh and a little blue, the sun slanting in through the
// window with motes of dust glinting in it; the day is as it is; at dusk the room goes warm orange and the window lets
// in long golden light; at night it goes dark blue, and only the standing lamp (or the moon at the
// window) lights it, softly, around itself. Over the room and the buddy; under the name, the
// buttons and the notes.

const NATIVE_DRIVER = Platform.OS !== 'web';

export type RoomHour = 'morning' | 'day' | 'dusk' | 'night';

export function roomHour(hour: number): RoomHour {
  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

type Box = { left: number; top: number; width: number; height: number };

export function RoomLight({
  hour,
  width,
  height,
  floorTop,
  glass,
  lamp,
  dark,
}: {
  hour: RoomHour;
  width: number;
  height: number;
  // Where the floor begins, from the top.
  floorTop: number;
  // The window's glass on the stage, if there is a window.
  glass: Box | null;
  // The lit lamp's shade, if it is on.
  lamp: { x: number; y: number } | null;
  // Dark mode: the stage is dark already, the light goes easier on it.
  dark: boolean;
}) {
  // Ids for the gradients, the stage's own (on the web they are ids in the page).
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (hour === 'day' || width === 0) return null;
  const soften = dark ? 0.6 : 1;
  // The window's light falls toward the floor, leaning away from the sun: right in the morning,
  // left at dusk.
  const lean = hour === 'morning' ? 0.55 : -0.7;
  const beam = glass
    ? (() => {
        const drop = floorTop - glass.top;
        const dx = drop * lean;
        return `${glass.left},${glass.top} ${glass.left + glass.width},${glass.top} ${
          glass.left + glass.width + dx
        },${floorTop + 6} ${glass.left + dx},${floorTop + 6}`;
      })()
    : null;
  // At night the light comes from the lamp, or else faintly from the moon at the window.
  const glow =
    lamp ?? (glass ? { x: glass.left + glass.width / 2, y: glass.top + glass.height / 2 } : null);
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`beam${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={hour === 'morning' ? '#F2FAFF' : hour === 'dusk' ? '#FFC27A' : '#BFD3FF'}
              stopOpacity={(hour === 'night' ? 0.16 : hour === 'dusk' ? 0.5 : 0.55) * soften}
            />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          {glow ? (
            <RadialGradient
              id={`night${id}`}
              cx={glow.x}
              cy={glow.y}
              r={Math.max(width, height) * (lamp ? 0.62 : 0.8)}
              gradientUnits="userSpaceOnUse"
            >
              <Stop
                offset="0"
                stopColor={lamp ? '#FFD27A' : '#9FB8FF'}
                stopOpacity={0.3 * soften}
              />
              <Stop
                offset={lamp ? '0.16' : '0.1'}
                stopColor={lamp ? '#FFC870' : '#9FB8FF'}
                stopOpacity={0.08 * soften}
              />
              <Stop
                offset={lamp ? '0.34' : '0.22'}
                stopColor="#16204F"
                stopOpacity={0.2 * soften}
              />
              <Stop offset="0.7" stopColor="#141C48" stopOpacity={0.42 * soften} />
              <Stop offset="1" stopColor="#0F1538" stopOpacity={0.55 * soften} />
            </RadialGradient>
          ) : null}
        </Defs>
        {hour === 'night' ? (
          glow ? (
            <Rect x={0} y={0} width={width} height={height} fill={`url(#night${id})`} />
          ) : (
            <Rect x={0} y={0} width={width} height={height} fill="#2C40A0" opacity={0.3 * soften} />
          )
        ) : (
          // The whole room a shade warmer at dusk, a touch of cool blue in the fresh morning.
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={hour === 'dusk' ? '#FF8A3D' : '#9FD0FF'}
            opacity={(hour === 'dusk' ? 0.2 : 0.12) * soften}
          />
        )}
        {beam ? <Polygon points={beam} fill={`url(#beam${id})`} /> : null}
      </Svg>
      {hour === 'morning' && glass ? <Motes glass={glass} lean={lean} floorTop={floorTop} /> : null}
    </View>
  );
}

// Dust glinting in the morning light, drifting slowly down the beam.
const MOTES = [
  { at: 0.15, down: 0.3, ms: 5200 },
  { at: 0.45, down: 0.55, ms: 6400 },
  { at: 0.75, down: 0.2, ms: 5800 },
  { at: 0.3, down: 0.75, ms: 7000 },
  { at: 0.6, down: 0.4, ms: 6100 },
] as const;

function Motes({ glass, lean, floorTop }: { glass: Box; lean: number; floorTop: number }) {
  const drop = floorTop - glass.top;
  return (
    <>
      {MOTES.map((mote) => (
        <Mote
          key={mote.at}
          left={glass.left + mote.at * glass.width + mote.down * drop * lean}
          top={glass.top + mote.down * drop}
          ms={mote.ms}
        />
      ))}
    </>
  );
}

function Mote({ left, top, ms }: { left: number; top: number; ms: number }) {
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, ms]);
  return (
    <Animated.View
      style={[
        styles.mote,
        {
          left,
          top,
          opacity: drift.interpolate({
            inputRange: [0, 0.3, 0.5, 0.7, 1],
            outputRange: [0, 0.9, 0.3, 0.9, 0],
          }),
          transform: [
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
            {
              translateX: drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 5, 0] }),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  passThrough: {
    pointerEvents: 'none',
  },
  mote: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#FFFFFF',
  },
});
