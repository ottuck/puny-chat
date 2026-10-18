import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n, { detectLanguage } from '@/i18n';
import { StatusScreen } from '@/components/status-screen';
import { WebFrame } from '@/components/web-frame';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { nameSaved, takeStartCode, useStart } from '@/features/auth/start-flow';
import { updateMyName } from '@/features/room/api';
import { RoomProvider, useRoom } from '@/features/room/room-provider';
import { loadPreferences, usePreferences } from '@/lib/preferences';
import { rememberInviteFromUrl, takePendingInvite } from '@/lib/pending-invite';
import { registerServiceWorker } from '@/lib/service-worker';
import { warmUpServer } from '@/lib/warm-up';
import { useColorMode } from '@/theme';

// Keep the splash screen up until we know where the user belongs (signed out, no room yet, or
// their room), so no screen flashes by on launch.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorMode();
  const { language } = usePreferences();

  // Wake the server (it may have scaled to zero) before the first real request needs it.
  useEffect(() => {
    warmUpServer();
    loadPreferences();
    registerServiceWorker();
    // A friend's invite link (join?code=…) may arrive before the friend has signed in.
    rememberInviteFromUrl();
  }, []);

  // The language chosen in settings, or the device's.
  useEffect(() => {
    const next = language === 'system' ? detectLanguage() : language;
    if (i18n.language !== next) i18n.changeLanguage(next);
  }, [language]);

  // Web: the page around the app (background, frame) follows the chosen mode too (app/+html.tsx).
  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.dataset.theme = colorScheme;
  }, [colorScheme]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <RoomProvider>
            <WebFrame>
              <RootNavigator />
            </WebFrame>
          </RoomProvider>
        </AuthProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();
  const { state, reload, setMe } = useRoom();
  const { t, i18n } = useTranslation();
  const signedIn = !!user;
  const pending = useStart();
  const me = state.status === 'none' || state.status === 'ready' ? state.me : null;
  // Guests start without a name; they pick one before anything else (the friend sees it).
  const named = !!me?.displayName;
  // Just made from the start flow, with the name it was given still to save (start-flow.ts).
  const savingName = signedIn && !!me && !named && !!pending.name;
  const roomReady = state.status === 'ready';

  // Saves the name typed before starting, then goes where a named person goes (the stack was
  // replaced by the loading screen meanwhile, so it says where). A failure leaves the name screen.
  useEffect(() => {
    if (!savingName || !pending.name) return;
    let gone = false;
    updateMyName(pending.name)
      .then((next) => {
        if (gone) return;
        nameSaved();
        setMe(next);
        setTimeout(() => router.replace(roomReady ? '/' : '/welcome'), 0);
      })
      .catch((e) => {
        console.warn('saving the name failed', e);
        if (!gone) nameSaved();
      });
    return () => {
      gone = true;
    };
  }, [savingName, pending.name, roomReady, setMe]);
  const settled = !initializing && (!signedIn || state.status !== 'loading');
  const pathname = usePathname();
  const publicPage = pathname === '/privacy' || pathname === '/support';
  const canJoin =
    signedIn && (state.status === 'none' || state.status === 'ready') && !!state.me.displayName;

  // Signed in with a name now: on to the invite that brought them here, code filled in, or into
  // the room of the code typed on the first screen's way in.
  // Waits for where they land after naming (welcome or the chat): going earlier, the name screen's
  // own navigation would cover the join screen.
  useEffect(() => {
    if (!canJoin || (pathname !== '/welcome' && pathname !== '/')) return;
    // A code typed before starting is used right away (auto); one from a link is shown to confirm.
    const typed = takeStartCode();
    const code = takePendingInvite() ?? typed;
    if (!code) return;
    const params = typed ? { code, auto: '1' } : { code };
    const timer = setTimeout(() => router.push({ pathname: '/join', params }), 0);
    return () => clearTimeout(timer);
  }, [canJoin, pathname]);

  useEffect(() => {
    if (settled || publicPage) SplashScreen.hideAsync();
  }, [settled, publicPage]);

  // Web: the page is rendered at build time in English; tell the browser the language in use.
  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  if (initializing && !publicPage) return null;
  if (signedIn && state.status === 'loading' && !publicPage) return <StatusScreen loading />;
  if (savingName) return <StatusScreen loading />;
  if (signedIn && state.status === 'error' && !publicPage) {
    return (
      <StatusScreen
        message={t('errors.loadFailed')}
        actionLabel={t('common.retry')}
        onAction={reload}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && state.status === 'ready' && named}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && state.status === 'none' && named}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      {/* Also before signing in: the start flow asks for the name before making the guest. */}
      <Stack.Protected guard={!!me || !signedIn}>
        <Stack.Screen name="name" />
      </Stack.Protected>
      {/* Not before a name: there is nothing of theirs to show or sign out of yet. */}
      <Stack.Protected guard={!!me && named}>
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: t('settings.title'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="guide"
          options={{
            headerShown: true,
            title: t('guide.title'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack.Protected>
      {/* Also before signing in: "start with an invite code" types the code first (join.tsx). */}
      <Stack.Protected guard={!signedIn || named}>
        <Stack.Screen
          name="join"
          options={{
            headerShown: true,
            title: t('join.title'),
            headerBackButtonDisplayMode: 'minimal',
            presentation: 'modal',
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="demo" />
      </Stack.Protected>
      <Stack.Screen
        name="privacy"
        options={{
          headerShown: true,
          title: t('privacy.title'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          headerShown: true,
          title: t('support.title'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
