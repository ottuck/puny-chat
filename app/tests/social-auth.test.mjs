import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AccountInUseError,
  isCancelledSignIn,
  linkOrSwitch,
  linkUser,
} from '../src/lib/social-auth/account.ts';

const credential = { providerId: 'google.com' };

function provider(link) {
  const calls = [];
  return {
    calls,
    id: 'google',
    supported: true,
    signIn: async () => {},
    link,
    reauthenticate: async () => {},
    switchTo: async (c) => calls.push(['switchTo', c]),
  };
}

test('linking keeps the user', async () => {
  const p = provider(async () => {});
  const outcome = await linkOrSwitch(p, { confirmSwitch: async () => assert.fail('asked') });
  assert.equal(outcome, 'linked');
  assert.deepEqual(p.calls, []);
});

test('closing the popup is not an error', async () => {
  const p = provider(async () => {
    throw { code: 'auth/popup-closed-by-user' };
  });
  assert.equal(await linkOrSwitch(p, { confirmSwitch: async () => true }), 'cancelled');
  assert.deepEqual(p.calls, []);
});

test('an account in use switches only when confirmed, after cleaning up', async () => {
  const inUse = async () => {
    throw new AccountInUseError(credential);
  };

  const kept = provider(inUse);
  assert.equal(await linkOrSwitch(kept, { confirmSwitch: async () => false }), 'kept');
  assert.deepEqual(kept.calls, []);

  const switched = provider(inUse);
  const outcome = await linkOrSwitch(switched, {
    confirmSwitch: async () => true,
    beforeSwitch: async () => switched.calls.push(['beforeSwitch']),
  });
  assert.equal(outcome, 'switched');
  assert.deepEqual(switched.calls, [['beforeSwitch'], ['switchTo', credential]]);
});

test('other failures are thrown', async () => {
  const p = provider(async () => {
    throw new Error('network');
  });
  await assert.rejects(linkOrSwitch(p, { confirmSwitch: async () => true }), /network/);
});

test('Firebase "already in use" becomes AccountInUseError carrying the existing credential', async () => {
  const user = { getIdToken: async () => assert.fail('refreshed') };
  const error = { code: 'auth/credential-already-in-use' };
  await assert.rejects(
    linkUser(
      user,
      async () => {
        throw error;
      },
      (e) => (e === error ? credential : null),
    ),
    (e) => e instanceof AccountInUseError && e.credential === credential,
  );
});

test('a successful link refreshes the token', async () => {
  let refreshed = false;
  const user = { getIdToken: async (force) => (refreshed = force) };
  await linkUser(
    user,
    async () => {},
    () => null,
  );
  assert.equal(refreshed, true);
});

test('cancel codes from popups and Apple sheet', () => {
  assert.ok(isCancelledSignIn({ code: 'auth/cancelled-popup-request' }));
  assert.ok(isCancelledSignIn({ code: 'ERR_REQUEST_CANCELED' }));
  assert.ok(!isCancelledSignIn({ code: 'auth/network-request-failed' }));
  assert.ok(!isCancelledSignIn(null));
});
