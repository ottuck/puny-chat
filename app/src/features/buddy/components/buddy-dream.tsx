import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuddyJob, BuddyView } from '../api';
import type { Season } from '../pixel/looks';
import { PixelSprite } from '../pixel/pixel-sprite';
import { PROP_PALETTE, SPARKLE } from '../pixel/sprites';
import { BathStage } from './bath-stage';
import { BuddyStage, type Cue } from './buddy-stage';

// A dream of the future (docs/fun-improvements.md, 미래의 꿈): before the egg is shown, a few quick
// cuts of what it may grow into, each a different job and a different day. buddy-scene.tsx plays it
// each time it opens on an egg, like a game's opening, and then opens on the egg with the iris. A tap skips it. Quick and
// lively rather than hazy: each cut comes in with a flash and a little punch, a second and a half
// each, about ten seconds in all with the iris.

type Cut = { job: BuddyJob | null; season: Season | null; cue: Cue['kind'] | null; bath?: boolean };
// Through a year: two jobs, then spring, Halloween and Christmas (no job: its things would hide the
// season's), then the hot spring.
const CUTS: readonly Cut[] = [
  { job: 'BARISTA', season: null, cue: 'dance' },
  { job: 'WRITER', season: null, cue: 'love' },
  { job: null, season: 'SPRING', cue: 'butterfly' },
  { job: null, season: 'HALLOWEEN', cue: 'laugh' },
  { job: null, season: 'CHRISTMAS', cue: 'snow' },
  { job: 'CHEF', season: null, cue: null, bath: true },
];
const CUT_MS = 1500;
const NATIVE_DRIVER = Platform.OS !== 'web';
// A cue given with the stage is not news to it (buddy-stage.tsx), and the buddy must be in place
// first: it comes just after.
const CUE_DELAY_MS = 150;
const noop = () => {};

// Sparkles twinkling in the corners, by turns.
const TWINKLES = [
  { top: 10, left: 14, phase: 0 },
  { top: 18, right: 16, phase: 1 },
  { bottom: 40, left: 22, phase: 1 },
  { bottom: 52, right: 26, phase: 0 },
] as const;
const TWINKLE_MS = 260;

function Twinkles() {
  const [on, setOn] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setOn((n) => n + 1), TWINKLE_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      {TWINKLES.map(({ phase, ...at }, i) => (
        <View key={i} style={[styles.twinkle, at, { opacity: (on + phase) % 2 === 0 ? 1 : 0.25 }]}>
          <PixelSprite
            frame={SPARKLE}
            palette={PROP_PALETTE}
            scale={(on + phase) % 2 === 0 ? 4 : 3}
          />
        </View>
      ))}
    </>
  );
}

export const DREAM_CUTS = CUTS.length;

export function BuddyDream({
  buddy,
  height,
  onEnd,
  hold,
}: {
  // The real buddy, an egg still: the dream keeps its name.
  buddy: BuddyView;
  height: number;
  // The last cut is over, or it was tapped.
  onEnd: () => void;
  // Stays on this cut (the art preview, to look at one).
  hold?: number;
}) {
  const { t } = useTranslation();
  const [playing, setIndex] = useState(0);
  const index = hold ?? playing;
  const [cue, setCue] = useState<Cue | null>(null);
  const ended = useRef(false);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    end.current();
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  const cut = CUTS[index];
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const kind = CUTS[index].cue;
    const timers = [setTimeout(() => kind && setCue({ id: `dream-${index}`, kind }), CUE_DELAY_MS)];
    if (hold === undefined) {
      timers.push(
        setTimeout(() => {
          if (index + 1 < CUTS.length) setIndex(index + 1);
          else finishRef.current();
        }, CUT_MS),
      );
    }
    // In with a flash and a little punch.
    pop.setValue(0);
    const punch = Animated.timing(pop, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: NATIVE_DRIVER,
    });
    punch.start();
    return () => {
      timers.forEach(clearTimeout);
      punch.stop();
    };
  }, [index, pop, hold]);

  const grown = useMemo<BuddyView>(
    () => ({
      ...buddy,
      level: 20,
      stage: 'ADULT',
      levelProgress: 0.5,
      fullness: 100,
      poops: 0,
      hungry: false,
      canFeed: false,
      canClean: false,
      grown: false,
      togetherToday: false,
      job: cut.job,
      leaning: null,
      canChangeJob: false,
      jobChangeAt: null,
    }),
    [buddy, cut.job],
  );

  return (
    <View style={{ height }}>
      <Animated.View
        style={{
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }],
        }}
      >
        {cut.bath ? (
          <BathStage key={index} buddy={grown} height={height} corner={null} />
        ) : (
          <BuddyStage
            key={index}
            bare
            dream
            buddy={grown}
            busy={false}
            height={height}
            onFeed={noop}
            onClean={noop}
            onWork={noop}
            onOpenDetail={noop}
            reaction={null}
            greets={false}
            cue={cue?.id === `dream-${index}` ? cue : null}
            season={cut.season}
          />
        )}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.flash,
          {
            opacity: pop.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.85, 0.1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Twinkles />
      </View>
      <Pressable
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel={t('buddy.dream.skip')}
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.caption}>
          <Text style={styles.captionText}>{t('buddy.dream.caption')}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flash: {
    backgroundColor: '#FFFFFF',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 10,
    alignItems: 'center',
  },
  twinkle: {
    position: 'absolute',
  },
  captionText: {
    color: '#5A4E6E',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
