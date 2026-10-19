import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { ApiError, createApiClient } from '../src/lib/api-client.ts';

const api = createApiClient({ baseUrl: () => 'https://api.test', token: async () => 'token-1' });

function serve(respond) {
  return mock.method(globalThis, 'fetch', async (url, init) => respond(url, init));
}

test('sends the token, and JSON only when there is a body', async () => {
  const calls = [];
  const fetch = serve((url, init) => {
    calls.push({ url, init });
    return Response.json({ ok: true });
  });
  try {
    assert.deepEqual(await api('/api/me'), { ok: true });
    await api('/api/me/name', { method: 'PUT', body: { name: 'Yuki' } });
  } finally {
    fetch.mock.restore();
  }
  assert.equal(calls[0].url, 'https://api.test/api/me');
  assert.equal(calls[0].init.method, 'GET');
  assert.deepEqual(calls[0].init.headers, { Authorization: 'Bearer token-1' });
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[1].init.method, 'PUT');
  assert.equal(calls[1].init.headers['Content-Type'], 'application/json');
  assert.equal(calls[1].init.body, '{"name":"Yuki"}');
});

test('204 is undefined', async () => {
  const fetch = serve(() => new Response(null, { status: 204 }));
  try {
    assert.equal(await api('/api/x', { method: 'DELETE' }), undefined);
  } finally {
    fetch.mock.restore();
  }
});

test("a failure carries the server's code and detail", async () => {
  const fetch = serve(() => Response.json({ code: 'SEAT_TAKEN', detail: 'Yuki' }, { status: 409 }));
  try {
    await assert.rejects(api('/api/x'), (e) => {
      assert.ok(e instanceof ApiError);
      assert.deepEqual(
        [e.status, e.code, e.detail, e.message],
        [409, 'SEAT_TAKEN', 'Yuki', 'SEAT_TAKEN'],
      );
      return true;
    });
  } finally {
    fetch.mock.restore();
  }
});

test('a failure without a body is UNKNOWN; no answer is NETWORK', async () => {
  let fetch = serve(() => new Response('oops', { status: 500 }));
  try {
    await assert.rejects(api('/api/x'), { status: 500, code: 'UNKNOWN' });
  } finally {
    fetch.mock.restore();
  }
  fetch = serve(() => {
    throw new TypeError('Failed to fetch');
  });
  try {
    await assert.rejects(api('/api/x'), { status: 0, code: 'NETWORK' });
  } finally {
    fetch.mock.restore();
  }
});

test("without a token nothing is sent, and the token's reason is kept", async () => {
  const fetch = serve(() => assert.fail('sent without a token'));
  const client = (error) =>
    createApiClient({
      baseUrl: () => 'https://api.test',
      token: async () => {
        throw error;
      },
    });
  try {
    await assert.rejects(client(new ApiError(401, 'UNAUTHORIZED'))('/api/x'), {
      status: 401,
      code: 'UNAUTHORIZED',
    });
    await assert.rejects(client(new ApiError(0, 'NETWORK'))('/api/x'), {
      status: 0,
      code: 'NETWORK',
    });
    // Not saying why counts as no answer.
    await assert.rejects(client(new Error('?'))('/api/x'), { status: 0, code: 'NETWORK' });
  } finally {
    fetch.mock.restore();
  }
  assert.equal(fetch.mock.callCount(), 0);
});
