import type { AuthCredential } from 'firebase/auth';

export type ProviderId = 'google' | 'apple';

// OAuth client ids for native Google sign-in (public, from the Firebase project): the iOS client,
// and the web client, which Firebase checks the Google id token against.
export type GoogleOptions = {
  iosClientId: string;
  webClientId: string;
};

export type SocialAuthOptions = {
  google?: GoogleOptions;
};

// One way to sign in (Google, Apple) on this platform, bound to a Firebase Auth instance.
export type SocialProvider = {
  id: ProviderId;
  // False where this build cannot use it; the methods then throw.
  supported: boolean;
  signIn(): Promise<void>;
  // Adds this sign-in to the signed-in user (usually an anonymous guest). The uid stays the same,
  // so nothing has to move on a server. Throws AccountInUseError if the account belongs to
  // another user already.
  link(): Promise<void>;
  // Signs in again, just now: Firebase deletes an account only after a recent sign-in. Also revokes
  // what the provider asks to be revoked when an account is deleted (Apple's tokens).
  reauthenticate(): Promise<void>;
  // Leaves the current user for the existing account an AccountInUseError carries.
  switchTo(credential: AuthCredential): Promise<void>;
};
