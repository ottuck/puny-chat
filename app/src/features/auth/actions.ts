import { clearDrafts } from '@/features/chat/draft';
import { unregisterPush } from '@/features/notifications/push';
import { createAccountActions, isTooManyRequests } from '@/lib/account';
import { api } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { reauthenticateLinked } from '@/lib/social-auth';

import { social } from './social';

// Signing in as a guest, out, and deleting the account (lib/account) for this app: deleting removes
// the user's data on our server first (docs/PROJECT.md, 계정 삭제). Leaving the account removes this
// device's push token while still signed in (the server removes only the user's own tokens), then
// the drafts. The Firebase console's automatic clean-up of anonymous accounts after 30 days is on
// on purpose: that is how long a guest lasts (guest-expiry.ts).
export const { signInAsGuest, prepareAccountSwitch, signOut, deleteAccount, cancelStart } =
  createAccountActions({
    auth,
    reauthenticate: () => reauthenticateLinked(auth, social),
    // Running it again after a failed Firebase deletion is harmless, and a request in between only
    // creates an empty user that the retry deletes.
    deleteServerData: () => api<void>('/api/me', { method: 'DELETE' }),
    cleanUpSignedIn: unregisterPush,
    cleanUpDevice: clearDrafts,
  });

// Tells the server right away that the guest has linked an account. The server marks guests as
// such on their requests, and its weekly clean-up deletes guests it still thinks are guests; a
// guest who linked and then left the app would otherwise lose their data. Best effort: the next
// request does the same.
export async function noteAccountLinked(): Promise<void> {
  await api('/api/me').catch((e) => console.warn('telling the server about the link failed', e));
}

// What to tell someone whose start failed: too many new guests from one place passes with time.
export function signInErrorKey(error: unknown): 'signIn.tooMany' | 'signIn.error' {
  return isTooManyRequests(error) ? 'signIn.tooMany' : 'signIn.error';
}
