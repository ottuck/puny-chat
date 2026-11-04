import type { Auth } from 'firebase/auth';

import { unsupportedProvider } from './account';
import type { SocialAuthOptions, SocialProvider } from './types';

// Sign in with Apple is on the iPhone (apple.ios.ts) and the web (apple.web.ts); Android later.
export function appleProvider(
  _auth: Auth,
  _options?: Pick<SocialAuthOptions, 'onProfileName'>,
): SocialProvider {
  return unsupportedProvider('apple');
}
