import assert from 'node:assert/strict';
import test from 'node:test';

import { createAccountActions, isTooManyRequests } from '../src/lib/account/actions.ts';

// A stand-in for Firebase's Auth and User: firebase/auth's signOut and deleteUser call these.
function setup({ anonymous = false, provider = null, failing = [] } = {}) {
  const calls = [];
  const step = (name) => async () => {
    calls.push(name);
    if (failing.includes(name)) throw new Error(`${name} failed`);
  };
  const user = {
    isAnonymous: anonymous,
    providerData: provider ? [{ providerId: provider }] : [],
    delete: step('deleteUser'),
  };
  const auth = { currentUser: user, signOut: step('signOut') };
  const actions = createAccountActions({
    auth,
    // The app passes lib/social-auth's reauthenticateLinked, which does nothing for a guest.
    reauthenticate: provider ? step(`reauth ${provider}`) : async () => {},
    deleteServerData: step('deleteServerData'),
    cleanUpSignedIn: step('cleanUpSignedIn'),
    cleanUpDevice: step('cleanUpDevice'),
  });
  return { actions, calls, auth };
}

test('signing out cleans up first, even when cleaning up fails', async () => {
  const { actions, calls } = setup({ failing: ['cleanUpSignedIn', 'cleanUpDevice'] });
  await actions.signOut();
  assert.deepEqual(calls, ['cleanUpSignedIn', 'cleanUpDevice', 'signOut']);
});

test('a linked account confirms first; the server data goes before the Firebase account', async () => {
  const { actions, calls } = setup({ provider: 'apple.com' });
  await actions.deleteAccount();
  assert.deepEqual(calls, [
    'reauth apple.com',
    'cleanUpSignedIn',
    'deleteServerData',
    'cleanUpDevice',
    'deleteUser',
  ]);
});

test('a failed server deletion stops before the Firebase account', async () => {
  const { actions, calls } = setup({ failing: ['deleteServerData'] });
  await assert.rejects(actions.deleteAccount(), /deleteServerData failed/);
  assert.deepEqual(calls, ['cleanUpSignedIn', 'deleteServerData']);
});

test('a cancelled confirmation deletes nothing', async () => {
  const { actions, calls } = setup({ provider: 'google.com', failing: ['reauth google.com'] });
  await assert.rejects(actions.deleteAccount());
  assert.deepEqual(calls, ['reauth google.com']);
});

test('backing out deletes a new guest, or signs out when that fails; an account only signs out', async () => {
  let s = setup({ anonymous: true });
  await s.actions.cancelStart();
  assert.deepEqual(s.calls, ['cleanUpSignedIn', 'deleteServerData', 'cleanUpDevice', 'deleteUser']);

  s = setup({ anonymous: true, failing: ['deleteUser'] });
  await s.actions.cancelStart();
  assert.equal(s.calls.at(-1), 'signOut');

  s = setup({ provider: 'google.com' });
  await s.actions.cancelStart();
  assert.deepEqual(s.calls, ['cleanUpSignedIn', 'cleanUpDevice', 'signOut']);
});

test('nothing to do when no one is signed in', async () => {
  const { actions, calls, auth } = setup();
  auth.currentUser = null;
  await actions.deleteAccount();
  await actions.cancelStart();
  assert.deepEqual(calls, []);
});

test('too many new accounts from one place is told apart', () => {
  assert.equal(isTooManyRequests({ code: 'auth/too-many-requests' }), true);
  assert.equal(isTooManyRequests({ code: 'auth/network-request-failed' }), false);
  assert.equal(isTooManyRequests(null), false);
});
