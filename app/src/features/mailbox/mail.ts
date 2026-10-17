import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

// The mailbox on the stage (docs/fun-improvements.md, 우편함): news and letters, written into the
// app (their words are `mailbox.mail.<id>.*` in the translations) and sent with a web deploy or an
// EAS Update; no server. What has been read, and when a letter came, is kept on this device.

export type MailId = 'roomUpdate' | 'topLevelLetter';
export type Mail = {
  id: MailId;
  kind: 'notice' | 'letter';
  // The day it went out ("YYYY-MM-DD"); a letter that comes with a level is dated the day it came.
  date?: string;
  // Only once the room's buddy has reached this level; kept after, even once it has gone its own way.
  fromLevel?: number;
};

// Newest at the top of the list; add new ones here.
export const MAIL: readonly Mail[] = [
  { id: 'topLevelLetter', kind: 'letter', fromLevel: 60 },
  { id: 'roomUpdate', kind: 'notice', date: '2026-10-17' },
];

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

// The mail there is for this room's buddy at `level`, newest first, and how much is unread.
export function useMailbox(level: number) {
  const state = useSyncExternalStore(subscribe, get, get);
  const due = MAIL.filter((mail) => mail.fromLevel !== undefined && level >= mail.fromLevel);
  const missing = due.filter((mail) => !state.came[mail.id]).map((mail) => mail.id);
  useEffect(() => {
    if (missing.length === 0) return;
    const came = { ...saved.came };
    for (const id of missing) came[id] = today();
    save({ ...saved, came });
    // Only when something new is due; `missing` is a fresh array each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.join(',')]);
  const mails = MAIL.filter(
    (mail) => mail.fromLevel === undefined || state.came[mail.id] || level >= mail.fromLevel,
  )
    .map((mail) => ({ ...mail, date: mail.date ?? state.came[mail.id] ?? today() }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const unread = mails.filter((mail) => !state.read.includes(mail.id)).length;
  return { mails, unread, read: state.read };
}
