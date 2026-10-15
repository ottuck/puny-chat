import assert from 'node:assert/strict';
import test from 'node:test';

import { foldLevelUps } from '../src/features/chat/timeline.ts';

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
