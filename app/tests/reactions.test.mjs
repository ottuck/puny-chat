import assert from 'node:assert/strict';
import test from 'node:test';

import { reactionTo } from '../src/features/buddy/reactions.ts';

const joinNote = (actorId) => ({
  id: 'n1',
  type: 'SYSTEM',
  systemEvent: 'MEMBER_JOINED',
  actorId,
  text: 'Yuki',
  senderId: null,
  buddyEvent: null,
});

test('the buddy cheers when a friend comes in, not for my own coming in', () => {
  assert.deepEqual(reactionTo(joinNote('friend'), 'me'), { id: 'n1', kind: 'joined' });
  assert.equal(reactionTo(joinNote('me'), 'me'), null);
  assert.equal(reactionTo({ ...joinNote('friend'), systemEvent: 'MEMBER_LEFT' }, 'me'), null);
});
