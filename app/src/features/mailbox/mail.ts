import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { BuddyGift } from '@/features/buddy/api';
import { type Gift, giftOf } from '@/features/buddy/gifts';
import type { PushState } from '@/features/notifications/push';

// The mailbox on the stage (docs/fun-improvements.md, 우편함): news and letters, written into the
// app (their words are `mailbox.mail.<id>.*` in the translations) and sent with a web deploy or an
// EAS Update; no server. What has been read, and when a letter came, is kept on this device.
// Besides them, the letters a writer buddy wrote me at work (직업 이벤트), which the server keeps; the
// other jobs do theirs in the chat.

export type MailId =
  | 'roomUpdate'
  | 'grownUpLetter'
  | 'topLevelLetter'
  | 'linkAccount'
  | 'guestDays7'
  | 'guestDays3'
  | 'guestDays1'
  | 'pushOff'
  | 'pushInstall';
// A buddy's letter, by the id the server gave the gift.
export type GiftMailId = `gift:${string}`;
export type MailKey = MailId | GiftMailId;
// A button under the letter: to settings to link an account, turning notifications on, or to the
// buddy's details to let it go its own way.
export type MailAction = 'linkAccount' | 'turnOnPush' | 'graduate';
// This account and device right now. Some mail is only for that: a guest, notifications off.
export type Situation = { guestDaysLeft: number | null; push: PushState | null };
export type Mail = {
  id: MailId;
  kind: 'notice' | 'letter' | 'guide';
  // The day it went out ("YYYY-MM-DD"); a letter that comes with a level is dated the day it came.
  date?: string;
  // Only while the room's buddy is at this level or above: it goes once the buddy has gone its own
  // way, and comes again, unread, to the next buddy that gets there.
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

export type GiftMail = {
  id: GiftMailId;
  kind: 'buddyLetter';
  gift: Extract<Gift, { kind: 'letter' }>;
  action?: undefined;
};
export type ShownMail = (Mail | GiftMail) & { date: string };

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
  // The thank-you at the top level, the level a buddy may go its own way from (server: BuddyRules.GRADUATE_AT).
  { id: 'topLevelLetter', kind: 'letter', fromLevel: 60, action: 'graduate' },
  // With the job (server: BuddyRules.JOB_AT): from here a day's messages earn only so much EXP, and care
  // grows it more.
  { id: 'grownUpLetter', kind: 'letter', fromLevel: 10 },
  { id: 'roomUpdate', kind: 'notice', date: '2026-10-17' },
];

const NOTHING: Situation = { guestDaysLeft: null, push: null };

const KEY = 'mailbox';
// `buddy`: for a letter that comes with a level, which of the room's buddies it came to (how many had
// gone their own way by then).
type Saved = {
  read: MailKey[];
  came: Partial<Record<MailId, string>>;
  buddy?: Partial<Record<MailId, number>>;
};
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

function dayOf(time: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
}

const today = () => dayOf(new Date());

// Gifts read are kept only as far back as the server keeps gifts (server: BuddyRules.GIFTS_KEPT).
const GIFTS_READ_KEPT = 30;

export function markRead(id: MailKey) {
  if (saved.read.includes(id)) return;
  const isGift = (key: MailKey) => key.startsWith('gift:');
  const gifts = [...saved.read.filter(isGift), id].filter(isGift).slice(-GIFTS_READ_KEPT);
  const rest = saved.read.filter((key) => !isGift(key));
  save({ ...saved, read: [...rest, ...(isGift(id) ? [] : [id]), ...gifts] });
}

// The mail there is for this room's buddy at `level` and for `now`, newest first, and how much is
// unread. `buddy`: how many of the room's buddies have gone their own way, so the next one is told
// apart from this one. `gifts`: what the buddy made me, newest first (only letters come here).
export function useMailbox(
  level: number,
  now: Situation = NOTHING,
  buddy = 0,
  gifts: readonly BuddyGift[] = [],
) {
  const state = useSyncExternalStore(subscribe, get, get);
  // A level's letter that came to an earlier buddy comes again, as new.
  const earlier = (mail: Mail) =>
    mail.fromLevel !== undefined && (state.buddy?.[mail.id] ?? 0) < buddy;
  const due = MAIL.filter((mail) =>
    mail.fromLevel !== undefined ? level >= mail.fromLevel : !!mail.comes?.(now),
  );
  const missing = due
    .filter((mail) => !state.came[mail.id] || earlier(mail))
    .map((mail) => mail.id);
  useEffect(() => {
    if (missing.length === 0) return;
    const came = { ...saved.came };
    const of = { ...saved.buddy };
    for (const id of missing) {
      came[id] = today();
      of[id] = buddy;
    }
    save({ read: saved.read.filter((id) => !missing.includes(id as MailId)), came, buddy: of });
    // Only when something new is due; `missing` is a fresh array each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.join(',')]);
  const read = state.read.filter((id) => !missing.includes(id as MailId));
  const giftMails: ShownMail[] = gifts.flatMap((gift) => {
    const kind = giftOf(gift);
    return kind?.kind === 'letter'
      ? [
          {
            id: `gift:${gift.id}` as const,
            kind: 'buddyLetter' as const,
            gift: kind,
            date: dayOf(new Date(gift.at)),
          },
        ]
      : [];
  });
  const letters: ShownMail[] = MAIL.filter((mail) => {
    if (mail.comes) {
      const stays = mail.stays ?? mail.comes;
      return stays(now) && (!!state.came[mail.id] || mail.comes(now));
    }
    return mail.fromLevel === undefined || level >= mail.fromLevel;
  }).map((mail) => ({
    ...mail,
    date: mail.date ?? (missing.includes(mail.id) ? undefined : state.came[mail.id]) ?? today(),
  }));
  // A day's gifts above its letters.
  const mails = [...giftMails, ...letters].sort((a, b) => b.date.localeCompare(a.date));
  const unread = mails.filter((mail) => !read.includes(mail.id)).length;
  return { mails, unread, read };
}
