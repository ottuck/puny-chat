import type { Auth } from 'firebase/auth';

import { appleProvider } from './apple';
import { googleProvider } from './google';
import type { SocialAuthOptions } from './types';

// Google and Apple sign-in for an Expo app on Firebase Auth's JS SDK, the same code on iPhone and
// web. Kept apart from the app (no `@/` imports, no copy, no server calls) so another app can take
// the folder as it is. Per platform, Metro picks `*.ios.ts` / `*.web.ts`:
//
//   web     Google and Apple through Firebase's popup (popup-provider.ts)
//   iPhone  Apple through Apple's sheet (expo-apple-authentication, expo-crypto, expo-constants),
//           Google through Google's (@react-native-google-signin/google-signin, its config plugin
//           with `iosUrlScheme` = the iOS client's reversed id, and `options.google`)
//   other   unsupported (`supported: false`)
//
// Setup outside the code: the Google and Apple providers in the Firebase console, the app's web
// domain in Firebase's authorized domains, and for Apple an App ID with Sign in with Apple, a
// Services ID whose domains and return URL include `<project>.firebaseapp.com` and
// `https://<project>.firebaseapp.com/__/auth/handler`, and a key, all entered in Firebase's
// Apple provider.
//
// Typical use: start as an anonymous guest, later `linkOrSwitch` a provider so the uid (and the
// user's data) stays; if that account already has a user, confirm and switch to it instead.
export function createSocialAuth(auth: Auth, options: SocialAuthOptions = {}) {
  return { google: googleProvider(auth, options.google), apple: appleProvider(auth) };
}

export {
  AccountInUseError,
  isCancelledSignIn,
  linkedProvider,
  type LinkOutcome,
  linkOrSwitch,
  reauthenticateLinked,
} from './account';
export type { GoogleOptions, ProviderId, SocialAuthOptions, SocialProvider } from './types';
