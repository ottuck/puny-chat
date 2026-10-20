import type { BuddyGift, BuddyJob } from './api';
import { isJob } from './jobs';

// What a grown-up makes for one of us at its station, once a day each when it works there
// (docs/fun-improvements.md, 직업 선물). The server picks a number and keeps the gift; this list says
// what that number is, so new kinds come with the app alone. Words are under buddy.gift.<job>.<kind>
// in the translations: its name, the name in the chat line, and the buddy's note with it.
export const GIFTS = {
  BARISTA: ['latte', 'icedAmericano', 'caramelMacchiato', 'matchaLatte', 'chipFrappe'],
  CHEF: ['omurice', 'soup', 'pancakes', 'riceBalls', 'curry'],
  GARDENER: ['basil', 'mint', 'tomatoes', 'rosemary', 'flowers'],
  DJ: ['record1', 'record2', 'record3', 'record4', 'record5'],
  WRITER: ['sea', 'forest', 'stars', 'cat', 'autumn'],
} as const satisfies Record<BuddyJob, readonly string[]>;

export type GiftKind<J extends BuddyJob = BuddyJob> = J extends BuddyJob
  ? { job: J; kind: (typeof GIFTS)[J][number] }
  : never;

// Its words in the translations: the name, the name as said in the chat line, the buddy's note.
type GiftField = 'name' | 'inChat' | 'line';
type GiftKey = {
  [J in BuddyJob]: `buddy.gift.${J}.${(typeof GIFTS)[J][number]}.${GiftField}`;
}[BuddyJob];
export const giftKey = (gift: GiftKind, field: GiftField) =>
  `buddy.gift.${gift.job}.${gift.kind}.${field}` as GiftKey;

export function giftKind(job: BuddyJob, pick: number): GiftKind {
  const kinds: readonly string[] = GIFTS[job];
  return { job, kind: kinds[Math.abs(pick) % kinds.length] } as GiftKind;
}

// The chat line's detail, "<job>:<pick>"; null for a job this app version does not know.
export function giftOfDetail(detail: string | undefined): GiftKind | null {
  const [job, pick] = (detail ?? '').split(':');
  return isJob(job) && pick !== undefined ? giftKind(job, Number(pick) || 0) : null;
}

export function giftOf(gift: BuddyGift): GiftKind | null {
  return isJob(gift.job) ? giftKind(gift.job, gift.pick) : null;
}
