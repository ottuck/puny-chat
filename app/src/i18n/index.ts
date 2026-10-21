import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { josa, type JosaPair } from './josa';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zhHant from './locales/zh-Hant.json';

export const resources = {
  ja: { translation: ja satisfies typeof en }, // same keys as English
  ko: { translation: ko satisfies typeof en },
  'zh-Hant': { translation: zhHant satisfies typeof en }, // Traditional, for Taiwan
  en: { translation: en },
} as const;

export type Language = keyof typeof resources;

const FALLBACK_LANGUAGE: Language = 'en';

function isLanguage(code: string | null): code is Language {
  return code !== null && code in resources;
}

// Chinese in either script reads the Traditional one: the app is not sold in mainland China
// (docs/release.md), and Simplified readers can read Traditional better than English.
const BY_LANGUAGE_CODE: Record<string, Language> = { zh: 'zh-Hant' };

// First supported language in the user's device order, otherwise English.
export function detectLanguage(): Language {
  for (const { languageCode } of getLocales()) {
    const language = languageCode && (BY_LANGUAGE_CODE[languageCode] ?? languageCode);
    if (isLanguage(language)) return language;
  }
  return FALLBACK_LANGUAGE;
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes.
});

// Korean particles after names, e.g. "{{buddy, 이가}} 배고파졌어요" → "하늘이 배고파졌어요".
for (const pair of ['이가', '은는', '과와', '을를'] satisfies JosaPair[]) {
  i18n.services.formatter?.add(pair, (value) => josa(String(value), pair));
}

export default i18n;
