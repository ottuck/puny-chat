import {
  type Auth,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential,
} from 'firebase/auth';
import { TurboModuleRegistry } from 'react-native';

import { cancelledSignIn, linkUser, signedInUser, unsupportedProvider } from './account';
import type { GoogleOptions, SocialProvider } from './types';

// Google sign-in on the iPhone through Google's own sheet, then Firebase with the id token.
// Needs @react-native-google-signin/google-signin and its config plugin (`iosUrlScheme`) in the
// build. A build made before that has no native module: the provider is then unsupported rather
// than crashing the app on import, so older builds keep working without the Google button.
export function googleProvider(auth: Auth, options?: GoogleOptions): SocialProvider {
  if (!options || !TurboModuleRegistry.get('RNGoogleSignin')) return unsupportedProvider('google');

  let configured = false;
  const googleSheet = async () => {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    if (!configured) {
      GoogleSignin.configure({
        iosClientId: options.iosClientId,
        webClientId: options.webClientId,
      });
      configured = true;
    }
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') throw cancelledSignIn();
    // Not kept signed in with Google itself: the next sign-in asks which account again.
    await GoogleSignin.signOut().catch(() => {});
    if (!response.data.idToken) throw new Error('Google returned no id token.');
    return GoogleAuthProvider.credential(response.data.idToken);
  };

  return {
    id: 'google',
    supported: true,
    signIn: async () => {
      await signInWithCredential(auth, await googleSheet());
    },
    link: async () => {
      const user = signedInUser(auth);
      const credential = await googleSheet();
      await linkUser(
        user,
        () => linkWithCredential(user, credential),
        (e) => GoogleAuthProvider.credentialFromError(e),
      );
    },
    reauthenticate: async () => {
      await reauthenticateWithCredential(signedInUser(auth), await googleSheet());
    },
    switchTo: async (credential) => {
      await signInWithCredential(auth, credential);
    },
  };
}
