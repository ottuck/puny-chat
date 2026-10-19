import type { FirebaseError } from 'firebase/app';
import type { Auth, AuthCredential, User } from 'firebase/auth';

import type { ProviderId, SocialProvider } from './types';

// The platform-free part of social sign-in. Imports types only, so it runs under plain Node in
// tests (tests/social-auth.test.mjs).

// The account being linked already belongs to another user. Linking would merge two users, which
// is not supported; the caller may switch to that account instead (linkOrSwitch).
export class AccountInUseError extends Error {
  readonly credential: AuthCredential;

  constructor(credential: AuthCredential) {
    super('This account is already in use.');
    this.credential = credential;
  }
}

const CANCELLED = 'ERR_REQUEST_CANCELED';

// What a native sheet that reports cancelling as a result (Google's) throws instead, so callers see
// one kind of cancel.
export function cancelledSignIn(): Error {
  return Object.assign(new Error('Sign-in was cancelled.'), { code: CANCELLED });
}

// The user closed the popup or a sign-in sheet, or started another one; not worth an error message.
export function isCancelledSignIn(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === CANCELLED
  );
}

// Which sign-in a user has linked; null for a guest.
export function linkedProvider(user: User): ProviderId | null {
  if (user.isAnonymous) return null;
  return user.providerData.some((p) => p.providerId === 'apple.com') ? 'apple' : 'google';
}

// Signs the current user in again with the provider they linked, e.g. before deleting the account
// (Firebase deletes only after a recent sign-in); nothing for a guest or no one.
export async function reauthenticateLinked(
  auth: Auth,
  providers: Record<ProviderId, Pick<SocialProvider, 'reauthenticate'>>,
): Promise<void> {
  const provider = auth.currentUser && linkedProvider(auth.currentUser);
  if (provider) await providers[provider].reauthenticate();
}

export function signedInUser(auth: Auth): User {
  if (!auth.currentUser) throw new Error('Not signed in.');
  return auth.currentUser;
}

// Runs a provider's link, turning Firebase's "already in use" into AccountInUseError, then
// refreshes the token so id-token listeners see the user is no longer anonymous.
export async function linkUser(
  user: User,
  link: () => Promise<unknown>,
  credentialFromError: (error: FirebaseError) => AuthCredential | null,
): Promise<void> {
  try {
    await link();
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === 'auth/credential-already-in-use') {
      const existing = credentialFromError(e as FirebaseError);
      if (existing) throw new AccountInUseError(existing);
    }
    throw e;
  }
  await user.getIdToken(true);
}

export type LinkOutcome = 'linked' | 'switched' | 'kept' | 'cancelled';

type SwitchOptions = {
  // Asks whether to leave the current user for the existing account. On the web this runs right
  // after a popup: Chrome shows window.confirm() only once the page has focus again.
  confirmSwitch: () => Promise<boolean>;
  // Cleans up what belongs to the current user on this device before switching.
  beforeSwitch?: () => Promise<void>;
};

// Links a sign-in to the current user; if the account already has its own user, asks and switches
// to it. Cancelling the sign-in is an outcome, not an error. Anything else is thrown.
export async function linkOrSwitch(
  provider: SocialProvider,
  { confirmSwitch, beforeSwitch }: SwitchOptions,
): Promise<LinkOutcome> {
  try {
    await provider.link();
    return 'linked';
  } catch (e) {
    if (isCancelledSignIn(e)) return 'cancelled';
    if (!(e instanceof AccountInUseError)) throw e;
    if (!(await confirmSwitch())) return 'kept';
    await beforeSwitch?.();
    await provider.switchTo(e.credential);
    return 'switched';
  }
}

// For a platform without this sign-in.
export function unsupportedProvider(id: ProviderId): SocialProvider {
  const fail = async () => {
    throw new Error(`Sign-in with ${id} is not available here.`);
  };
  return {
    id,
    supported: false,
    signIn: fail,
    link: fail,
    reauthenticate: fail,
    switchTo: fail,
  };
}
