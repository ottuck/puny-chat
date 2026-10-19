import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import type { Push, PushOptions, PushServer, PushState } from './types';

const ENABLED_KEY = 'push-enabled';

export function createPush(server: PushServer, options: PushOptions = {}): Push {
  const show = options.showWhileOpen ?? false;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: show,
    }),
  });

  let registeredToken: string | null = null;
  // The device's own token (APNs / FCM) the registered Expo token was made from.
  let deviceToken: string | null = null;
  // Moves on when the token is removed (switched off, signing out): a registration still on its
  // way then keeps nothing, and removes what it added.
  let session = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  }

  // The push service can replace the device's token while the app is running; the old one stops
  // working. While registered, tell the server the new one right away. Not getDevicePushTokenAsync
  // here (nor getExpoPushTokenAsync without the token): that fires this again.
  Notifications.addPushTokenListener((token) => {
    if (!registeredToken || token.data === deviceToken) return;
    rotate(token, session, 0);
  });

  // Registers the new device token in place of the old one. Offline or a failing server is tried
  // again later (Expo suggests so), waiting longer each time, until it works or push is removed.
  function rotate(device: Notifications.DevicePushToken, from: number, attempt: number) {
    clearRetry();
    const previous = registeredToken;
    register(device, from)
      .then(() => {
        if (from !== session || !previous || previous === registeredToken) return;
        server.removeExpoToken(previous).catch(() => {}); // it no longer works anyway
      })
      .catch((e) => {
        if (from !== session) return;
        console.warn('registering the new push token failed; trying again later', e);
        const delay = Math.min(60_000 * 2 ** attempt, 60 * 60_000);
        retryTimer = setTimeout(() => rotate(device, from, attempt + 1), delay);
      });
  }

  function projectId(): string | undefined {
    return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  }

  // The Expo token for this device token, told to the server, unless push was removed meanwhile.
  async function register(device: Notifications.DevicePushToken, from: number): Promise<void> {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: projectId(),
      devicePushToken: device,
    });
    if (from !== session) return;
    await server.addExpoToken(token);
    if (from !== session) {
      await server.removeExpoToken(token).catch(() => {});
      return;
    }
    clearRetry(); // an older token's retry must not replace this one
    registeredToken = token;
    deviceToken = device.data;
  }

  // On unless turned off.
  async function pushEnabled(): Promise<boolean> {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'off';
  }

  // Asks for permission (once; iOS remembers the answer) and tells the server this device's token,
  // unless the user turned notifications off in the app.
  async function registerForPush(): Promise<PushState> {
    if (!(await pushEnabled())) return 'off';
    if (!Device.isDevice) return 'unavailable'; // simulators get no token
    if (!projectId()) {
      console.warn('No EAS projectId in app config; push notifications are off.');
      return 'unavailable';
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return 'denied';
    await register(await Notifications.getDevicePushTokenAsync(), session);
    return 'on';
  }

  async function setPushEnabled(enabled: boolean): Promise<PushState> {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'on' : 'off');
    if (enabled) return registerForPush();
    await unregisterPush();
    return 'off';
  }

  async function unregisterPush(): Promise<void> {
    session += 1;
    clearRetry();
    deviceToken = null;
    if (!registeredToken) return;
    const token = registeredToken;
    registeredToken = null;
    await server.removeExpoToken(token);
  }

  // A tap on a notification (not on one of its action buttons). The tap that opened the app came
  // before anyone listened, so it is read once on subscribing; cleared so it is handled only once.
  function onNotificationTap(listener: (data: Record<string, unknown>) => void): () => void {
    const handle = (response: Notifications.NotificationResponse) => {
      Notifications.clearLastNotificationResponse();
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      listener(response.notification.request.content.data ?? {});
    };
    const opened = Notifications.getLastNotificationResponse();
    if (opened) handle(opened);
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }

  return {
    pushSupported: true,
    pushEnabled,
    registerForPush,
    setPushEnabled,
    unregisterPush,
    onNotificationTap,
  };
}
