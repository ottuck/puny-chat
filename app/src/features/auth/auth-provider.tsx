import type { ReactNode } from 'react';

import { AuthProvider as AccountProvider } from '@/lib/account';
import { auth } from '@/lib/firebase';

// The signed-in user and account (lib/account), for this app's Firebase project.
export { type Account, useAuth } from '@/lib/account';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AccountProvider auth={auth}>{children}</AccountProvider>;
}
