import assert from 'node:assert/strict';
import test from 'node:test';

import { isFullMoon, nextFullMoon } from '../src/features/buddy/moon.ts';

// Full moons, at the time of a lunar eclipse (which only happens then).
const FULL = [
  '2024-09-18T02:34:00Z',
  '2025-03-14T06:55:00Z',
  '2025-09-07T18:09:00Z',
  '2026-03-03T11:38:00Z',
  '2026-08-28T04:18:00Z',
];
// New moons, at the time of a solar eclipse.
const NEW = ['2024-04-08T18:21:00Z', '2025-03-29T10:58:00Z', '2026-08-12T17:37:00Z'];

test('the moon is full around a lunar eclipse', () => {
  for (const at of FULL) assert.equal(isFullMoon(new Date(at)), true, at);
});

test('the night before and after a full moon still count', () => {
  for (const at of FULL) {
    const full = new Date(at).getTime();
    assert.equal(isFullMoon(new Date(full - 18 * 3_600_000)), true, `${at} -18h`);
    assert.equal(isFullMoon(new Date(full + 18 * 3_600_000)), true, `${at} +18h`);
  }
});

test('it is not full at a new moon or a week away', () => {
  for (const at of NEW) assert.equal(isFullMoon(new Date(at)), false, at);
  for (const at of FULL) {
    const full = new Date(at).getTime();
    assert.equal(isFullMoon(new Date(full + 7 * 86_400_000)), false, `${at} +7d`);
    assert.equal(isFullMoon(new Date(full - 4 * 86_400_000)), false, `${at} -4d`);
  }
});

test('the next full moon is the coming one, within a day of the real one', () => {
  for (const at of FULL) {
    const full = new Date(at).getTime();
    const next = nextFullMoon(new Date(full - 10 * 86_400_000)).getTime();
    assert.ok(Math.abs(next - full) < 1.5 * 86_400_000, at);
    assert.equal(isFullMoon(new Date(next)), true, at);
  }
});
