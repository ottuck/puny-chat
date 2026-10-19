import type { Auth } from 'firebase/auth';

import { unsupportedProvider } from './account';
import type { SocialProvider } from './types';

// Sign in with Apple is on the iPhone (apple.ios.ts) and the web (apple.web.ts); Android later.
export function appleProvider(_auth: Auth): SocialProvider {
  return unsupportedProvider('apple');
}
