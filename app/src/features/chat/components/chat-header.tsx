import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { GearIcon, HelpIcon } from '@/components/icons';
import { useColors } from '@/theme';

type Props = {
  // null in a solo room: an invite button takes the partner's place.
  partnerName: string | null;
  partnerOnline: boolean;
  partnerTyping: boolean;
  connected: boolean;
  onPressInvite: () => void;
  // Absent in the tour, which has no settings.
  onPressSettings?: () => void;
  // How to raise the buddy (the guide).
  onPressHelp?: () => void;
  // The guide has not been opened on this device yet: the "?" calls for attention.
  helpNew?: boolean;
  onPressPartner?: () => void;
};

export function ChatHeader({
  partnerName,
  partnerOnline,
  partnerTyping,
  connected,
  onPressInvite,
  onPressSettings,
  onPressHelp,
  helpNew = false,
  onPressPartner,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.partnerRow}>
        {partnerName !== null ? (
          <>
            <View
              accessibilityLabel={t(partnerOnline ? 'chat.online' : 'chat.offline')}
              style={[
                styles.presence,
                { backgroundColor: partnerOnline ? colors.online : colors.border },
              ]}
            />
            <Pressable
              onPress={onPressPartner}
              disabled={!onPressPartner}
              accessibilityRole="button"
              accessibilityLabel={t('support.partnerMenu', { name: partnerName })}
              hitSlop={8}
              style={styles.partnerName}
            >
              <Text style={[styles.partnerLabel, { color: colors.text }]} numberOfLines={1}>
                {partnerName}
                {onPressPartner ? ' ⌄' : ''}
              </Text>
            </Pressable>
            {partnerTyping ? (
              <Text style={[styles.typing, { color: colors.textMuted }]}>{t('chat.typing')}</Text>
            ) : null}
          </>
        ) : (
          <Pressable
            onPress={onPressInvite}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.inviteButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.inviteLabel, { color: colors.onAccent }]}>
              {t('invite.button')}
            </Text>
          </Pressable>
        )}
        {/* Our own connection to the server. Without it the partner's presence is unknown. */}
        {!connected ? (
          <Text style={[styles.connecting, { color: colors.textMuted }]}>
            {t('chat.connecting')}
          </Text>
        ) : null}
        {onPressHelp ? (
          <Pressable
            onPress={onPressHelp}
            accessibilityRole="button"
            accessibilityLabel={t('guide.title')}
            hitSlop={12}
            style={styles.settingsButton}
          >
            <Calling on={helpNew}>
              <HelpIcon color={helpNew ? colors.accent : colors.text} />
            </Calling>
            {helpNew ? <View style={[styles.badge, { borderColor: colors.background }]} /> : null}
          </Pressable>
        ) : null}
        {onPressSettings ? (
          <Pressable
            onPress={onPressSettings}
            accessibilityRole="button"
            accessibilityLabel={t('settings.title')}
            hitSlop={12}
            style={onPressHelp ? styles.nextToHelp : styles.settingsButton}
          >
            <GearIcon color={colors.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const NATIVE_DRIVER = Platform.OS !== 'web';

// Every few seconds a little pop and wiggle, like the stage's mailbox with a letter in it, while
// `on`.
function Calling({ on, children }: { on: boolean; children: React.ReactNode }) {
  const [pop] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!on) return;
    const step = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        step(pop, 1, 160),
        step(wiggle, -1, 70),
        step(wiggle, 1, 90),
        step(wiggle, -1, 90),
        step(wiggle, 0, 70),
        step(pop, 0, 200),
        Animated.delay(1800),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pop.setValue(0);
      wiggle.setValue(0);
    };
  }, [on, pop, wiggle]);
  return (
    <Animated.View
      style={{
        transform: [
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
          { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presence: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typing: {
    fontSize: 12,
  },
  partnerName: {
    flexShrink: 1,
  },
  partnerLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsButton: {
    marginLeft: 'auto',
  },
  // The "?" takes the push to the right; settings sits beside it.
  nextToHelp: {
    marginLeft: 16,
  },
  inviteButton: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
  },
  inviteLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  connecting: {
    fontSize: 12,
  },
});
