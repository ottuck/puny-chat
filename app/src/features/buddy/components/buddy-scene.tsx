import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { useColors } from '@/theme';

import type { BuddyView } from '../api';
import { BATH_ICON, BATH_PALETTE, HOME_ICON } from '../pixel/bath';
import { isWinter } from '../pixel/looks';
import { PixelSprite } from '../pixel/pixel-sprite';
import { buddyFrame } from '../pixel/sprites';
import type { Reaction } from '../reactions';
import { BathStage } from './bath-stage';
import { BuddyDream } from './buddy-dream';
import { BuddyStage, CORNER_SIZE, FLOOR, gridScale, useSleeping } from './buddy-stage';
import { Iris, type IrisRun } from './iris';

// The buddy's stage with its other scenes (docs/fun-improvements.md, 목욕·미래의 꿈), changed with an
// iris: home, the hot spring, and once, before the first egg, a dream of what it may become.
//
// The bath is this device's alone (the partner still sees the buddy at home). It goes back home only
// when asked or after ten minutes, never because of something in the room: meanwhile the bath shows
// the buddy as it came, and what happened is in the chat. Back home it catches up: a level up, or the
// evolution, plays there once the iris opens.

const BATH_MAX_MS = 10 * 60_000;
const DREAM_SEEN_KEY = 'buddy-dream-seen';

type Props = ComponentProps<typeof BuddyStage> & {
  // Plays the dream before the first egg (the real room only, not the tour). 'always': right away,
  // whatever it is and whether it was seen (the art preview).
  dreams?: boolean | 'always';
  // While the dream is on (the guide banner waits for it).
  onDreaming?: (dreaming: boolean) => void;
  // Opens in the bath (the art preview's link, for pictures of it).
  startInBath?: boolean;
};

function CornerButton({
  icon,
  label,
  onPress,
}: {
  icon: typeof BATH_ICON;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <PixelSprite frame={icon} palette={BATH_PALETTE} scale={2} />
    </Pressable>
  );
}

export function BuddyScene({ dreams = false, onDreaming, startInBath = false, ...props }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const { buddy, height, reaction: latest } = props;
  const [width, setWidth] = useState(0);
  const [iris, setIris] = useState<IrisRun | null>(null);
  const runs = useRef(0);
  const [place, setPlace] = useState<'home' | 'bath'>(startInBath ? 'bath' : 'home');
  // The buddy as it came to the bath: the bath shows it, and home does too until the iris opens.
  const [kept, setKept] = useState<BuddyView | null>(startInBath ? props.buddy : null);
  // What home plays once the iris opens on the way back: a level up or an evolution missed.
  const [caughtUp, setCaughtUp] = useState<{ reaction: Reaction; after?: string } | null>(null);
  const night = useSleeping(buddy.job);
  // Where the buddy is at home, to close the iris on it; and where it closes this time.
  const buddyAt = useRef<number | null>(null);
  const onWalk = useCallback((middle: number) => {
    buddyAt.current = middle;
  }, []);
  const [focusX, setFocusX] = useState<number | null>(null);

  // The dream: only for an egg, only once on this device.
  const egg = buddy.stage === 'EGG';
  const [dream, setDream] = useState<'checking' | 'playing' | 'over'>(
    dreams === 'always' ? 'playing' : dreams && egg ? 'checking' : 'over',
  );
  useEffect(() => {
    if (dream !== 'checking') return;
    let cancelled = false;
    AsyncStorage.getItem(DREAM_SEEN_KEY)
      .catch(() => '1')
      .then((seen) => !cancelled && setDream(seen ? 'over' : 'playing'));
    return () => {
      cancelled = true;
    };
  }, [dream]);
  const dreaming = dream !== 'over';
  useEffect(() => {
    onDreaming?.(dreaming);
  }, [dreaming, onDreaming]);

  const run = (onCovered: () => void, onDone?: () => void) => {
    runs.current += 1;
    setIris({
      id: runs.current,
      onCovered,
      onDone: () => {
        setIris(null);
        onDone?.();
      },
    });
  };
  const wakeUp = () => {
    if (iris) return;
    AsyncStorage.setItem(DREAM_SEEN_KEY, '1').catch(() => {});
    run(() => setDream('over'));
  };
  // Something happened in the room during the dream (the egg hatching, say): it ends there.
  const [dreamFrom] = useState(latest?.id);
  const interrupted = dream === 'playing' && !!latest && latest.id !== dreamFrom;
  const wake = useRef(wakeUp);
  useEffect(() => {
    wake.current = wakeUp;
  });
  useEffect(() => {
    if (interrupted) wake.current();
  }, [interrupted]);

  const goHome = () => {
    if (iris || place !== 'bath') return;
    // The tub is in the middle.
    setFocusX(null);
    run(
      () => setPlace('home'),
      () => {
        if (kept) {
          const missed: Reaction['kind'] | null =
            kept.stage !== buddy.stage ? 'evolved' : kept.level !== buddy.level ? 'levelUp' : null;
          if (missed) {
            setCaughtUp({
              reaction: { id: `back-${runs.current}`, kind: missed },
              after: latest?.id,
            });
          }
        }
        setKept(null);
      },
    );
  };
  const toBath = () => {
    if (iris) return;
    setFocusX(buddyAt.current);
    run(() => {
      setKept(buddy);
      setCaughtUp(null);
      setPlace('bath');
    });
  };
  // Ten minutes in the water is plenty.
  const home = useRef(goHome);
  useEffect(() => {
    home.current = goHome;
  });
  useEffect(() => {
    if (place !== 'bath') return;
    const timer = setTimeout(() => home.current(), BATH_MAX_MS);
    return () => clearTimeout(timer);
  }, [place]);

  // The catch-up plays until something newer comes from the room.
  const reaction = caughtUp && latest?.id === caughtUp.after ? caughtUp.reaction : latest;
  const shown = kept ?? buddy;
  // Where the iris closes: about where the buddy is.
  const grid = buddyFrame(shown.stage, 'idle');
  const spriteHeight = grid.length * gridScale(height, grid.length);
  const focus = { x: focusX ?? width / 2, y: height - FLOOR - spriteHeight / 2 };
  const canBathe = !egg && !night && !dreaming;

  let scene;
  if (dream === 'checking') {
    scene = <View style={{ height, backgroundColor: colors.stage }} />;
  } else if (dream === 'playing') {
    scene = <BuddyDream buddy={buddy} height={height} onEnd={wakeUp} />;
  } else if (place === 'bath' && kept) {
    scene = (
      <BathStage
        buddy={kept}
        height={height}
        // In winter it snows on the bath; the preview's Christmas stands for winter.
        snowing={props.season !== undefined ? props.season === 'CHRISTMAS' : isWinter(new Date())}
        corner={<CornerButton icon={HOME_ICON} label={t('buddy.bath.home')} onPress={goHome} />}
      />
    );
  } else {
    scene = (
      <BuddyStage
        {...props}
        bare
        onWalk={onWalk}
        buddy={shown}
        reaction={reaction}
        corner={
          canBathe ? (
            <CornerButton icon={BATH_ICON} label={t('buddy.bath.go')} onPress={toBath} />
          ) : undefined
        }
      />
    );
  }

  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {scene}
      <Iris run={iris} width={width} height={height} focus={focus} spot={spriteHeight * 0.62} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  button: {
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
