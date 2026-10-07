import { type AuthCredential, signInWithCredential } from 'firebase/auth';

import { auth } from '@/lib/firebase';

// The account being linked (Google or Apple) already belongs to another puny-chat user. Linking
// would merge two users, which is not supported; the caller may switch to that account instead.
export class AccountInUseError extends Error {
  constructor(readonly credential: AuthCredential) {
    super('This account is already in use.');
  }
}

// Leaves the guest account for the existing one. The guest's data stays on the server but can no
// longer be reached from this device.
export async function switchToExisting(credential: AuthCredential): Promise<void> {
  await signInWithCredential(auth, credential);
}
