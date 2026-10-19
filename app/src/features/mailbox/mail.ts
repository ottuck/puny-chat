import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { PushState } from '@/features/notifications/push';

// The mailbox on the stage (docs/fun-improvements.md, 우편함): news and letters, written into the
// app (their words are `mailbox.mail.<id>.*` in the translations) and sent with a web deploy or an
// EAS Update; no server. What has been read, and when a letter came, is kept on this device.

export type MailId =
  | 'roomUpdate'
  | 'topLevelLetter'
  | 'linkAccount'
  | 'guestDays7'
  | 'guestDays3'
  | 'guestDays1'
  | 'pushOff'
  | 'pushInstall';
// A button under the letter: to settings to link an account, or turning notifications on.
export type MailAction = 'linkAccount' | 'turnOnPush';
// This account and device right now. Some mail is only for that: a guest, notifications off.
export type Situation = { guestDaysLeft: number | null; push: PushState | null };
export type Mail = {
  id: MailId;
  kind: 'notice' | 'letter' | 'guide';
  // The day it went out ("YYYY-MM-DD"); a letter that comes with a level is dated the day it came.
  date?: string;
  // Only once the room's buddy has reached this level; kept after, even once it has gone its own way.
  fromLevel?: number;
  // Comes when this holds and stays while `stays` does (the same if not given), dated the day it
  // came: it goes once the account is linked or notifications are on.
  comes?: (now: Situation) => boolean;
  stays?: (now: Situation) => boolean;
  action?: MailAction;
};

const guest = (now: Situation) => now.guestDaysLeft !== null;
const daysLeftAtMost = (days: number) => (now: Situation) =>
  now.guestDaysLeft !== null && now.guestDaysLeft <= days;
// Each of the last week's letters comes in its own stretch, so a guest away for days gets the one
// due now rather than all of them at once. The server sends the same as a push.
const daysLeftBetween = (most: number, least: number) => (now: Situation) =>
  now.guestDaysLeft !== null && now.guestDaysLeft <= most && now.guestDaysLeft > least;
// The web starts with notifications off (the browser asks only on a tap), and an iPhone's Safari
// gets none until the site is on the home screen. The app asks by itself.
const webPush = (state: PushState) => (now: Situation) =>
  Platform.OS === 'web' && now.push === state;

// Newest at the top of the list (same day: in this order); add new ones here.
export const MAIL: readonly Mail[] = [
  {
    id: 'guestDays1',
    kind: 'guide',
    comes: daysLeftAtMost(1),
    action: 'linkAccount',
  },
  {
    id: 'guestDays3',
    kind: 'guide',
    comes: daysLeftBetween(3, 1),
    stays: daysLeftAtMost(3),
    action: 'linkAccount',
  },
  {
    id: 'guestDays7',
    kind: 'guide',
    comes: daysLeftBetween(7, 3),
    stays: daysLeftAtMost(7),
    action: 'linkAccount',
  },
  { id: 'pushOff', kind: 'guide', comes: webPush('off'), action: 'turnOnPush' },
  { id: 'pushInstall', kind: 'guide', comes: webPush('needsInstall'), action: 'linkAccount' },
  { id: 'linkAccount', kind: 'guide', comes: guest, action: 'linkAccount' },
  { id: 'topLevelLetter', kind: 'letter', fromLevel: 60 },
  { id: 'roomUpdate', kind: 'notice', date: '2026-10-17' },
];

const NOTHING: Situation = { guestDaysLeft: null, push: null };

const KEY = 'mailbox';
type Saved = { read: MailId[]; came: Partial<Record<MailId, string>> };
let saved: Saved = { read: [], came: {} };
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    AsyncStorage.getItem(KEY)
      .then((text) => {
        if (text) saved = { ...saved, ...(JSON.parse(text) as Partial<Saved>) };
        listeners.forEach((l) => l());
      })
      .catch(() => {});
  }
  return () => listeners.delete(listener);
}

function get() {
  return saved;
}

function save(next: Saved) {
  saved = next;
  listeners.forEach((listener) => listener());
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function markRead(id: MailId) {
  if (saved.read.includes(id)) return;
  save({ ...saved, read: [...saved.read, id] });
}

// The mail there is for this room's buddy at `level` and for `now`, newest first, and how much is
// unread.
export function useMailbox(level: number, now: Situation = NOTHING) {
  const state = useSyncExternalStore(subscribe, get, get);
  const due = MAIL.filter((mail) =>
    mail.fromLevel !== undefined ? level >= mail.fromLevel : !!mail.comes?.(now),
  );
  const missing = due.filter((mail) => !state.came[mail.id]).map((mail) => mail.id);
  useEffect(() => {
    if (missing.length === 0) return;
    const came = { ...saved.came };
    for (const id of missing) came[id] = today();
    save({ ...saved, came });
    // Only when something new is due; `missing` is a fresh array each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.join(',')]);
  const mails = MAIL.filter((mail) => {
    if (mail.comes) {
      const stays = mail.stays ?? mail.comes;
      return stays(now) && (!!state.came[mail.id] || mail.comes(now));
    }
    return mail.fromLevel === undefined || state.came[mail.id] || level >= mail.fromLevel;
  })
    .map((mail) => ({ ...mail, date: mail.date ?? state.came[mail.id] ?? today() }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const unread = mails.filter((mail) => !state.read.includes(mail.id)).length;
  return { mails, unread, read: state.read };
}
