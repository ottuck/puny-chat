import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { FirebaseError } from 'firebase/app';
import {
  linkWithCredential,
  OAuthProvider,
  reauthenticateWithCredential,
  revokeAccessToken,
  signInWithCredential,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';

import { AccountInUseError } from './account-in-use';

// Sign in with Apple (App Store Guideline 4.8), through Apple's own sheet and then Firebase.
// Needs the Apple provider in the Firebase console and `ios.usesAppleSignIn` (app.json).
export const appleSignInSupported = true;

// No name or email is asked for: the name comes from the app's own name screen.
async function appleSignIn() {
  // Ties Apple's token to this request: Apple gets the SHA-256 of the nonce, Firebase the raw one.
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const result = await AppleAuthentication.signInAsync({ nonce });
  if (!result.identityToken) throw new Error('Apple returned no identity token.');
  const credential = new OAuthProvider('apple.com').credential({
    idToken: result.identityToken,
    rawNonce,
  });
  return { credential, authorizationCode: result.authorizationCode };
}

export async function signInWithApple(): Promise<void> {
  const { credential } = await appleSignIn();
  await signInWithCredential(auth, credential);
}

// Adds Apple sign-in to the current guest account. The Firebase uid stays the same, so the server
// keeps the user, room and messages as they are.
export async function linkApple(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const { credential } = await appleSignIn();
  try {
    await linkWithCredential(user, credential);
  } catch (e) {
    if (e instanceof FirebaseError && e.code === 'auth/credential-already-in-use') {
      const existing = OAuthProvider.credentialFromError(e);
      if (existing) throw new AccountInUseError(existing);
    }
    throw e;
  }
  // Refreshes the token so listeners see the account is no longer anonymous.
  await user.getIdToken(true);
}

// Signs in with Apple again, just now: Firebase deletes an account only after a recent sign-in.
// Also revokes the app's Apple tokens, which Apple asks for when an account is deleted (needs the
// Services ID and key in the Firebase Apple provider); a failure there does not stop the deletion.
export async function reauthenticateApple(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const { credential, authorizationCode } = await appleSignIn();
  await reauthenticateWithCredential(user, credential);
  if (authorizationCode) {
    await revokeAccessToken(auth, authorizationCode).catch((e) =>
      console.warn('revoking the Apple token failed', e),
    );
  }
}
