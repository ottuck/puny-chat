// 'denied': the user said no to the system prompt; only the device's settings can change that now.
// 'needsInstall': an iPhone or iPad in Safari; web notifications need the site on the home screen.
export type PushState = 'on' | 'off' | 'denied' | 'unavailable' | 'needsInstall';

// A browser's push subscription, as PushSubscription.toJSON() gives it.
export type WebPushSubscription = { endpoint?: string; p256dh?: string; auth?: string };

// How the app's server learns where to send. Only the platform's pair is called: the Expo push
// token on iPhone / Android, the Web Push subscription in a browser.
export type PushServer = {
  addExpoToken: (token: string) => Promise<void>;
  removeExpoToken: (token: string) => Promise<void>;
  // The server's VAPID public key, base64url.
  webPushKey: () => Promise<string>;
  addWebPush: (subscription: WebPushSubscription) => Promise<void>;
  removeWebPush: (endpoint: string) => Promise<void>;
};

export type PushOptions = {
  // iPhone / Android: whether a notification shows while the app is open. Off by default.
  showWhileOpen?: boolean;
};

export type Push = {
  pushSupported: boolean;
  // The user's choice in the app, per device.
  pushEnabled: () => Promise<boolean>;
  // Where things stand, telling the server this device's address again when on.
  registerForPush: () => Promise<PushState>;
  // The switch in the app's settings. Off removes the address from the server, so nothing is sent.
  setPushEnabled: (enabled: boolean) => Promise<PushState>;
  // Before signing out, so the next person on this device does not get this user's notifications.
  unregisterPush: () => Promise<void>;
  // The user tapped one of the app's notifications: called with the data the server sent with it,
  // also for the tap that opened the app. Returns a function that stops listening.
  onNotificationTap: (listener: (data: Record<string, unknown>) => void) => () => void;
};
