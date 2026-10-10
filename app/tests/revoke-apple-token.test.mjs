import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { revokeAppleToken } from '../src/features/auth/revoke-apple-token.ts';

const request = {
  apiKey: 'public-api-key',
  idToken: 'firebase-id-token',
  authorizationCode: 'apple-authorization-code',
  bundleId: 'com.ottuck.buddychat',
};

test('native Apple revocation uses a code, Firebase identity and iOS bundle header', async () => {
  const fetch = mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(
      url,
      'https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=public-api-key',
    );
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['X-Ios-Bundle-Identifier'], request.bundleId);
    assert.deepEqual(JSON.parse(init.body), {
      providerId: 'apple.com',
      tokenType: 'CODE',
      token: request.authorizationCode,
      idToken: request.idToken,
    });
    assert.ok(init.signal instanceof AbortSignal);
    return new Response('{}', { status: 200 });
  });
  try {
    await revokeAppleToken(request);
    assert.equal(fetch.mock.callCount(), 1);
  } finally {
    fetch.mock.restore();
  }
});

test('a refused revocation fails so account deletion cannot continue silently', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 400 }));
  try {
    await assert.rejects(revokeAppleToken(request), /Apple token revocation failed \(400\)/);
  } finally {
    fetch.mock.restore();
  }
});

test('a missing native authorization code is rejected before sending anything', async () => {
  const fetch = mock.method(globalThis, 'fetch', async () => new Response('{}'));
  try {
    await assert.rejects(revokeAppleToken({ ...request, authorizationCode: '' }), /Missing Apple/);
    assert.equal(fetch.mock.callCount(), 0);
  } finally {
    fetch.mock.restore();
  }
});
