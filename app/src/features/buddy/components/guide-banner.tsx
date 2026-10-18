import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

// Above the chat until tapped once in this room on this device: what the buddy is about and what levels bring
// (a job at 12, its own way from 20), so there is something to look forward to from the first day.
// The whole card opens the guide, the ✕ too: people tap it to get it out of the way, and that is
// the moment to show them the rest.
// Per room: someone who comes into a friend's room with an invite sees it there too, even on a
// device where they had a room of their own before.
const seenKey = (roomId: string) => `buddy-guide-seen:${roomId}`;

// `hold`: not yet (the dream before the first egg is on).
export function GuideBanner({
  roomId,
  onOpen,
  hold = false,
}: {
  roomId: string;
  onOpen: () => void;
  hold?: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(seenKey(roomId))
      .then((seen) => !cancelled && setShow(!seen))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const done = () => {
    setShow(false);
    AsyncStorage.setItem(seenKey(roomId), '1').catch(() => {});
  };

  if (!show || hold) return null;
  return (
    <Pressable
      onPress={() => {
        done();
        onOpen();
      }}
      accessibilityRole="button"
      style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.accent }]}
    >
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>{t('guide.banner.title')}</Text>
        <Text lineBreakStrategyIOS="hangul-word" style={[styles.text, { color: colors.textMuted }]}>
          {t('guide.banner.body')}
        </Text>
        <Text style={[styles.action, { color: colors.accent }]}>{t('guide.banner.open')}</Text>
      </View>
      <Text style={[styles.close, { color: colors.textMuted }]}>✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  close: {
    fontSize: 14,
  },
});
