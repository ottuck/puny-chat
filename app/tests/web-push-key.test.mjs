import assert from 'node:assert/strict';
import test from 'node:test';

import { keyBytes, sameKey } from '../src/lib/push/web-push-key.ts';

test('a base64url key becomes its bytes, with or without padding', () => {
  // 0xfb 0xff 0xbf: "+/+/" in base64, "-_-_" in base64url.
  assert.deepEqual([...keyBytes('-_-_')], [0xfb, 0xff, 0xbf]);
  assert.deepEqual([...keyBytes('AQ')], [1]);
  assert.deepEqual([...keyBytes('AQI')], [1, 2]);
  assert.deepEqual([...keyBytes('AQID')], [1, 2, 3]);
});

test('a subscription is redone only when the key changed', () => {
  const key = keyBytes('AQID');
  assert.equal(sameKey(new Uint8Array([1, 2, 3]).buffer, key), true);
  assert.equal(sameKey(new Uint8Array([1, 2, 4]).buffer, key), false);
  assert.equal(sameKey(new Uint8Array([1, 2]).buffer, key), false);
  assert.equal(sameKey(null, key), false);
});
