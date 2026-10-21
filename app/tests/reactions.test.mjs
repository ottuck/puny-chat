import assert from 'node:assert/strict';
import test from 'node:test';

import { FOLLOWS_MS, following, reactionTo } from '../src/features/buddy/reactions.ts';

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

test("the partner's photo makes the buddy look up, not my own", () => {
  const photo = (senderId) => ({
    id: 'p1',
    type: 'PHOTO',
    senderId,
    actorId: null,
    buddyEvent: null,
  });
  assert.deepEqual(reactionTo(photo('friend'), 'me'), { id: 'p1', kind: 'message' });
  assert.equal(reactionTo(photo('me'), 'me'), null);
});

test('a new level carries the care that earned it, so that the care plays first', () => {
  const fed = { id: 'f1', kind: 'fed' };
  const levelUp = { id: 'l1', kind: 'levelUp' };
  const grown = following(levelUp, { reaction: fed, at: 1000 }, 1200);
  assert.deepEqual(grown, { ...levelUp, follows: fed });
  // An evolution right after the new level follows the same care.
  assert.deepEqual(following({ id: 'e1', kind: 'evolved' }, { reaction: grown, at: 1200 }, 1300), {
    id: 'e1',
    kind: 'evolved',
    follows: fed,
  });
  // Long after the care, after a message, or not a new level: as it is.
  assert.deepEqual(following(levelUp, { reaction: fed, at: 1000 }, 1001 + FOLLOWS_MS), levelUp);
  assert.deepEqual(
    following(levelUp, { reaction: { id: 'm1', kind: 'message' }, at: 1000 }, 1200),
    levelUp,
  );
  assert.deepEqual(following({ id: 'c1', kind: 'cleaned' }, { reaction: fed, at: 1000 }, 1200), {
    id: 'c1',
    kind: 'cleaned',
  });
  assert.deepEqual(following(levelUp, null, 1200), levelUp);
});
