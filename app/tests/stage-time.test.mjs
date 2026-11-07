import assert from 'node:assert/strict';
import test from 'node:test';

import { asleepAt, roomTime } from '../src/features/buddy/components/stage/room-time.ts';

test('the buddy sleeps from 23 to 7, the DJ from 3 to 11', () => {
  const hours = (job) => [...Array(24).keys()].filter((hour) => asleepAt(job, hour));
  assert.deepEqual(hours(null), [0, 1, 2, 3, 4, 5, 6, 23]);
  assert.deepEqual(hours('CHEF'), [0, 1, 2, 3, 4, 5, 6, 23]);
  assert.deepEqual(hours('DJ'), [3, 4, 5, 6, 7, 8, 9, 10]);
});

test("the room's time is the device's unless the preview picks an hour or a day", () => {
  const clock = new Date(2026, 10, 7, 14, 35);
  assert.equal(roomTime(clock), clock);
  assert.deepEqual(roomTime(clock, 21), new Date(2026, 10, 7, 21, 10));
  assert.deepEqual(roomTime(clock, undefined, '02-14'), new Date(2026, 1, 14, 14, 35));
  assert.deepEqual(roomTime(clock, 3, '2025-09-07'), new Date(2025, 8, 7, 3, 10));
});
