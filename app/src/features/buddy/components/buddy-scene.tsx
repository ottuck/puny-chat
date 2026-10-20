import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { useColors } from '@/theme';

import type { AlbumEntry } from '@/features/room/api';

import type { BuddyJob, BuddyView } from '../api';
import { type Situation, useMailbox } from '@/features/mailbox/mail';
import { MailboxSheet } from '@/features/mailbox/mailbox-sheet';
import type { PushState } from '@/features/notifications/push';

import { ALBUM_ICON, BATH_ICON, BATH_PALETTE, HOME_ICON, MAIL_ICON } from '../pixel/bath';
import { dressedFrame, isWinter } from '../pixel/looks';
import { PixelSprite } from '../pixel/pixel-sprite';
import { BUDDY_PALETTE, buddyFrame } from '../pixel/sprites';
import type { Reaction } from '../reactions';
import { AlbumGallery } from './album-gallery';
import { BathStage } from './bath-stage';
import { BuddyDream } from './buddy-dream';
import {
  BuddyStage,
  CORNER_SIZE,
  FLOOR,
  gridScale,
  LEAVE_WAVE_MS,
  useSleeping,
} from './buddy-stage';
import { Iris, type IrisRun } from './iris';

// The buddy's stage with its other scenes (docs/fun-improvements.md, 목욕·미래의 꿈), changed with an
// iris: home, the hot spring, and once, before the first egg, a dream of what it may become.
//
// The bath is this device's alone (the partner still sees the buddy at home); only the EXP for going
// after a while is the room's (`onBathe`, the server decides). It goes back home only
// when asked or after ten minutes, never because of something in the room: meanwhile the bath shows
// the buddy as it came, and what happened is in the chat. Back home it catches up: a level up, or the
// evolution, plays there once the iris opens.
//
// When the buddy goes its own way it moves out: it waves with its things in a bundle on its back and
// walks off, the iris closes, and it opens on the bare room, where its photo pops up and flies into
// the memory album's frame in the corner; then the new egg arrives in its rings of light. The album's
// button calls (a dot, a little shake) until the newest photo has been seen on this device.

const BATH_MAX_MS = 10 * 60_000;
const DREAM_SEEN_KEY = 'buddy-dream-seen';
// The newest photo seen in the album on this device (its graduatedAt).
const ALBUM_SEEN_KEY = 'buddy-album-seen';
// The wave, and the walk out of the room.
const MOVE_OUT_MS = LEAVE_WAVE_MS + 1600;

type Props = ComponentProps<typeof BuddyStage> & {
  // Plays the dream before the first egg (the real room only, not the tour). 'always': right away,
  // whatever it is and whether it was seen (the art preview).
  dreams?: boolean | 'always';
  // While the dream is on (the guide banner waits for it).
  onDreaming?: (dreaming: boolean) => void;
  // Opens in the bath (the art preview's link, for pictures of it).
  startInBath?: boolean;
  // Whether it snows on the hot spring, instead of by the season (the preview).
  bathSnow?: boolean;
  // On the way to the bath, once it is there: EXP if it has been a while.
  onBathe?: () => void;
  // Buddies gone their own way: the album's button sits beside the bath's once there are any.
  album?: AlbumEntry[];
  // A new value opens the album (the chat's card for a buddy gone its own way).
  albumRequest?: string | null;
  // A new value opens the mailbox (the chat's card for the top level: its letter is there).
  mailRequest?: string | null;
  // The account and device now, for the mail that is only for that (docs/fun-improvements.md, 우편함).
  situation?: Situation;
  onTurnOnPush?: () => Promise<PushState>;
  // Who I am: the letters a writer buddy wrote me come to my mailbox (docs/fun-improvements.md, 직업 선물).
  myId?: string;
  // And my name, for "To." on its letters.
  myName?: string;
};

const NATIVE_DRIVER = Platform.OS !== 'web';

function CornerButton({
  icon,
  label,
  onPress,
  badge = false,
}: {
  icon: typeof BATH_ICON;
  label: string;
  onPress: () => void;
  // Something new inside (unread mail): a dot in its corner, and every few seconds the button
  // drops a little, as if a letter just fell in, and shakes, until it is read. Down rather than up:
  // it sits at the stage's top edge, which clips.
  badge?: boolean;
}) {
  const colors = useColors();
  const [jump] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!badge) return;
    const step = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        step(jump, 1, 160),
        step(shake, -1, 70),
        step(shake, 1, 90),
        step(shake, -1, 90),
        step(shake, 1, 90),
        step(shake, 0, 70),
        step(jump, 0, 200),
        Animated.delay(1600),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      jump.setValue(0);
      shake.setValue(0);
    };
  }, [badge, jump, shake]);
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: jump.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) },
          { scale: jump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
          { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <PixelSprite frame={icon} palette={BATH_PALETTE} scale={2} />
        {badge ? <View style={[styles.badge, { borderColor: colors.surface }]} /> : null}
      </Pressable>
    </Animated.View>
  );
}

// The photo of a buddy that just moved out: it pops up in the middle of the empty room in a pastel
// frame, holds a beat, then arcs up into the album's frame in the corner, shrinking as it goes.
const PHOTO_PICTURE = 46;
function PhotoFlight({
  job,
  from,
  to,
  onDone,
}: {
  job: BuddyJob | null;
  from: { x: number; y: number };
  to: { x: number; y: number };
  onDone: () => void;
}) {
  const colors = useColors();
  const [pop] = useState(() => new Animated.Value(0));
  const [fly] = useState(() => new Animated.Value(0));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.spring(pop, {
        toValue: 1,
        friction: 5,
        tension: 110,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.delay(500),
      Animated.timing(fly, {
        toValue: 1,
        duration: 650,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);
    anim.start(({ finished }) => finished && done.current());
    return () => anim.stop();
  }, [pop, fly]);
  const frame = dressedFrame('ADULT', 'happy', job, null);
  const scale = PHOTO_PICTURE / frame[0].length;
  const size = PHOTO_PICTURE + 14;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.photo,
        {
          left: from.x - size / 2,
          top: from.y - size / 2,
          width: size,
          opacity: fly.interpolate({ inputRange: [0, 0.92, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
            {
              translateY: fly.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, dy * 0.5 - 24, dy],
              }),
            },
            {
              scale: Animated.multiply(
                pop,
                fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }),
              ),
            },
            {
              rotate: fly.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '10deg'] }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.photoPicture, { backgroundColor: colors.stage }]}>
        <PixelSprite frame={frame} palette={BUDDY_PALETTE} scale={scale} smooth />
      </View>
    </Animated.View>
  );
}

export function BuddyScene({
  dreams = false,
  onDreaming,
  startInBath = false,
  bathSnow,
  onBathe,
  album = [],
  albumRequest = null,
  mailRequest = null,
  situation,
  onTurnOnPush,
  myId,
  myName,
  ...props
}: Props) {
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
  const night = useSleeping(buddy.job, props.hour);
  // Where the buddy is at home, to close the iris on it; and where it closes this time.
  const buddyAt = useRef<number | null>(null);
  const onWalk = useCallback((middle: number) => {
    buddyAt.current = middle;
  }, []);
  const [focusX, setFocusX] = useState<number | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  // A photo not yet seen in the album; undefined until read.
  const newestPhoto = album.length > 0 ? album[album.length - 1].graduatedAt : null;
  const [albumSeen, setAlbumSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ALBUM_SEEN_KEY)
      .then((value) => !cancelled && setAlbumSeen(value))
      .catch(() => !cancelled && setAlbumSeen(null));
    return () => {
      cancelled = true;
    };
  }, []);
  const newPhoto =
    albumSeen !== undefined && newestPhoto !== null && (!albumSeen || newestPhoto > albumSeen);
  const openAlbum = useCallback(() => {
    setGalleryOpen(true);
    if (!newestPhoto) return;
    setAlbumSeen(newestPhoto);
    AsyncStorage.setItem(ALBUM_SEEN_KEY, newestPhoto).catch(() => {});
  }, [newestPhoto]);
  const opening = useRef(openAlbum);
  useEffect(() => {
    opening.current = openAlbum;
  });
  useEffect(() => {
    if (!albumRequest) return;
    const timer = setTimeout(() => opening.current(), 0);
    return () => clearTimeout(timer);
  }, [albumRequest]);
  // The photo of the buddy that just moved out, on its way to the album.
  const [flight, setFlight] = useState<{
    id: number;
    job: BuddyJob | null;
    landed: () => void;
  } | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const myGifts = useMemo(
    () => (buddy.gifts ?? []).filter((gift) => gift.to === myId),
    [buddy.gifts, myId],
  );
  const mailbox = useMailbox(buddy.level, situation, album.length, myGifts);
  useEffect(() => {
    if (!mailRequest) return;
    const timer = setTimeout(() => setMailOpen(true), 0);
    return () => clearTimeout(timer);
  }, [mailRequest]);

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

  // Moving out: an egg in place of a hatched buddy means it went its own way.
  const [seen, setSeen] = useState(buddy);
  const [moving, setMoving] = useState<BuddyView | null>(null);
  if (
    buddy.stage !== seen.stage ||
    buddy.level !== seen.level ||
    buddy.job !== seen.job ||
    buddy.name !== seen.name
  ) {
    if (seen.stage !== 'EGG' && egg && place === 'home' && !dreaming) setMoving(seen);
    setSeen(buddy);
  }
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
      // Asked once it is there, so a level up from it waits for the way back like any other.
      onBathe?.();
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

  const moveIn = () => {
    const leaving = moving;
    setFocusX(null);
    run(
      () => setMoving(null),
      () => {
        // Its photo goes into the album first; then the new egg arrives in its rings of light.
        const after = latest?.id;
        const rings = () =>
          setCaughtUp({ reaction: { id: `moved-${runs.current}`, kind: 'evolved' }, after });
        if (!leaving) return rings();
        setFlight({ id: runs.current, job: leaving.job, landed: rings });
      },
    );
  };
  const movedOut = useRef(moveIn);
  useEffect(() => {
    movedOut.current = moveIn;
  });
  useEffect(() => {
    if (!moving) return;
    const timer = setTimeout(() => movedOut.current(), MOVE_OUT_MS);
    return () => clearTimeout(timer);
  }, [moving]);

  // The catch-up plays until something newer comes from the room.
  const reaction = caughtUp && latest?.id === caughtUp.after ? caughtUp.reaction : latest;
  const shown = kept ?? buddy;
  // Where the iris closes: about where the buddy is.
  const grid = buddyFrame(shown.stage, 'idle');
  const spriteHeight = grid.length * gridScale(height, grid.length);
  const focus = { x: focusX ?? width / 2, y: height - FLOOR - spriteHeight / 2 };
  const canBathe = !egg && !night && !dreaming && !moving;
  const hasAlbum = album.length > 0 && !dreaming && !moving;

  let scene;
  if (dream === 'checking') {
    scene = <View style={{ height, backgroundColor: colors.stage }} />;
  } else if (dream === 'playing') {
    scene = <BuddyDream buddy={buddy} height={height} onEnd={wakeUp} />;
  } else if (moving) {
    scene = (
      <BuddyStage
        {...props}
        key="moving"
        bare
        leaving
        buddy={moving}
        reaction={null}
        corner={undefined}
      />
    );
  } else if (place === 'bath' && kept) {
    scene = (
      <BathStage
        buddy={kept}
        height={height}
        // In winter it snows on the bath; the preview's Christmas stands for winter.
        snowing={
          bathSnow ??
          (props.season !== undefined ? props.season === 'CHRISTMAS' : isWinter(new Date()))
        }
        corner={<CornerButton icon={HOME_ICON} label={t('buddy.bath.home')} onPress={goHome} />}
      />
    );
  } else {
    scene = (
      <BuddyStage
        {...props}
        key="home"
        bare
        onWalk={onWalk}
        buddy={shown}
        reaction={reaction}
        onOpenMail={() => setMailOpen(true)}
        corners={1 + (canBathe ? 1 : 0) + (hasAlbum ? 1 : 0)}
        corner={
          <View style={styles.corners}>
            {/* The mailbox is always there: news may come any time. */}
            <CornerButton
              icon={MAIL_ICON}
              label={t('mailbox.open')}
              badge={mailbox.unread > 0}
              onPress={() => setMailOpen(true)}
            />
            {hasAlbum ? (
              <CornerButton
                icon={ALBUM_ICON}
                label={t('buddy.album.open')}
                badge={newPhoto && !flight}
                onPress={openAlbum}
              />
            ) : null}
            {canBathe ? (
              <CornerButton icon={BATH_ICON} label={t('buddy.bath.go')} onPress={toBath} />
            ) : null}
          </View>
        }
      />
    );
  }

  return (
    <View
      style={[styles.frame, { height, borderColor: colors.stageLine }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {scene}
      {flight && width > 0 ? (
        <PhotoFlight
          key={flight.id}
          job={flight.job}
          from={{ x: width / 2, y: (height - FLOOR) / 2 }}
          // The album's frame: the last corner button while there is an egg (no bath button yet).
          to={{ x: width - 6 - CORNER_SIZE / 2, y: 4 + CORNER_SIZE / 2 }}
          onDone={() => {
            setFlight(null);
            flight.landed();
          }}
        />
      ) : null}
      <Iris run={iris} width={width} height={height} focus={focus} spot={spriteHeight * 0.62} />
      <AlbumGallery visible={galleryOpen} album={album} onClose={() => setGalleryOpen(false)} />
      <MailboxSheet
        visible={mailOpen}
        mails={mailbox.mails}
        read={mailbox.read}
        onClose={() => setMailOpen(false)}
        guest={situation?.guestDaysLeft != null}
        onTurnOnPush={onTurnOnPush}
        onGraduate={buddy.grown ? props.onOpenDetail : undefined}
        buddyName={buddy.name}
        myName={myName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Edge to edge with a line under it: the room holds its part of the screen and the chat
  // starts below, instead of a card the messages seem to slide under.
  // Edge to edge, closed at the bottom by the floor's own line color (a hairline in the border
  // color disappeared at night); StageShade lays a soft shadow under it.
  frame: {
    borderBottomWidth: 2,
    overflow: 'hidden',
  },
  corners: {
    flexDirection: 'row',
    gap: 6,
  },
  // A small framed photo, as in the album (album-gallery.tsx), in its pastel yellow.
  photo: {
    position: 'absolute',
    padding: 4,
    paddingBottom: 10,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#FFC86B',
    backgroundColor: '#FFFDF8',
    zIndex: 3,
  },
  photoPicture: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: '#FF5A5F',
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
