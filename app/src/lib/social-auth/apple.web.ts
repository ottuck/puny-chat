import { type Auth, OAuthProvider, revokeAccessToken } from 'firebase/auth';

import { popupProvider } from './popup-provider';
import type { SocialProvider } from './types';

// Sign in with Apple on the web through Firebase's popup and Apple's page. Needs an Apple
// Services ID whose domains and return URL include the Firebase auth domain (see index.ts).
// No name or email is asked for.
export function appleProvider(auth: Auth): SocialProvider {
  return popupProvider(auth, {
    id: 'apple',
    provider: () => new OAuthProvider('apple.com'),
    credentialFromError: (e) => OAuthProvider.credentialFromError(e),
    // Apple asks for its tokens to be revoked when an account is deleted. A failure stops the
    // deletion before data is lost.
    afterReauthenticate: async (result) => {
      const accessToken = OAuthProvider.credentialFromResult(result)?.accessToken;
      if (!accessToken) throw new Error('Apple returned no access token.');
      await revokeAccessToken(auth, accessToken);
    },
  });
}
