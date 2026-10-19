// The account side of an Expo app on Firebase Auth's JS SDK: who is signed in, how long a guest
// has left. Kept apart from the app (no `@/` imports, no copy, no server calls) so another app can
// take the folder as it is, together with lib/social-auth, which it builds on.
//
//   auth-state.tsx    AuthProvider (pass the app's Auth) and useAuth(): the user and an Account
//                     summary (guest or not, linked provider, email, created at)
//                     and, given guestDays, whether a guest on this device is gone because their
//                     days were up (guestExpired; remembered in AsyncStorage while signed in)
//   guest-expiry.ts   days left for an anonymous guest who lasts N days from creation
//   actions.ts        signing in as a guest, out, and deleting the account in a safe order: the
//                     app passes its server's deletion and what to clean up when leaving
export { type AccountActionsOptions, createAccountActions, isTooManyRequests } from './actions';
export { type Account, AuthProvider, type AuthState, useAuth } from './auth-state';
export { guestDaysLeft, useGuestDaysLeft } from './guest-expiry';
