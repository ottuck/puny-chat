import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useColors } from '@/theme';

import { MESSAGE_REACTIONS, type MessageReaction, REACTION_EMOJI } from '../types';
import type { BubbleRect } from './message-bubble';

const BUTTON = 44;
const GAP = 4;
const PADDING = 6;
const WIDTH =
  MESSAGE_REACTIONS.length * BUTTON + (MESSAGE_REACTIONS.length - 1) * GAP + 2 * PADDING;
const HEIGHT = BUTTON + 2 * PADDING;
const MARGIN = 8;

type Props = {
  // The long-pressed bubble; null when closed.
  target: BubbleRect | null;
  mine: boolean;
  // My reaction on it now: picking it again takes it off.
  current?: MessageReaction;
  onPick: (reaction: MessageReaction | null) => void;
  onClose: () => void;
};

// ❤️ 👍 ✅ 😮 😢 just above the bubble (below it when there is no room), on the sender's side.
export function ReactionPicker({ target, mine, current, onPick, onClose }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const window = useWindowDimensions();
  if (!target) return null;

  const above = target.y - HEIGHT - MARGIN;
  const top = above >= MARGIN ? above : target.y + target.height + MARGIN;
  const preferred = mine ? target.x + target.width - WIDTH : target.x;
  const left = Math.min(Math.max(preferred, MARGIN), window.width - WIDTH - MARGIN);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />
      <View
        style={[
          styles.picker,
          { top, left, backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {MESSAGE_REACTIONS.map((reaction) => {
          const selected = reaction === current;
          return (
            <Pressable
              key={reaction}
              onPress={() => {
                onPick(selected ? null : reaction);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={t(`chat.reaction.${reaction}`)}
              aria-selected={selected}
              style={({ pressed }) => [
                styles.button,
                (selected || pressed) && { backgroundColor: colors.bubbleMine },
              ]}
            >
              <Text style={styles.emoji}>{REACTION_EMOJI[reaction]}</Text>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  picker: {
    position: 'absolute',
    flexDirection: 'row',
    gap: GAP,
    padding: PADDING,
    borderRadius: HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
});
