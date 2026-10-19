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

  // On unless turned off.
  async function pushEnabled(): Promise<boolean> {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'off';
  }

  // Asks for permission (once; iOS remembers the answer) and tells the server this device's token,
  // unless the user turned notifications off in the app.
  async function registerForPush(): Promise<PushState> {
    if (!(await pushEnabled())) return 'off';
    if (!Device.isDevice) return 'unavailable'; // simulators get no token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      console.warn('No EAS projectId in app config; push notifications are off.');
      return 'unavailable';
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return 'denied';
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await server.addExpoToken(token);
    registeredToken = token;
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
