// Where a guest made on the web lives (docs/PROJECT.md, 게스트 우선). Each browser, each app's
// in-app browser and the home screen web app keeps its own storage, so its own guest: opened
// anywhere else, puny-chat starts someone new.
export type GuestPlace =
  | 'app'
  | 'homeScreen'
  | 'kakaotalk'
  | 'line'
  | 'inAppBrowser'
  | 'samsung'
  | 'edge'
  | 'firefox'
  | 'chrome'
  | 'safari'
  | 'browser';

// In-app browsers first: they look like Safari or Chrome too. Links are mostly shared in KakaoTalk
// (Korea) and LINE (Japan), so those two are named.
export function placeFromUserAgent(userAgent: string, standalone: boolean): GuestPlace {
  if (/KAKAOTALK/i.test(userAgent)) return 'kakaotalk';
  if (/\bLine\//.test(userAgent)) return 'line';
  if (/Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|DaumApps/i.test(userAgent)) return 'inAppBrowser';
  if (standalone) return 'homeScreen';
  if (/SamsungBrowser/.test(userAgent)) return 'samsung';
  if (/EdgiOS|Edg\//.test(userAgent)) return 'edge';
  if (/FxiOS|Firefox\//.test(userAgent)) return 'firefox';
  if (/CriOS|Chrome\//.test(userAgent)) return 'chrome';
  if (/Safari\//.test(userAgent)) return 'safari';
  return 'browser';
}

// A guest in an in-app browser is the hardest to find again: the app may clear it, and links
// opened later from elsewhere go to another browser.
export function isInAppBrowser(place: GuestPlace): boolean {
  return place === 'kakaotalk' || place === 'line' || place === 'inAppBrowser';
}
