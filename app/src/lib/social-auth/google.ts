import type { Auth } from 'firebase/auth';

import { unsupportedProvider } from './account';
import type { SocialProvider } from './types';

// Native Google sign-in needs a native module and an iOS OAuth client, not set up yet.
export function googleProvider(_auth: Auth): SocialProvider {
  return unsupportedProvider('google');
}
