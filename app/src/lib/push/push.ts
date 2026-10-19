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

  // The push service can replace the device's token while the app is running; the old one stops
  // working. While registered, tell the server the new one right away. Not getDevicePushTokenAsync
  // here (nor getExpoPushTokenAsync without the token): that fires this again.
  Notifications.addPushTokenListener((token) => {
    if (!registeredToken || token.data === deviceToken) return;
    const previous = registeredToken;
    deviceToken = token.data;
    tellServer(token)
      .then((next) => {
        if (next !== previous) {
          server.removeExpoToken(previous).catch(() => {}); // it no longer works anyway
        }
      })
      .catch((e) => console.warn('registering the new push token failed', e));
  });

  function projectId(): string | undefined {
    return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  }

  // The Expo token for this device token, told to the server.
  async function tellServer(device: Notifications.DevicePushToken): Promise<string> {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: projectId(),
      devicePushToken: device,
    });
    await server.addExpoToken(token);
    registeredToken = token;
    return token;
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
    const device = await Notifications.getDevicePushTokenAsync();
    deviceToken = device.data;
    await tellServer(device);
    return 'on';
  }

  async function setPushEnabled(enabled: boolean): Promise<PushState> {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'on' : 'off');
    if (enabled) return registerForPush();
    await unregisterPush();
    return 'off';
  }

  async function unregisterPush(): Promise<void> {
    if (!registeredToken) return;
    const token = registeredToken;
    registeredToken = null;
    await server.removeExpoToken(token);
  }

  return { pushSupported: true, pushEnabled, registerForPush, setPushEnabled, unregisterPush };
}
