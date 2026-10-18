import type { GuestPlace } from './guest-place-ua';

// The app keeps its guest in the app (guest-place.web.ts tells browsers apart).
export function currentGuestPlace(): GuestPlace {
  return 'app';
}
