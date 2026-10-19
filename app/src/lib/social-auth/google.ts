import type { Auth } from 'firebase/auth';

import { unsupportedProvider } from './account';
import type { GoogleOptions, SocialProvider } from './types';

// Google sign-in is on the web (google.web.ts) and the iPhone (google.ios.ts); Android later.
export function googleProvider(_auth: Auth, _options?: GoogleOptions): SocialProvider {
  return unsupportedProvider('google');
}
