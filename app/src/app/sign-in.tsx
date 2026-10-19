import { router } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageTitle } from '@/components/page-title';
import { BuddyAvatar } from '@/features/buddy/components/buddy-avatar';
import { Button } from '@/components/button';
import { signInErrorKey } from '@/features/auth/actions';
import { useAuth } from '@/features/auth/auth-provider';
import { isCancelledSignIn, onPopupClosed } from '@/lib/social-auth';
import { AppleButton } from '@/features/auth/components/apple-button';
import { social } from '@/features/auth/social';
import { resetStart } from '@/features/auth/start-flow';
import { hasPendingInvite } from '@/features/room/pending-invite';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

export default function SignInScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { guestExpired } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A closed popup takes Firebase 8 seconds to report; the buttons come back as soon as it closes.
  useEffect(() => (busy ? onPopupClosed(() => setBusy(false)) : undefined), [busy]);
  // Came with a friend's invite link: after starting, they go straight to joining. Read after the
  // first render, which the web builds ahead of time without the link.
  const [invited, setInvited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setInvited(hasPendingInvite()), 0);
    return () => clearTimeout(timer);
  }, []);

  // On success the auth listener swaps this screen out, so only failures need handling here.
  const run = async (signIn: () => Promise<void>) => {
    resetStart();
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      if (!isCancelledSignIn(e)) {
        console.warn(e);
        // In development, show the Firebase error code (e.g. a provider not enabled in the console).
        const code = __DEV__ && e instanceof FirebaseError ? ` (${e.code})` : '';
        setError(t(signInErrorKey(e)) + code);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageTitle />
      <View style={styles.column}>
        <View style={styles.hero}>
          <BuddyAvatar stage="EGG" size={80} />
          <Text style={[styles.title, { color: colors.text }]}>puny-chat</Text>
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.tagline, { color: colors.textMuted }]}
          >
            {t('signIn.tagline')}
          </Text>
        </View>

        {/* Guest first: nothing stands between opening the app and meeting the buddy. An account
            can be linked later from settings, keeping everything (docs/PROJECT.md). */}
        <View style={styles.actions}>
          {/* Starting always shows the scripted room first (app/demo.tsx, no account needed);
              starting for real is a tap from there. */}
          <Button
            label={t('signIn.start')}
            onPress={() => {
              resetStart();
              router.push('/demo');
            }}
            disabled={busy}
          />
          {/* Got a friend's code: type it first, then a name, then straight into their room. */}
          {invited ? null : (
            <Button
              label={t('signIn.withCode')}
              onPress={() => {
                resetStart();
                router.push('/join');
              }}
              disabled={busy}
              variant="secondary"
            />
          )}
          {social.google.supported ? (
            <Button
              label={t('signIn.google')}
              onPress={() => run(social.google.signIn)}
              disabled={busy}
              variant="secondary"
            />
          ) : null}
          {/* Back to an account linked elsewhere (an iPhone, another browser), or a first start. */}
          {social.apple.supported ? (
            <AppleButton kind="signIn" onPress={() => run(social.apple.signIn)} disabled={busy} />
          ) : null}
          {/* Back after the guest's 30 days: say why this is the first screen again. */}
          <Text
            style={[
              styles.notice,
              { color: invited || guestExpired ? colors.accent : colors.textMuted },
            ]}
          >
            {invited
              ? t('signIn.invited')
              : guestExpired
                ? t('signIn.guestExpired')
                : t('signIn.noAccountNeeded')}
          </Text>
          {busy ? <ActivityIndicator color={colors.accent} /> : null}
          {error ? <Text style={[styles.error, { color: colors.accent }]}>{error}</Text> : null}
          <View style={styles.links}>
            <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
              <Text style={[styles.notice, { color: colors.textMuted }]}>{t('privacy.title')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/support')} accessibilityRole="link">
              <Text style={[styles.notice, { color: colors.textMuted }]}>{t('support.title')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 8 },
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  notice: {
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
});
