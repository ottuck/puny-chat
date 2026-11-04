import { type Auth, OAuthProvider, revokeAccessToken } from 'firebase/auth';

import { popupProvider } from './popup-provider';
import type { SocialAuthOptions, SocialProvider } from './types';

// Sign in with Apple on the web through Firebase's popup and Apple's page. Needs an Apple
// Services ID whose domains and return URL include the Firebase auth domain (see index.ts).
// The name is asked for (Firebase puts it on the user the first time), so the app does not ask
// again (Guideline 4.0). No email is asked for.
// The popup's result comes after Firebase has signed in, so the app reads the name off the user.
export function appleProvider(
  auth: Auth,
  _options?: Pick<SocialAuthOptions, 'onProfileName'>,
): SocialProvider {
  return popupProvider(auth, {
    id: 'apple',
    provider: () => {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('name');
      return provider;
    },
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
