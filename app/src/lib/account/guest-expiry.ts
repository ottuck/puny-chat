import { useState } from 'react';

import type { Account } from './auth-state';

// A guest lasts as many days as the app says. Firebase can delete anonymous accounts older than 30
// days (automatic clean-up in the console), so the count starts when the Firebase account was
// created and nothing needs to be stored for it.
const DAY_MS = 24 * 60 * 60 * 1000;

type GuestAccount = Pick<Account, 'guest' | 'createdAt'> | null;

// Days left before the guest account expires, rounded up (all of them right after starting, 1 on
// the last day); null for accounts that are not guests.
export function guestDaysLeft(account: GuestAccount, now: number, days: number): number | null {
  if (!account?.guest || !account.createdAt) return null;
  const expiresAt = Date.parse(account.createdAt) + days * DAY_MS;
  return Math.max(0, Math.ceil((expiresAt - now) / DAY_MS));
}

// Days are counted once per screen visit; precise to the minute is not the point.
export function useGuestDaysLeft(account: GuestAccount, days: number): number | null {
  const [now] = useState(() => Date.now());
  return guestDaysLeft(account, now, days);
}
