import {
  type Auth,
  deleteUser,
  signInAnonymously,
  signOut as firebaseSignOut,
} from 'firebase/auth';

export type AccountActionsOptions = {
  auth: Auth;
  // Before deleting: sign in again just now, since Firebase deletes an account only after a recent
  // sign-in (lib/social-auth's reauthenticateLinked). Throwing (e.g. cancelled) stops the deletion.
  reauthenticate?: () => Promise<void>;
  // Deletes the user's data on the app's server. A failure stops the deletion.
  deleteServerData: () => Promise<void>;
  // Before leaving the account, while still signed in: what only the user may undo on the server,
  // e.g. this device's push token. Best effort: a failure is logged.
  cleanUpSignedIn?: () => Promise<void>;
  // Then what is the user's on this device (drafts, caches). Best effort too.
  cleanUpDevice?: () => Promise<void>;
};

export function createAccountActions(options: AccountActionsOptions) {
  const { auth } = options;

  const cleanUpSignedIn = async () =>
    options
      .cleanUpSignedIn?.()
      .catch((e) => console.warn('cleaning up before leaving the account failed', e));
  const cleanUpDevice = async () =>
    options
      .cleanUpDevice?.()
      .catch((e) => console.warn('clearing this device for the next user failed', e));

  async function cleanUp(): Promise<void> {
    await cleanUpSignedIn();
    await cleanUpDevice();
  }

  // A Firebase anonymous account, so there is a uid for the server like any other sign-in. Google
  // or Apple can be linked later without changing it (lib/social-auth, linkOrSwitch). Needs the
  // Anonymous provider in the Firebase console.
  async function signInAsGuest(): Promise<void> {
    await signInAnonymously(auth);
  }

  // Before leaving the guest for an existing Google or Apple account (linkOrSwitch's beforeSwitch):
  // what belongs to the guest on this device goes.
  async function prepareAccountSwitch(): Promise<void> {
    await cleanUp();
  }

  async function signOut(): Promise<void> {
    await cleanUp();
    await firebaseSignOut(auth);
  }

  // Deletes the account (App Store Guideline 5.1.1(v)): first the user's data on the server, then
  // the Firebase account, which signs out. A linked account confirms with Google or Apple first,
  // since Firebase deletes only after a recent sign-in, and asking later would leave the server data
  // gone but the account still there. A failure is thrown, not hidden: see below.
  async function deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    await options.reauthenticate?.();
    await cleanUpSignedIn();
    await options.deleteServerData();
    await cleanUpDevice();
    // If this fails the account is not deleted, so it is not reported as done: the user stays
    // signed in and can try again. The server steps should be safe to run again.
    await deleteUser(user);
  }

  // Backing out right after starting, before doing anything: a guest made a moment ago is deleted
  // (nothing of theirs is worth keeping, and no empty account is left behind); an account just
  // signs out.
  async function cancelStart(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    if (!user.isAnonymous) return signOut();
    try {
      await deleteAccount();
    } catch (e) {
      console.warn('deleting the new guest failed; signing out', e);
      await signOut();
    }
  }

  return { signInAsGuest, prepareAccountSwitch, signOut, deleteAccount, cancelStart };
}

// Firebase allows only so many new accounts (guests too) from one place in a while, e.g. starting
// over and over while trying the app; it passes with time.
export function isTooManyRequests(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'auth/too-many-requests';
}
