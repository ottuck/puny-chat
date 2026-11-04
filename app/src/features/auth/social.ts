import Constants from 'expo-constants';

import { auth } from '@/lib/firebase';
import { createSocialAuth, type GoogleOptions } from '@/lib/social-auth';

import { setStartName } from './start-flow';

// Google and Apple sign-in for this app's Firebase project (lib/social-auth). The Google OAuth
// client ids are public and live in app.json (`extra.googleSignIn`), next to the config plugin's
// `iosUrlScheme`. The name Apple gives on a first sign-in becomes the name others see, the way the
// name typed in the start flow does (_layout.tsx), so it is not asked for again.
export const social = createSocialAuth(auth, {
  google: Constants.expoConfig?.extra?.googleSignIn as GoogleOptions | undefined,
  onProfileName: (name) => setStartName(name),
});
