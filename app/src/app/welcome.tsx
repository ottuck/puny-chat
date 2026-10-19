import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageTitle } from '@/components/page-title';
import { BuddyAvatar } from '@/features/buddy/components/buddy-avatar';
import { Button } from '@/components/button';
import { GearIcon } from '@/components/icons';
import { signInErrorKey } from '@/features/auth/actions';
import { isCancelledSignIn } from '@/lib/social-auth';
import { useAuth } from '@/features/auth/auth-provider';
import { finishStart, useStart } from '@/features/auth/start-flow';
import { countStartStep } from '@/features/stats/start-steps';
import { createRoom } from '@/features/room/api';
import { errorMessage } from '@/features/room/error-message';
import { useRoom } from '@/features/room/room-provider';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

const MAX_BUDDY_NAME = 12; // server: Buddy.MAX_NAME_LENGTH

// Naming the egg (docs/PROJECT.md, 핵심 경험). Starting, it is the last step: waking the buddy makes
// the guest, and the guards then save the name and make the room (start-flow.ts). Signed in without a
// room (someone who left one), it makes the room here; settings are behind the gear there, as in the
// chat (a friend's code is in settings too).
export default function WelcomeScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { setRoom } = useRoom();
  const { user } = useAuth();
  const pending = useStart();
  const starting = !user;
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    if (starting) {
      try {
        await finishStart(name.trim());
        countStartStep('wake');
      } catch (e) {
        if (!isCancelledSignIn(e)) setError(t(signInErrorKey(e)));
        setBusy(false);
      }
      return;
    }
    try {
      setRoom(await createRoom(name.trim()));
    } catch (e) {
      setError(errorMessage(t, e));
      setBusy(false);
    }
  };

  // The way in skips the name only after a reload (it lives in memory): ask it again.
  if (starting && !pending.name) return <Redirect href="/name" />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageTitle />
      <View style={styles.topBar}>
        {starting ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/name'))}
            disabled={busy}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Text style={[styles.back, { color: colors.textMuted }]}>{t('common.back')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.title')}
            hitSlop={12}
            style={styles.gear}
          >
            <GearIcon color={colors.text} />
          </Pressable>
        )}
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.column}
      >
        <View style={styles.hero}>
          <BuddyAvatar stage="EGG" size={80} />
          <Text style={[styles.title, { color: colors.text }]}>{t('welcome.title')}</Text>
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.subtitle, { color: colors.textMuted }]}
          >
            {t('welcome.subtitle')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('welcome.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_BUDDY_NAME}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => name.trim() && start()}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          />
          {error ? <Text style={[styles.error, { color: colors.accent }]}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button label={t('welcome.startSolo')} onPress={start} disabled={busy || !name.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  },
  topBar: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: 36,
  },
  back: {
    fontSize: 15,
    fontWeight: '600',
  },
  gear: {
    alignSelf: 'flex-end',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  input: {
    alignSelf: 'stretch',
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
});
