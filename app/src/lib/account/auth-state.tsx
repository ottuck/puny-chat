import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Auth, onIdTokenChanged, type User } from 'firebase/auth';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { linkedProvider } from '../social-auth/account';
import type { ProviderId } from '../social-auth/types';
import { guestDaysLeft } from './guest-expiry';

// What the screens show about the account. Read off the user each time Firebase reports it:
// linking updates the same User object in place, and the React Compiler, which reuses what it
// computed from an object while the reference stays the same, would keep showing the guest.
export type Account = {
  guest: boolean;
  provider: ProviderId | null;
  email: string | null;
  // When the Firebase account was created (a guest's days count from it).
  createdAt: string | undefined;
};

export type AuthState = {
  user: User | null;
  account: Account | null;
  // True until Firebase has restored (or ruled out) the saved session.
  initializing: boolean;
  // The guest who was signed in on this device is gone because their days were up (Firebase
  // deleted the account), rather than signed out on purpose. Until someone signs in again.
  guestExpired: boolean;
};

const SIGNED_OUT: AuthState = {
  user: null,
  account: null,
  initializing: true,
  guestExpired: false,
};

const AuthContext = createContext<AuthState>(SIGNED_OUT);

// When the guest on this device was created, kept while they are signed in: once Firebase has
// deleted the account it restores no one and says nothing, so this is how the app knows.
const GUEST_KEY = 'account-guest-created';

// Whether the user going away (null) is a guest whose days were up. Best effort: storage may fail.
async function noteGuest(user: User | null, guestDays: number): Promise<boolean> {
  try {
    if (user?.isAnonymous) {
      if (user.metadata.creationTime) {
        await AsyncStorage.setItem(GUEST_KEY, user.metadata.creationTime);
      }
      return false;
    }
    const createdAt = await AsyncStorage.getItem(GUEST_KEY);
    if (createdAt === null) return false;
    await AsyncStorage.removeItem(GUEST_KEY);
    return !user && guestDaysLeft({ guest: true, createdAt }, Date.now(), guestDays) === 0;
  } catch {
    return false;
  }
}

const accountOf = (user: User): Account => ({
  guest: user.isAnonymous,
  provider: linkedProvider(user),
  email: user.email,
  createdAt: user.metadata.creationTime,
});

type AuthProviderProps = {
  auth: Auth;
  // How many days a guest lasts, to tell an expired guest apart (guestExpired). Without it, never.
  guestDays?: number;
  children: ReactNode;
};

export function AuthProvider({ auth, guestDays, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(SIGNED_OUT);

  // Id token rather than auth state: linking Google or Apple to a guest keeps the same user signed
  // in and only issues a new token, and the screens need to see the account is no longer anonymous.
  useEffect(
    () =>
      onIdTokenChanged(auth, (user) => {
        setState((prev) => ({
          user,
          account: user && accountOf(user),
          initializing: false,
          guestExpired: !user && prev.guestExpired,
        }));
        if (guestDays === undefined) return;
        noteGuest(user, guestDays).then((expired) => {
          if (expired) setState((prev) => (prev.user ? prev : { ...prev, guestExpired: true }));
        });
      }),
    [auth, guestDays],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
