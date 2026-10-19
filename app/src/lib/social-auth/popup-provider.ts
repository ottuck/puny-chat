import type { FirebaseError } from 'firebase/app';
import {
  type Auth,
  type AuthCredential,
  type AuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth';

import { linkUser, signedInUser } from './account';
import type { ProviderId, SocialProvider } from './types';

type PopupOptions = {
  id: ProviderId;
  provider: () => AuthProvider;
  credentialFromError: (error: FirebaseError) => AuthCredential | null;
  afterReauthenticate?: (result: UserCredential) => Promise<void>;
};

// A web sign-in through Firebase's popup (Google, Apple). The popup runs on the Firebase auth
// domain, which must be an authorized return address at the provider.
export function popupProvider(auth: Auth, options: PopupOptions): SocialProvider {
  return {
    id: options.id,
    supported: true,
    signIn: async () => {
      await signInWithPopup(auth, options.provider());
    },
    link: async () => {
      const user = signedInUser(auth);
      await linkUser(
        user,
        () => linkWithPopup(user, options.provider()),
        options.credentialFromError,
      );
    },
    reauthenticate: async () => {
      const result = await reauthenticateWithPopup(signedInUser(auth), options.provider());
      await options.afterReauthenticate?.(result);
    },
    switchTo: async (credential) => {
      await signInWithCredential(auth, credential);
    },
  };
}
