import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';

import { AccountInUseError } from './account-in-use';

export const googleSignInSupported = true;

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

// Adds Google sign-in to the current guest account. The Firebase uid stays the same, so the
// server keeps the user, room and messages as they are.
export async function linkGoogle(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  try {
    await linkWithPopup(user, new GoogleAuthProvider());
  } catch (e) {
    if (e instanceof FirebaseError && e.code === 'auth/credential-already-in-use') {
      const credential = GoogleAuthProvider.credentialFromError(e);
      if (credential) throw new AccountInUseError(credential);
    }
    throw e;
  }
  // Refreshes the token so listeners see the account is no longer anonymous.
  await user.getIdToken(true);
}

// Signs in with Google again, just now. Firebase deletes an account only after a recent sign-in.
export async function reauthenticateGoogle(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
}
