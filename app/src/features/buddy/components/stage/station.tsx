import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { BuddyJob } from '../../api';
import { type Frame, PixelSprite } from '../../pixel/pixel-sprite';
import { PROP_PALETTE, type Station } from '../../pixel/sprites';
import { Arrive } from '../room-props';
import { FLOOR, STATION_LEFT } from './constants';

// A grown-up's station (JOB_STATIONS) on the left of the stage, drawn in parts: what stands behind
// the buddy, the station in front of it, what it holds at work, and the spot a tap sends it to work.

// Where a held tool goes in the buddy's box: smaller than its own size, its right edge (the handle)
// stays at the hand and its middle at the same height.
export function heldAt(held: NonNullable<Station['held']>, scale: number) {
  const width = held.frames[0][0].length;
  const height = held.frames[0].length;
  const own = scale * (held.size ?? 1);
  return {
    left: (held.col + width) * scale - width * own,
    top: held.row * scale + (height * (scale - own)) / 2,
  };
}

// What of the station stands behind the buddy (the gardener's lamp).
export function StationBehind({
  behind,
  job,
  cell,
  jobAtMount,
}: {
  behind: { frame: Frame; col: number };
  job: BuddyJob | null;
  cell: number;
  jobAtMount: BuddyJob | null;
}) {
  return (
    <View
      key={`behind${job}`}
      style={[
        styles.station,
        styles.passThrough,
        // Its last row below the floor line, like the station's own.
        { left: STATION_LEFT + behind.col * cell, bottom: FLOOR - cell },
      ]}
    >
      <Arrive fresh={job !== jobAtMount} width={behind.frame[0].length * cell}>
        <PixelSprite frame={behind.frame} palette={PROP_PALETTE} scale={cell} />
      </Arrive>
    </View>
  );
}

// The station stands in front of the buddy, whether it is working there or walking by.
export function StationFront({
  station,
  job,
  cell,
  jobAtMount,
  atWork,
  tick,
}: {
  station: Station;
  job: BuddyJob | null;
  cell: number;
  jobAtMount: BuddyJob | null;
  atWork: boolean;
  tick: number;
}) {
  return (
    <View
      key={job}
      style={[
        styles.station,
        styles.passThrough,
        { left: STATION_LEFT, bottom: FLOOR - station.sink * cell },
      ]}
    >
      <Arrive fresh={job !== jobAtMount} width={station.frames[0][0].length * cell}>
        <PixelSprite
          frame={station.frames[atWork ? tick % 2 : 0]}
          palette={PROP_PALETTE}
          scale={cell}
        />
      </Arrive>
    </View>
  );
}

// What it holds at work goes in front of the station too (the can over the plant's pot).
export function StationHeld({
  held,
  scale,
  workSway,
  spriteWidth,
  spriteHeight,
  x,
  rise,
  tick,
}: {
  held: NonNullable<Station['held']>;
  scale: number;
  workSway: number;
  spriteWidth: number;
  spriteHeight: number;
  x: Animated.Value;
  rise: Animated.AnimatedAddition<number>;
  tick: number;
}) {
  return (
    <Animated.View
      style={[
        styles.buddy,
        styles.passThrough,
        {
          bottom: FLOOR - scale,
          left: workSway,
          width: spriteWidth,
          height: spriteHeight,
          transform: [{ translateX: x }, { translateY: rise }],
        },
      ]}
    >
      <View style={[styles.jobProp, heldAt(held, scale)]}>
        <PixelSprite
          frame={held.frames[tick % 2]}
          palette={PROP_PALETTE}
          scale={scale * (held.size ?? 1)}
        />
      </View>
    </Animated.View>
  );
}

// A tap on the station sends the buddy to work there.
export function StationTap({
  station,
  cell,
  work,
  busy,
  buddyName,
}: {
  station: Station;
  cell: number;
  work: () => void;
  busy: boolean;
  buddyName: string;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={work}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={t('buddy.work', { buddy: buddyName })}
      style={[
        styles.station,
        {
          left: STATION_LEFT,
          bottom: FLOOR - station.sink * cell,
          width: station.frames[0][0].length * cell,
          height: station.frames[0].length * cell,
        },
      ]}
    />
  );
}

// Where the station's light shines from (room-light.tsx), and where it aims.
export function stationLight(station: Station, cell: number, height: number) {
  return station.light.onBehind && station.behind
    ? {
        x: STATION_LEFT + (station.behind.col + station.light.col) * cell,
        y: height - (FLOOR - cell) - (station.behind.frame.length - station.light.row) * cell,
        color: station.light.color,
        aim: station.light.aim
          ? {
              x: STATION_LEFT + station.light.aim.col * cell,
              y:
                height -
                (FLOOR - station.sink * cell) -
                (station.frames[0].length - station.light.aim.row) * cell,
            }
          : undefined,
      }
    : {
        x: STATION_LEFT + station.light.col * cell,
        y:
          height -
          (FLOOR - station.sink * cell) -
          (station.frames[0].length - station.light.row) * cell,
        color: station.light.color,
      };
}

const styles = StyleSheet.create({
  buddy: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  jobProp: {
    position: 'absolute',
  },
  station: {
    position: 'absolute',
  },
  passThrough: {
    pointerEvents: 'none',
  },
});
