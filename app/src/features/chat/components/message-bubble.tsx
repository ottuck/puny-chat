import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

import { type MessageReaction, REACTION_EMOJI } from '../types';

// Where the bubble is on screen, for the reaction picker to open next to it.
export type BubbleRect = { x: number; y: number; width: number; height: number };

// The reaction pill hangs this far below the bubble; the time beside it moves up as much.
const PILL_DROP = 16;

type Props = {
  text: string;
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
  // Long press (or the pill): open the reaction picker. Absent while the message is unconfirmed.
  onReact?: (rect: BubbleRect) => void;
};

export function MessageBubble({
  text,
  mine,
  time,
  status,
  receipt,
  onRetry,
  reactions,
  myId,
  onReact,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const bubbleRef = useRef<View>(null);
  const given = Object.entries(reactions ?? {});
  // In the order the picker shows them; two of the same say "2".
  const kinds = (Object.keys(REACTION_EMOJI) as MessageReaction[]).filter((kind) =>
    given.some(([, reaction]) => reaction === kind),
  );
  const minePicked = given.some(([userId]) => userId === myId);
  const openPicker = () =>
    bubbleRef.current?.measureInWindow((x, y, width, height) => onReact?.({ x, y, width, height }));

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.column, mine ? styles.columnMine : styles.columnTheirs]}>
        <Pressable
          ref={bubbleRef}
          onLongPress={openPicker}
          delayLongPress={350}
          disabled={!onReact}
          accessibilityActions={onReact ? [{ name: 'longpress', label: t('chat.react') }] : []}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'longpress') openPicker();
          }}
          style={[
            styles.bubble,
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
          <Text
            style={[styles.text, { color: mine ? colors.bubbleMineText : colors.bubbleTheirsText }]}
          >
            {text}
          </Text>
        </Pressable>
        {kinds.length > 0 ? (
          <Pressable
            onPress={openPicker}
            disabled={!onReact}
            accessibilityRole="button"
            accessibilityLabel={kinds.map((kind) => t(`chat.reaction.${kind}`)).join(', ')}
            hitSlop={6}
            style={[
              styles.pill,
              mine ? styles.pillMine : styles.pillTheirs,
              {
                backgroundColor: colors.surface,
                borderColor: minePicked ? colors.accent : colors.border,
              },
            ]}
          >
            <Text style={styles.pillEmoji}>
              {kinds.map((kind) => REACTION_EMOJI[kind]).join('')}
            </Text>
            {given.length > 1 && kinds.length === 1 ? (
              <Text style={[styles.pillCount, { color: colors.textMuted }]}>{given.length}</Text>
            ) : null}
          </Pressable>
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
            kinds.length > 0 && { marginBottom: 2 + PILL_DROP },
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
  sending: {
    opacity: 0.55,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  // Overlaps the bubble's lower edge a little, on the sender's side.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: -6,
    height: 6 + PILL_DROP,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 1,
  },
  pillMine: {
    marginRight: 10,
  },
  pillTheirs: {
    marginLeft: 10,
  },
  pillEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  pillCount: {
    fontSize: 11,
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
