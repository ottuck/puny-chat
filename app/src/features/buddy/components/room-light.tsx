import { useEffect, useId, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Mask,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { WINDOW_BARS, WINDOW_GLASS } from '../pixel/room';

// The light in the room by the hour (docs/fun-improvements.md, 방의 빛): one room, colored by the
// time instead of drawn again. Morning is fresh and a little blue, the sun slanting in through the
// window with motes of dust glinting in it; the day is as it is; at dusk the room
// keeps its colors while the window glows orange and throws shafts of light, bright where they land;
// at night it goes dark blue, and the standing lamp (or the moon at the window) lights it, softly,
// around itself. With the lamp on the moon still shines faintly at the window, and a grown-up's job
// station has a small light of its own on the left (sprites.ts, JOB_STATIONS). Over the room and the buddy; under the name, the buttons and the notes.

const NATIVE_DRIVER = Platform.OS !== 'web';
// A job station's small light at night: how far it clears the dark, and its round glow; and how far
// around what an aimed one shines on.
const STATION_REACH = 110;
const STATION_HALO = 30;
const AIMED_REACH = 70;

// A beam from `from` to `to`: narrow at the lamp, wide where it lands.
function beam(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const near = 4;
  const far = Math.min(40, length * 0.55);
  return [
    `${from.x + nx * near},${from.y + ny * near}`,
    `${to.x + nx * far},${to.y + ny * far}`,
    `${to.x - nx * far},${to.y - ny * far}`,
    `${from.x - nx * near},${from.y - ny * near}`,
  ].join(' ');
}
// The window's panes, in the glass's cells (room.ts, WINDOW_GLASS and WINDOW_BARS): three, either
// side of the two thin bars down the glass.
const GLASS_CELLS = WINDOW_GLASS.cols;
const PANES = [
  [0, WINDOW_BARS.cols[0] - 0.3],
  [WINDOW_BARS.cols[0] + 0.3, WINDOW_BARS.cols[1] - 0.3],
  [WINDOW_BARS.cols[1] + 0.3, WINDOW_GLASS.cols],
] as const;

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
  station = null,
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
  // The job station's small light at night, if there is a station; `aim`: where it is turned to,
  // a beam falls there and lights it (the gardener's lamp on the plant).
  station?: { x: number; y: number; color: string; aim?: { x: number; y: number } } | null;
  // Dark mode: the stage is dark already, the light goes easier on it.
  dark: boolean;
}) {
  // Ids for the gradients, the stage's own (on the web they are ids in the page).
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (hour === 'day' || width === 0) return null;
  const soften = dark ? 0.6 : 1;
  // The window's light falls toward the floor in straight shafts, one through each pane (the
  // mullion between them leaves a strip of shade), leaning away from the sun: right in the morning,
  // left at dusk. Where it reaches the floor it lies there as a patch.
  const lean = hour === 'morning' ? 0.55 : -0.45;
  const shafts: string[] = [];
  const patches: string[] = [];
  if (glass) {
    const cell = glass.width / GLASS_CELLS;
    const drop = floorTop - glass.top;
    const dx = drop * lean;
    const ddx = (height - floorTop) * lean;
    for (const [from, to] of PANES) {
      const x1 = glass.left + from * cell;
      const x2 = glass.left + to * cell;
      shafts.push(
        `${x1},${glass.top} ${x2},${glass.top} ${x2 + dx},${floorTop} ${x1 + dx},${floorTop}`,
      );
      patches.push(
        `${x1 + dx},${floorTop} ${x2 + dx},${floorTop} ${x2 + dx + ddx},${height} ${x1 + dx + ddx},${height}`,
      );
    }
  }
  const beamStops: [string, string, number][] =
    hour === 'dusk'
      ? [
          ['0', '#FFD08A', 0.5],
          ['1', '#FFB866', 0.14],
        ]
      : [
          ['0', hour === 'morning' ? '#F2FAFF' : '#BFD3FF', hour === 'night' ? 0.16 : 0.55],
          ['1', '#FFFFFF', 0],
        ];
  // At night the light comes from the lamp, or else faintly from the moon at the window.
  const glow =
    lamp ?? (glass ? { x: glass.left + glass.width / 2, y: glass.top + glass.height / 2 } : null);
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      <Svg width={width} height={height}>
        <Defs>
          {/* In the morning the light thins out toward the floor; at dusk it stays strong. */}
          <LinearGradient id={`beam${id}`} x1="0" y1="0" x2="0" y2="1">
            {beamStops.map(([offset, color, opacity]) => (
              <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity * soften} />
            ))}
          </LinearGradient>
          {/* The sunset glowing on the wall around the window. */}
          {glass ? (
            <RadialGradient
              id={`sunset${id}`}
              cx={glass.left + glass.width / 2}
              cy={glass.top + glass.height / 2}
              r={glass.width * 1.5}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFB060" stopOpacity={0.45 * soften} />
              <Stop offset="0.45" stopColor="#FFB868" stopOpacity={0.16 * soften} />
              <Stop offset="1" stopColor="#FFC27A" stopOpacity={0} />
            </RadialGradient>
          ) : null}
          {/* The moon at the window, faint beside the lamp's light. */}
          {lamp && glass ? (
            <RadialGradient
              id={`moon${id}`}
              cx={glass.left + glass.width / 2}
              cy={glass.top + glass.height / 2}
              r={glass.width * 0.9}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#C4D6FF" stopOpacity={0.24 * soften} />
              <Stop offset="0.5" stopColor="#9FB8FF" stopOpacity={0.09 * soften} />
              <Stop offset="1" stopColor="#9FB8FF" stopOpacity={0} />
            </RadialGradient>
          ) : null}
          {/* The station's light clears the night around it, as the lamp's does: the dark is
              masked away there, so the things nearby show in their own colors. */}
          {station ? (
            <>
              <RadialGradient
                id={`hole${id}`}
                cx={station.x}
                cy={station.y}
                r={STATION_REACH}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor="#000000" stopOpacity={1} />
                <Stop offset="0.35" stopColor="#000000" stopOpacity={0.85} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0} />
              </RadialGradient>
              {station.aim ? (
                <RadialGradient
                  id={`aimed${id}`}
                  cx={station.aim.x}
                  cy={station.aim.y}
                  r={AIMED_REACH}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor="#000000" stopOpacity={0.9} />
                  <Stop offset="0.5" stopColor="#000000" stopOpacity={0.6} />
                  <Stop offset="1" stopColor="#000000" stopOpacity={0} />
                </RadialGradient>
              ) : null}
              <Mask
                id={`lit${id}`}
                x={0}
                y={0}
                width={width}
                height={height}
                maskUnits="userSpaceOnUse"
              >
                <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
                <Rect x={0} y={0} width={width} height={height} fill={`url(#hole${id})`} />
                {station.aim ? (
                  <Rect x={0} y={0} width={width} height={height} fill={`url(#aimed${id})`} />
                ) : null}
              </Mask>
            </>
          ) : null}
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
          <>
            {glow ? (
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={`url(#night${id})`}
                mask={station ? `url(#lit${id})` : undefined}
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="#2C40A0"
                opacity={0.3 * soften}
                mask={station ? `url(#lit${id})` : undefined}
              />
            )}
            {lamp && glass ? (
              <Rect x={0} y={0} width={width} height={height} fill={`url(#moon${id})`} />
            ) : null}
            {station?.aim ? (
              // The beam from the lamp to what it lights, widening as it goes.
              <Polygon points={beam(station, station.aim)} fill={station.color} opacity={0.22} />
            ) : null}
            {station ? (
              // A clear round glow in the light's color, like the lamp's, and its bright middle.
              <>
                <Circle
                  cx={station.x}
                  cy={station.y}
                  r={STATION_HALO}
                  fill={station.color}
                  opacity={0.3}
                />
                <Circle
                  cx={station.x}
                  cy={station.y}
                  r={STATION_HALO * 0.45}
                  fill={station.color}
                  opacity={0.35}
                />
              </>
            ) : null}
          </>
        ) : hour === 'dusk' ? (
          // At dusk the room keeps its own colors, only a breath warmer; the glow around the window
          // and the light it throws stand out against them.
          <Rect x={0} y={0} width={width} height={height} fill="#FFE2C2" opacity={0.1 * soften} />
        ) : (
          // A touch of cool blue in the fresh morning.
          <Rect x={0} y={0} width={width} height={height} fill="#9FD0FF" opacity={0.12 * soften} />
        )}
        {shafts.map((points) => (
          <Polygon key={points} points={points} fill={`url(#beam${id})`} />
        ))}
        {hour === 'dusk' && glass ? (
          <Rect x={0} y={0} width={width} height={height} fill={`url(#sunset${id})`} />
        ) : null}
        {hour === 'dusk'
          ? patches.map((points) => (
              <Polygon key={points} points={points} fill="#FFAD52" opacity={0.6 * soften} />
            ))
          : null}
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
