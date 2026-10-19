import { type Auth, GoogleAuthProvider } from 'firebase/auth';

import { popupProvider } from './popup-provider';
import type { GoogleOptions, SocialProvider } from './types';

// The web needs no client ids: Firebase's popup uses the project's own web client.
export function googleProvider(auth: Auth, _options?: GoogleOptions): SocialProvider {
  return popupProvider(auth, {
    id: 'google',
    provider: () => new GoogleAuthProvider(),
    credentialFromError: (e) => GoogleAuthProvider.credentialFromError(e),
  });
}
