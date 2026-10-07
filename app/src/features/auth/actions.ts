import { FirebaseError } from 'firebase/app';
import {
  deleteUser,
  signInAnonymously,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

import { unregisterPush } from '@/features/notifications/push';
import { api } from '@/lib/api';
import { auth } from '@/lib/firebase';

import { reauthenticateApple } from './apple-sign-in';
import { reauthenticateGoogle } from './google-sign-in';

// "Start now": a Firebase anonymous account, so there is a uid for the server like any other
// sign-in. Google (or Apple) can be linked later without changing it (docs/product.md).
// Needs the Anonymous provider in the Firebase console. Its automatic clean-up of anonymous
// accounts after 30 days is on on purpose: that is how long a guest lasts (guest-expiry.ts).
export async function signInAsGuest(): Promise<void> {
  await signInAnonymously(auth);
}

// Leaves the guest account for an existing Google or Apple account (see AccountInUseError).
export async function switchAccount(switchTo: () => Promise<void>): Promise<void> {
  await unregisterPush().catch((e) => console.warn('removing the push token failed', e));
  await switchTo();
}

export async function signOut(): Promise<void> {
  // While still signed in: the server removes only the user's own tokens.
  await unregisterPush().catch((e) => console.warn('removing the push token failed', e));
  await firebaseSignOut(auth);
}

// Deletes the account (App Store Guideline 5.1.1(v)): first the user's data on the server, then
// the Firebase account, which signs out. A linked account confirms with Google or Apple first, since
// Firebase deletes only after a recent sign-in, and asking later would leave the server data gone
// but the account still there.
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  if (linkedProvider(user) === 'apple') await reauthenticateApple();
  else if (!user.isAnonymous) await reauthenticateGoogle();
  await unregisterPush().catch((e) => console.warn('removing the push token failed', e));
  await api<void>('/api/me', { method: 'DELETE' });
  await deleteUser(user).catch(async (e) => {
    // Nothing is left on the server either way; at least leave this device signed out.
    console.warn('deleting the Firebase account failed', e);
    await firebaseSignOut(auth);
  });
}

// Which account a signed-in user has linked; null for a guest.
export function linkedProvider(user: User): 'google' | 'apple' | null {
  if (user.isAnonymous) return null;
  return user.providerData.some((p) => p.providerId === 'apple.com') ? 'apple' : 'google';
}

// The user closed the popup or Apple's sheet, or started another one; not worth an error message.
export function isCancelledSignIn(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return (
      error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request'
    );
  }
  return (error as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED';
}
