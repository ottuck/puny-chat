import { type GuestPlace, placeFromUserAgent } from './guest-place-ua';

// Read when asked, not at load: the web is rendered ahead of time in Node, without a browser.
export function currentGuestPlace(): GuestPlace {
  if (typeof navigator === 'undefined') return 'browser';
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return placeFromUserAgent(navigator.userAgent, standalone);
}
