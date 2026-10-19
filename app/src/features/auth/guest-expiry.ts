import { type Account, useGuestDaysLeft as useDaysLeft } from '@/lib/account';

// Guests can use the app for 30 days (docs/PROJECT.md, 게스트 우선): the Firebase console's
// automatic clean-up deletes anonymous accounts older than that, and nothing is stored for it here
// or on the server (lib/account/guest-expiry.ts).
export const GUEST_DAYS = 30;

export const useGuestDaysLeft = (account: Account | null) => useDaysLeft(account, GUEST_DAYS);
