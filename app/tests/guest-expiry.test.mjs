import assert from 'node:assert/strict';
import test from 'node:test';

import { guestDaysLeft } from '../src/lib/account/guest-expiry.ts';

const DAY = 24 * 60 * 60 * 1000;
const createdAt = '2026-10-01T00:00:00.000Z';
const start = Date.parse(createdAt);
const guest = { guest: true, createdAt };

test('all the days right after starting, 1 on the last day, then 0', () => {
  assert.equal(guestDaysLeft(guest, start, 30), 30);
  assert.equal(guestDaysLeft(guest, start + 1, 30), 30);
  assert.equal(guestDaysLeft(guest, start + 29 * DAY + 1, 30), 1);
  assert.equal(guestDaysLeft(guest, start + 30 * DAY, 30), 0);
  assert.equal(guestDaysLeft(guest, start + 40 * DAY, 30), 0);
  assert.equal(guestDaysLeft(guest, start + 1, 7), 7);
});

test('only guests with a known start have days left', () => {
  assert.equal(guestDaysLeft(null, start, 30), null);
  assert.equal(guestDaysLeft({ guest: false, createdAt }, start, 30), null);
  assert.equal(guestDaysLeft({ guest: true, createdAt: undefined }, start, 30), null);
});
