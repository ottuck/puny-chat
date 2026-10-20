import type { BuddyGift, BuddyJob } from './api';
import { isJob } from './jobs';

// What a grown-up does for one of us at its station, once a day each when it works there
// (docs/fun-improvements.md, 직업 선물). The server picks a number and keeps the gift; these lists say
// what that number is, so new kinds come with the app alone.
//
// A barista, a cook and a gardener make something and hand it over in the chat: a word to start
// (buddy.giftOpen.<job>), the thing with its picture (pixel/gifts.ts) and a word about it
// (buddy.gift.<job>.<item>). A DJ goes on air in the chat instead (buddy.radio.<show>), and a writer
// writes a letter that comes to the mailbox (buddy.letter.<letter>).
export const ITEMS = {
  BARISTA: ['latte', 'icedAmericano', 'caramelMacchiato', 'matchaLatte', 'chipFrappe'],
  CHEF: ['omurice', 'ramen', 'pancakes', 'riceBalls', 'gyoza'],
  GARDENER: ['rose', 'tulips', 'sunflower', 'succulent', 'flowers'],
} as const;
export type ItemJob = keyof typeof ITEMS;
const OPENERS = ['o1', 'o2', 'o3', 'o4'] as const;
export const RADIO = ['show1', 'show2', 'show3', 'show4', 'show5', 'show6'] as const;
export const LETTERS = ['letter1', 'letter2', 'letter3', 'letter4', 'letter5', 'letter6'] as const;

export type ItemGift<J extends ItemJob = ItemJob> = J extends ItemJob
  ? {
      kind: 'item';
      job: J;
      item: (typeof ITEMS)[J][number];
      opener: (typeof OPENERS)[number];
    }
  : never;
export type Gift =
  | ItemGift
  | { kind: 'radio'; job: 'DJ'; show: (typeof RADIO)[number] }
  | { kind: 'letter'; job: 'WRITER'; letter: (typeof LETTERS)[number] };

const nth = <T>(list: readonly T[], n: number) => list[Math.abs(n) % list.length];

export function giftFor(job: BuddyJob, pick: number): Gift {
  if (job === 'DJ') return { kind: 'radio', job, show: nth(RADIO, pick) };
  if (job === 'WRITER') return { kind: 'letter', job, letter: nth(LETTERS, pick) };
  // The opener goes by another part of the number, so the same thing comes with different words.
  const items: readonly string[] = ITEMS[job];
  return {
    kind: 'item',
    job,
    item: nth(items, pick),
    opener: nth(OPENERS, Math.floor(Math.abs(pick) / items.length)),
  } as ItemGift;
}

type ItemKey = {
  [J in ItemJob]: `buddy.gift.${J}.${(typeof ITEMS)[J][number]}.${'name' | 'offer'}`;
}[ItemJob];
// The thing's name (for the picture's label) and what the buddy says handing it over.
export const itemKey = (gift: ItemGift, field: 'name' | 'offer') =>
  `buddy.gift.${gift.job}.${gift.item}.${field}` as ItemKey;
export const openerKey = (gift: ItemGift) => `buddy.giftOpen.${gift.job}.${gift.opener}` as const;

// The chat line's detail, "<job>:<pick>"; null for a job this app version does not know.
export function giftOfDetail(detail: string | undefined): Gift | null {
  const [job, pick] = (detail ?? '').split(':');
  return isJob(job) && pick !== undefined ? giftFor(job, Number(pick) || 0) : null;
}

export function giftOf(gift: BuddyGift): Gift | null {
  return isJob(gift.job) ? giftFor(gift.job, gift.pick) : null;
}
