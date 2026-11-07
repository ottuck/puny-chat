import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { useColors } from '@/theme';

import type { BuddyView } from '../../api';
import { CORNER_SIZE } from './constants';

// The buddy's name, level and progress at the top of the stage, the way into its details.
export function StageHeader({
  buddy,
  levelingUp,
  dream,
  cornerButton,
  corners,
  onOpenDetail,
}: {
  buddy: BuddyView;
  levelingUp: boolean;
  dream: boolean;
  cornerButton?: ReactNode;
  corners: number;
  onOpenDetail: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.info,
        cornerButton ? { right: 6 + corners * (CORNER_SIZE + 6) } : null,
        dream ? styles.hidden : null,
      ]}
    >
      {/* A tile like the corner buttons, with a chevron, so it reads as the way into the details. */}
      <Pressable
        onPress={onOpenDetail}
        disabled={dream}
        accessibilityRole="button"
        accessibilityLabel={t('buddy.open', { buddy: buddy.name })}
        hitSlop={4}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {buddy.name}
        </Text>
        <Text
          style={[
            styles.level,
            levelingUp ? styles.levelUp : null,
            { color: levelingUp ? colors.accent : colors.textMuted },
          ]}
        >
          {t('buddy.level', { level: buddy.level })}
        </Text>
        {/* Ready to go its own way (in the buddy's details). */}
        {buddy.grown ? <Text style={styles.grown}>🎓</Text> : null}
        {/* Both have talked today: the day's bonus is in. */}
        {buddy.togetherToday ? (
          <Text style={styles.grown} accessibilityLabel={t('buddy.together.badge')}>
            🤝
          </Text>
        ) : null}
        <View style={styles.bar}>
          <ProgressBar progress={buddy.levelProgress} />
        </View>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // The space left of the corner buttons; only the tile in it takes taps.
  info: {
    position: 'absolute',
    top: 8,
    left: 6,
    right: 6,
    alignItems: 'flex-start',
    pointerEvents: 'box-none',
    // Over the room's light (room-light.tsx).
    zIndex: 2,
  },
  // Ends above WALL_TOP, so the wall's things stay clear of it.
  pill: {
    maxWidth: '100%',
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 13,
    borderWidth: 1,
  },
  chevron: {
    marginLeft: -2,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  level: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  // Row containers: the bar stretches with flex, which in a column would collapse its height.
  bar: {
    width: 72,
    flexDirection: 'row',
  },
  grown: {
    fontSize: 13,
  },
  hidden: {
    opacity: 0,
  },
  levelUp: {
    fontWeight: '700',
  },
});
