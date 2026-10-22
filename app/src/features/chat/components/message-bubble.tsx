import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

import { type MessageReaction, REACTION_EMOJI } from '../types';

// Where the bubble is on screen, for the reaction picker to open next to it.
export type BubbleRect = { x: number; y: number; width: number; height: number };

// Reactions sit in a row of chips under the bubble; the time beside the bubble moves up as much.
const CHIP_HEIGHT = 24;
const CHIP_GAP = 4;
// A chip taken off slides this far outwards while it fades, and the others close up behind it.
const CHIP_LEAVE_SLIDE = 16;
const CHIP_LEAVE_MS = 220;

// A photo keeps its shape inside this box. Only a very long strip is cut, to stay PHOTO_MIN thick.
const PHOTO_MAX_WIDTH = 220;
const PHOTO_MAX_HEIGHT = 280;
const PHOTO_MIN = 40;

export type BubblePhoto = { uri: string; width: number; height: number };

function photoBox({ width, height }: BubblePhoto) {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const scale = Math.min(PHOTO_MAX_WIDTH / w, PHOTO_MAX_HEIGHT / h);
  return {
    width: Math.max(PHOTO_MIN, Math.round(w * scale)),
    height: Math.max(PHOTO_MIN, Math.round(h * scale)),
  };
}

type Props = {
  // A text message has text, a photo message a photo.
  text?: string;
  photo?: BubblePhoto;
  // A tap on the photo: show it across the screen.
  onOpenPhoto?: () => void;
  mine: boolean;
  // Formatted time, shown only on the last message of a consecutive run.
  time?: string;
  status?: 'sending' | 'failed';
  // "Read", on my newest message the partner has seen.
  receipt?: string;
  onRetry?: () => void;
  // User id → reaction, and whose this device is (to mark my own).
  reactions?: Record<string, MessageReaction>;
  myId?: string;
  // Long press (or someone else's reaction chip): open the reaction picker. Absent while the
  // message is unconfirmed.
  onReact?: (rect: BubbleRect) => void;
  // A tap on my own reaction chip takes my reaction off.
  onUnreact?: () => void;
};

export function MessageBubble({
  text,
  photo,
  onOpenPhoto,
  mine,
  time,
  status,
  receipt,
  onRetry,
  reactions,
  myId,
  onReact,
  onUnreact,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const bubbleRef = useRef<View>(null);
  const chips = useChips(reactionChips(reactions, myId));
  const openPicker = () =>
    bubbleRef.current?.measureInWindow((x, y, width, height) => onReact?.({ x, y, width, height }));

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.column, mine ? styles.columnMine : styles.columnTheirs]}>
        <Pressable
          ref={bubbleRef}
          onPress={photo ? onOpenPhoto : undefined}
          onLongPress={onReact ? openPicker : undefined}
          delayLongPress={350}
          disabled={!onReact && !(photo && onOpenPhoto)}
          accessibilityRole={photo ? 'button' : undefined}
          accessibilityLabel={photo ? t('chat.photoOpen') : undefined}
          accessibilityActions={onReact ? [{ name: 'longpress', label: t('chat.react') }] : []}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'longpress') openPicker();
          }}
          style={[
            photo ? styles.photoBubble : styles.bubble,
            mine
              ? { backgroundColor: colors.bubbleMine }
              : {
                  backgroundColor: colors.bubbleTheirs,
                  borderColor: colors.border,
                  borderWidth: StyleSheet.hairlineWidth,
                },
            // Not confirmed by the server yet.
            status === 'sending' && styles.sending,
          ]}
        >
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              style={[photoBox(photo), { backgroundColor: colors.border }]}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text
              style={[
                styles.text,
                { color: mine ? colors.bubbleMineText : colors.bubbleTheirsText },
              ]}
            >
              {text}
            </Text>
          )}
        </Pressable>
        {chips.shown.length > 0 ? (
          <View style={[styles.chips, mine ? styles.chipsMine : styles.chipsTheirs]}>
            {chips.shown.map((chip) => (
              <LeavingChip
                key={chip.kind}
                leaving={chip.leaving}
                outwards={mine ? 1 : -1}
                onGone={() => chips.forget(chip.kind)}
              >
                <Pressable
                  onPress={chip.mine ? onUnreact : openPicker}
                  disabled={chip.leaving || !onReact}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(`chat.reaction.${chip.kind}`)} ${chip.count}`}
                  accessibilityHint={chip.mine ? t('chat.unreact') : undefined}
                  hitSlop={4}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: chip.mine ? colors.bubbleMine : colors.surface,
                      borderColor: chip.mine ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{REACTION_EMOJI[chip.kind]}</Text>
                  <Text
                    style={[
                      styles.chipCount,
                      { color: chip.mine ? colors.bubbleMineText : colors.textMuted },
                    ]}
                  >
                    {chip.count}
                  </Text>
                </Pressable>
              </LeavingChip>
            ))}
          </View>
        ) : null}
      </View>
      {status === 'failed' ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.failed, { color: colors.accent }]}>{t('chat.retry')}</Text>
        </Pressable>
      ) : (time || receipt) && status !== 'sending' ? (
        <View
          style={[
            mine ? styles.metaMine : styles.metaTheirs,
            chips.shown.length > 0 && { marginBottom: 2 + CHIP_GAP + CHIP_HEIGHT },
          ]}
        >
          {receipt ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>{receipt}</Text>
          ) : null}
          {time ? <Text style={[styles.meta, { color: colors.textMuted }]}>{time}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

type Chip = { kind: MessageReaction; count: number; mine: boolean };

// One chip per reaction kind, with how many gave it and whether I am one of them, in the order the
// kinds were first given (the server keeps each member's reaction where it was first put).
function reactionChips(reactions: Props['reactions'], myId: string | undefined): Chip[] {
  const chips: Chip[] = [];
  for (const [userId, kind] of Object.entries(reactions ?? {})) {
    let chip = chips.find((c) => c.kind === kind);
    if (!chip) {
      chip = { kind, count: 0, mine: false };
      chips.push(chip);
    }
    chip.count += 1;
    if (userId === myId) chip.mine = true;
  }
  return chips;
}

// The chips on screen: each keeps its place as counts change, a new kind joins on the right, and a
// kind taken off stays a moment longer, leaving, until its slide is over (then it is forgotten).
function useChips(chips: Chip[]) {
  const key = chips.map((c) => `${c.kind}${c.count}${c.mine ? '*' : ''}`).join();
  const [seen, setSeen] = useState(key);
  const [shown, setShown] = useState(() => chips.map((c) => ({ ...c, leaving: false })));
  if (key !== seen) {
    setSeen(key);
    setShown((prev) => [
      ...prev.map((old) => {
        const now = chips.find((c) => c.kind === old.kind);
        return now ? { ...now, leaving: false } : { ...old, leaving: true };
      }),
      ...chips
        .filter((c) => !prev.some((old) => old.kind === c.kind))
        .map((c) => ({ ...c, leaving: false })),
    ]);
  }
  const forget = (kind: MessageReaction) =>
    setShown((prev) => prev.filter((c) => !(c.kind === kind && c.leaving)));
  return { shown, forget };
}

// Once leaving, the chip slides outwards and fades while its width closes, then calls onGone.
function LeavingChip({
  leaving,
  outwards,
  onGone,
  children,
}: {
  leaving: boolean;
  outwards: 1 | -1;
  onGone: () => void;
  children: ReactNode;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });

  useEffect(() => {
    if (!leaving) {
      progress.setValue(0);
      return;
    }
    // Width can't run on the native driver, so the whole leave runs in JS; it is short.
    const leave = Animated.timing(progress, {
      toValue: 1,
      duration: CHIP_LEAVE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    leave.start(({ finished }) => {
      if (finished) gone.current();
    });
    return () => leave.stop();
  }, [leaving, progress]);

  const leave = (to: number) => progress.interpolate({ inputRange: [0, 1], outputRange: [0, to] });
  return (
    <Animated.View
      onLayout={leaving ? undefined : (e) => setWidth(e.nativeEvent.layout.width)}
      style={
        leaving && {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateX: leave(outwards * CHIP_LEAVE_SLIDE) }],
          width: progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }),
          // The row's gap closes with it.
          marginHorizontal: leave(-CHIP_GAP / 2),
          alignItems: outwards > 0 ? 'flex-end' : 'flex-start',
        }
      }
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 12,
  },
  rowMine: {
    flexDirection: 'row-reverse',
  },
  rowTheirs: {
    flexDirection: 'row',
  },
  column: {
    maxWidth: '75%',
  },
  columnMine: {
    alignItems: 'flex-end',
  },
  columnTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  // No padding: the photo is the bubble, with its corners.
  photoBubble: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  sending: {
    opacity: 0.55,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  // Under the bubble, from the sender's edge.
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: CHIP_GAP,
  },
  chipsMine: {
    justifyContent: 'flex-end',
  },
  chipsTheirs: {
    justifyContent: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: CHIP_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  chipCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaMine: {
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  metaTheirs: {
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
  },
  failed: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
});
