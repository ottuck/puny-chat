import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
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

import { Button } from '@/components/button';
import { goBack, HeaderBack } from '@/components/header-back';
import { PageTitle } from '@/components/page-title';
import { MAX_DISPLAY_NAME, updateMyName } from '@/features/room/api';
import { errorMessage } from '@/features/room/error-message';
import { useRoom } from '@/features/room/room-provider';
import { cancelStart, isCancelledSignIn, signInErrorKey } from '@/features/auth/actions';
import { useAuth } from '@/features/auth/auth-provider';
import { finishStart, resetStart, setStartName, useStart } from '@/features/auth/start-flow';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

// The name the friend sees. Three ways here: starting (no account yet: the guest is made with it,
// start-flow.ts), signed in without one (a new Google or Apple account), or from settings.
export default function NameScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { state, setMe, refreshRoom } = useRoom();
  const { user } = useAuth();
  const starting = !user;
  const pending = useStart();
  const me = state.status === 'none' || state.status === 'ready' ? state.me : null;
  // Changing an existing name (from settings) goes back when done; first-time naming moves on.
  const [editing] = useState(() => !!me?.displayName);
  const [name, setName] = useState(me?.displayName ?? pending.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Settings opens it with edit=1. Without it a named person got here another way (e.g. the web's
  // back button after starting): their place is the chat.
  const params = useLocalSearchParams<{ edit?: string }>();

  const save = async () => {
    setBusy(true);
    setError(null);
    if (starting) {
      setStartName(name.trim());
      // Joining a friend: this is the last step, the guest is made now and goes into their room.
      // Otherwise on to the egg's name, still without an account.
      if (!pending.code) {
        setBusy(false);
        router.push('/welcome');
        return;
      }
      try {
        await finishStart();
      } catch (e) {
        if (!isCancelledSignIn(e)) setError(t(signInErrorKey(e)));
        setBusy(false);
      }
      return;
    }
    try {
      setMe(await updateMyName(name.trim()));
      // The room lists members by name too.
      if (state.status === 'ready') await refreshRoom();
      if (editing) goBack('/settings');
      else router.replace(state.status === 'ready' ? '/' : '/welcome');
    } catch (e) {
      setError(errorMessage(t, e));
      setBusy(false);
    }
  };

  if (editing && params.edit !== '1') return <Redirect href="/" />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageTitle title={t('name.title')} />
      {/* First-time naming can go back. Starting: just back (nothing exists yet). Signed in without
          a name: out of that account, to the first screen. */}
      {!editing ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (starting) {
                if (router.canGoBack()) router.back();
                else router.replace('/sign-in');
                return;
              }
              resetStart();
              setBusy(true);
              void cancelStart().finally(() => {
                setBusy(false);
                setTimeout(() => router.replace('/sign-in'), 0);
              });
            }}
            disabled={busy}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Text style={[styles.back, { color: colors.textMuted }]}>
              {starting ? t('common.back') : t('demo.back')}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {/* A back button only when coming from settings; first-time naming has nowhere to go back to. */}
      <Stack.Screen options={{ headerShown: editing, title: '', headerLeft: HeaderBack }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.column}
      >
        <View style={styles.hero}>
          <Text style={styles.wave}>👋</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('name.title')}</Text>
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.subtitle, { color: colors.textMuted }]}
          >
            {t('name.subtitle')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('name.placeholder')}
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_DISPLAY_NAME}
            autoFocus
            autoComplete="nickname"
            returnKeyType="done"
            onSubmitEditing={() => name.trim() && save()}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          />
          {error ? <Text style={[styles.error, { color: colors.accent }]}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button
            label={editing ? t('name.save') : t('name.next')}
            onPress={save}
            disabled={busy || !name.trim()}
          />
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
  },
  back: {
    fontSize: 15,
    fontWeight: '600',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wave: {
    fontSize: 64,
    lineHeight: 78,
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
