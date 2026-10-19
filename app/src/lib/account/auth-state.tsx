import { type Auth, onIdTokenChanged, type User } from 'firebase/auth';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { linkedProvider } from '../social-auth/account';
import type { ProviderId } from '../social-auth/types';

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
};

const AuthContext = createContext<AuthState>({ user: null, account: null, initializing: true });

const accountOf = (user: User): Account => ({
  guest: user.isAnonymous,
  provider: linkedProvider(user),
  email: user.email,
  createdAt: user.metadata.creationTime,
});

export function AuthProvider({ auth, children }: { auth: Auth; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    account: null,
    initializing: true,
  });

  // Id token rather than auth state: linking Google or Apple to a guest keeps the same user signed
  // in and only issues a new token, and the screens need to see the account is no longer anonymous.
  useEffect(
    () =>
      onIdTokenChanged(auth, (user) =>
        setState({ user, account: user && accountOf(user), initializing: false }),
      ),
    [auth],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
