import { type Auth, GoogleAuthProvider } from 'firebase/auth';

import { popupProvider } from './popup-provider';
import type { SocialProvider } from './types';

export function googleProvider(auth: Auth): SocialProvider {
  return popupProvider(auth, {
    id: 'google',
    provider: () => new GoogleAuthProvider(),
    credentialFromError: (e) => GoogleAuthProvider.credentialFromError(e),
  });
}
