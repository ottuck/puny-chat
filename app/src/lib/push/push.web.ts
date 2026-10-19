import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Push, PushServer, PushState } from './types';
import { keyBytes, sameKey } from './web-push-key';

const ENABLED_KEY = 'push-enabled';

// Nothing here touches window until called: web pages are also pre-rendered in Node.

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function isAppleMobile(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  );
}

function installed(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function unsupportedState(): PushState {
  return isAppleMobile() && !installed() ? 'needsInstall' : 'unavailable';
}

// The app may register the worker on start too (so the site can be installed); this waits for it.
async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export function createPush(server: PushServer): Push {
  // Subscribes (again, if the server's key changed) and tells the server where to send.
  async function subscribe(): Promise<void> {
    const key = keyBytes(await server.webPushKey());
    const worker = await registration();
    let subscription = await worker.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    const { endpoint, keys } = subscription.toJSON();
    await server.addWebPush({ endpoint, p256dh: keys?.p256dh, auth: keys?.auth });
  }

  // Off until turned on here, unlike the app: the browser asks first.
  async function pushEnabled(): Promise<boolean> {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === 'on';
  }

  // Subscribing again if on (for this user, and the server's current key).
  async function registerForPush(): Promise<PushState> {
    if (!supported()) return unsupportedState();
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission !== 'granted' || !(await pushEnabled())) return 'off';
    await subscribe();
    return 'on';
  }

  // The only place the browser's permission is asked for.
  async function setPushEnabled(enabled: boolean): Promise<PushState> {
    if (!enabled) {
      await AsyncStorage.setItem(ENABLED_KEY, 'off');
      await unregisterPush();
      return 'off';
    }
    if (!supported()) return unsupportedState();
    // First, while still handling the tap: Safari refuses to ask otherwise.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
    await AsyncStorage.setItem(ENABLED_KEY, 'on');
    await subscribe();
    return 'on';
  }

  async function unregisterPush(): Promise<void> {
    if (!supported()) return;
    const worker = await navigator.serviceWorker.getRegistration();
    const subscription = await worker?.pushManager.getSubscription();
    if (!subscription) return;
    await server
      .removeWebPush(subscription.endpoint)
      .catch((e) => console.warn('removing the web push subscription failed', e));
    await subscription.unsubscribe();
  }

  return { pushSupported: true, pushEnabled, registerForPush, setPushEnabled, unregisterPush };
}
