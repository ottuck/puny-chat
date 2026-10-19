// The account side of an Expo app on Firebase Auth's JS SDK: who is signed in, how long a guest
// has left. Kept apart from the app (no `@/` imports, no copy, no server calls) so another app can
// take the folder as it is, together with lib/social-auth, which it builds on.
//
//   auth-state.tsx    AuthProvider (pass the app's Auth) and useAuth(): the user and an Account
//                     summary (guest or not, linked provider, email, created at)
//   guest-expiry.ts   days left for an anonymous guest who lasts N days from creation
export { type Account, AuthProvider, type AuthState, useAuth } from './auth-state';
export { guestDaysLeft, useGuestDaysLeft } from './guest-expiry';
