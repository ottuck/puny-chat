import type { TFunction } from 'i18next';

import en from '@/i18n/locales/en.json';
import { ApiError } from '@/lib/api';

type ErrorKey = keyof typeof en.errors;

// A server error code (or NETWORK) has its own message when `errors.<CODE>` is in the messages, so
// adding the message is all a new code needs; anything else gets a generic one. The keys in
// lower case (loadFailed, unknown) are the screens' own, not codes.
function isCode(code: string): code is ErrorKey {
  return /^[A-Z_]+$/.test(code) && code in en.errors;
}

export function errorMessage(t: TFunction, error: unknown): string {
  const code = error instanceof ApiError ? error.code : null;
  return code && isCode(code) ? t(`errors.${code}`) : t('errors.unknown');
}
