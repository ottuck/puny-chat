import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

// Above the chat until opened once: what the buddy is about and what levels bring (a job at 10,
// its own way from 20), so there is something to look forward to from the first day.
// The whole card opens the guide, the ✕ too: people tap it to get it out of the way, and that is
// the moment to show them the rest.
// Opened once is per user, kept on the server (`seenVersion`, docs/PROJECT.md), so it does not come
// back on another device or in another room. Raise GUIDE_VERSION when the card says something new:
// everyone sees it once more.
export const GUIDE_VERSION = 1;

// This device's own note, for when telling the server failed. Before the server kept it, a device
// noted version 1 as `buddy-guide-seen` or, per room, `buddy-guide-seen:<roomId>`.
const LOCAL_KEY = 'buddy-guide-seen-version';
const LEGACY_KEY = 'buddy-guide-seen';

async function seenOnThisDevice(): Promise<number> {
  const local = Number(await AsyncStorage.getItem(LOCAL_KEY)) || 0;
  const keys = await AsyncStorage.getAllKeys();
  const legacy = keys.some((k) => k === LEGACY_KEY || k.startsWith(`${LEGACY_KEY}:`));
  return Math.max(local, legacy ? 1 : 0);
}

// `hold`: not yet (the dream before the egg is on).
export function GuideBanner({
  seenVersion,
  onSeen,
  onOpen,
  hold = false,
}: {
  seenVersion: number;
  // Tells the server; the screen keeps the user it sends back.
  onSeen: (version: number) => void;
  onOpen: () => void;
  hold?: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (seenVersion >= GUIDE_VERSION) return;
    let cancelled = false;
    seenOnThisDevice()
      .catch(() => 0)
      .then((local) => {
        if (cancelled) return;
        // Opened here before the server heard of it: tell it now, for the user's other devices.
        if (local >= GUIDE_VERSION) onSeen(GUIDE_VERSION);
        else setShow(true);
      });
    return () => {
      cancelled = true;
    };
    // onSeen is a new function each render; only the server's value decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenVersion]);

  const done = () => {
    setShow(false);
    AsyncStorage.setItem(LOCAL_KEY, String(GUIDE_VERSION)).catch(() => {});
    onSeen(GUIDE_VERSION);
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
