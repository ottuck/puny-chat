import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

// Shown above the chat in a guest's last week (docs/PROJECT.md, 게스트 우선). A quiet row rather
// than a dialog: the chat stays usable, and the last three days only get a stronger color.
// Before that, a guest sees once why linking matters (another phone, browser or the home-screen
// app starts as someone new) until they close it; closing is remembered on this device.
const SHOW_FROM_DAYS = 7;
const URGENT_FROM_DAYS = 3;
const HINT_CLOSED_KEY = 'linkHintClosed';

export function GuestExpiryBanner({
  daysLeft,
  onPress,
}: {
  daysLeft: number | null;
  onPress: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  // null until read: the hint does not flash for someone who closed it.
  const [hintClosed, setHintClosed] = useState<boolean | null>(null);
  const hint = daysLeft !== null && daysLeft > SHOW_FROM_DAYS;

  useEffect(() => {
    if (!hint) return;
    AsyncStorage.getItem(HINT_CLOSED_KEY)
      .then((value) => setHintClosed(value === '1'))
      .catch(() => setHintClosed(false));
  }, [hint]);

  if (daysLeft === null) return null;

  if (hint) {
    if (hintClosed !== false) return null;
    const close = () => {
      setHintClosed(true);
      AsyncStorage.setItem(HINT_CLOSED_KEY, '1').catch(() => {});
    };
    return (
      <View style={[styles.banner, { backgroundColor: colors.surface }]}>
        <Pressable onPress={onPress} accessibilityRole="button" style={styles.hint}>
          <Text style={[styles.text, { color: colors.text }]}>{t('guest.linkHint')}</Text>
          <Text style={[styles.action, { color: colors.accent }]}>{t('guest.link')}</Text>
        </Pressable>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={10}
        >
          <Text style={[styles.close, { color: colors.textMuted }]}>✕</Text>
        </Pressable>
      </View>
    );
  }

  const urgent = daysLeft <= URGENT_FROM_DAYS;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: urgent ? colors.accent : colors.surface, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.text, { color: urgent ? colors.onAccent : colors.text }]}>
        {t('guest.expiring', { count: daysLeft })}
      </Text>
      <Text style={[styles.action, { color: urgent ? colors.onAccent : colors.accent }]}>
        {t('guest.link')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  hint: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
  },
  text: {
    flexShrink: 1,
    fontSize: 14,
  },
  action: {
    fontSize: 14,
    fontWeight: '700',
  },
  close: {
    fontSize: 14,
  },
});
