// Push notifications for an Expo app, the same calls on iPhone and web. Kept apart from the app
// (no `@/` imports, no copy, no server paths) so another app can take the folder as it is: the app
// passes a PushServer that tells its server where to send. Per platform, Metro picks `push.web.ts`:
//
//   iPhone / Android  Expo push (expo-notifications, expo-device, an EAS projectId in the app
//                     config, a development build: Expo Go has no push). Asks on its own, once; on
//                     unless the user turns it off in the app.
//   web               Web Push with a service worker at /sw.js that shows what the server sends.
//                     Browsers ask only when the user does something, so only setPushEnabled(true)
//                     asks; off until then. An iPhone gets it only from the home screen (iOS 16.4+).
//
// The choice is kept per device (AsyncStorage, `push-enabled`).
export { createPush } from './push';
export type { Push, PushOptions, PushServer, PushState, WebPushSubscription } from './types';
