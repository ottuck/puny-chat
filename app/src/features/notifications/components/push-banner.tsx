import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { type PushState, setPushEnabled } from '@/features/notifications/push';
import { useColors } from '@/theme';

// The web starts with notifications off (the browser asks only on a tap), and an iPhone's Safari
// gets none at all until the site is added to the home screen. A chat that stays quiet is easy to
// miss, so the web says so above the chat until it is turned on or closed. The app asks by itself.
const SEEN_KEY = 'push-banner-seen-';

type Nudge = 'off' | 'needsInstall';

export function PushBanner({
  state,
  onChange,
  onVisible,
  hold = false,
}: {
  state: PushState | null;
  onChange: (state: PushState) => void;
  // So the other banners wait: one card above the chat at a time.
  onVisible: (visible: boolean) => void;
  hold?: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const nudge: Nudge | null =
    Platform.OS === 'web' && (state === 'off' || state === 'needsInstall') ? state : null;
  // Which nudge was closed before on this device (each its own: after adding to the home screen,
  // turning on is a new step).
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Nudge | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!nudge) return;
    let cancelled = false;
    AsyncStorage.getItem(SEEN_KEY + nudge)
      .then((value) => {
        if (cancelled) return;
        setSeen((prev) => ({ ...prev, [nudge]: value === '1' }));
        setChecked(nudge);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [nudge]);

  const show = !!nudge && checked === nudge && !seen[nudge];
  useEffect(() => {
    onVisible(show);
  }, [show, onVisible]);

  const close = () => {
    if (!nudge) return;
    setSeen((prev) => ({ ...prev, [nudge]: true }));
    AsyncStorage.setItem(SEEN_KEY + nudge, '1').catch(() => {});
  };

  // Straight from the tap: Safari asks for permission only while handling one.
  const turnOn = () => {
    setPushEnabled(true)
      .then((next) => {
        if (next === 'denied') setDenied(true);
        onChange(next);
      })
      .catch((e) => console.warn('turning on notifications failed', e));
  };

  if (!show || hold) return null;
  const install = nudge === 'needsInstall';
  return (
    <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t(install ? 'push.banner.installTitle' : 'push.banner.title')}
        </Text>
        <Text lineBreakStrategyIOS="hangul-word" style={[styles.text, { color: colors.textMuted }]}>
          {denied
            ? t('settings.notificationsDeniedWeb')
            : t(install ? 'push.banner.installBody' : 'push.banner.body')}
        </Text>
        {install || denied ? null : (
          <Pressable onPress={turnOn} accessibilityRole="button" hitSlop={6}>
            <Text style={[styles.action, { color: colors.accent }]}>{t('push.banner.turnOn')}</Text>
          </Pressable>
        )}
      </View>
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

// Same card as GuideBanner.
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
