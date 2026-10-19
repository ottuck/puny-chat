import Constants from 'expo-constants';

import { auth } from '@/lib/firebase';
import { createSocialAuth, type GoogleOptions } from '@/lib/social-auth';

// Google and Apple sign-in for this app's Firebase project (lib/social-auth). The Google OAuth
// client ids are public and live in app.json (`extra.googleSignIn`), next to the config plugin's
// `iosUrlScheme`.
export const social = createSocialAuth(auth, {
  google: Constants.expoConfig?.extra?.googleSignIn as GoogleOptions | undefined,
});
