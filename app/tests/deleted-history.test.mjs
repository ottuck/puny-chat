import assert from 'node:assert/strict';
import test from 'node:test';

import { redactDeletedActor } from '../src/features/chat/types.ts';

test('late history does not restore a deleted user’s text or name, while partner text and care events remain', () => {
  const deleted = new Set(['deleted-user']);
  const base = { id: 'message', clientMessageId: 'client', actorId: null, senderId: null };
  assert.equal(
    redactDeletedActor(
      { ...base, type: 'TEXT', senderId: 'deleted-user', text: 'private' },
      deleted,
    ),
    null,
  );
  assert.equal(
    redactDeletedActor(
      { ...base, type: 'SYSTEM', actorId: 'deleted-user', text: 'old name' },
      deleted,
    ),
    null,
  );
  const partner = { ...base, type: 'TEXT', senderId: 'partner', text: 'keep this' };
  assert.equal(redactDeletedActor(partner, deleted), partner);
  assert.deepEqual(
    redactDeletedActor(
      { ...base, type: 'BUDDY_EVENT', actorId: 'deleted-user', buddyEvent: 'FED' },
      deleted,
    ),
    { ...base, type: 'BUDDY_EVENT', actorId: null, buddyEvent: 'FED' },
  );
});
