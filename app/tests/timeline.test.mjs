import assert from 'node:assert/strict';
import test from 'node:test';

import { foldLevelUps, nothingSaidYet, runPosition } from '../src/features/chat/timeline.ts';

const levelUp = (level, createdAt) => ({
  type: 'BUDDY_EVENT',
  event: 'LEVELED_UP',
  level,
  createdAt,
  clientMessageId: `level-${level}`,
});
const text = (id, createdAt) => ({
  type: 'TEXT',
  senderId: 'a',
  text: 'hi',
  createdAt,
  clientMessageId: id,
});

test("past the grown level only the day's newest level up stays", () => {
  // Newest first.
  const day = [
    levelUp(24, '2026-10-15T15:00:00'),
    text('t3', '2026-10-15T14:00:00'),
    levelUp(23, '2026-10-15T13:00:00'),
    levelUp(22, '2026-10-15T12:00:00'),
    levelUp(21, '2026-10-14T12:00:00'),
    levelUp(20, '2026-10-14T11:00:00'),
    levelUp(19, '2026-10-14T10:00:00'),
  ];
  const kept = foldLevelUps(day, 20).map((m) => m.clientMessageId);
  assert.deepEqual(kept, ['level-24', 't3', 'level-21', 'level-20', 'level-19']);
});

test('up to the grown level every level up stays', () => {
  const day = [levelUp(12, '2026-10-15T12:00:00'), levelUp(11, '2026-10-15T11:00:00')];
  assert.equal(foldLevelUps(day, 20).length, 2);
});

test('the note that the friend came in alone still counts as nothing said', () => {
  const joined = {
    type: 'SYSTEM',
    event: 'MEMBER_JOINED',
    actorName: 'Yuki',
    clientMessageId: 'j',
  };
  const left = { type: 'SYSTEM', event: 'MEMBER_LEFT', actorName: 'Yuki', clientMessageId: 'l' };
  assert.equal(nothingSaidYet([]), true);
  assert.equal(nothingSaidYet([joined]), true);
  assert.equal(nothingSaidYet([text('t1', '2026-10-18T12:00:00'), joined]), false);
  assert.equal(nothingSaidYet([left, joined]), false);
});

test('a photo joins the run of texts the same member sent that minute', () => {
  const photo = {
    type: 'PHOTO',
    senderId: 'a',
    photo: { width: 100, height: 100 },
    createdAt: '2026-10-19T10:00:30Z',
    clientMessageId: 'p1',
  };
  // Newest first.
  const messages = [photo, text('t1', '2026-10-19T10:00:10Z')];
  assert.deepEqual(runPosition(messages, 0), { continuesOlder: true, showTime: true });
  assert.deepEqual(runPosition(messages, 1), { continuesOlder: false, showTime: false });
  assert.equal(nothingSaidYet([photo]), false);
});
