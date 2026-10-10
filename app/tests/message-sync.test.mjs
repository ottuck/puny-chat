import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

import { MessageSync } from '../src/features/chat/message-sync.ts';

const id = (n) => n.toString(16).padStart(24, '0');
const page = (ids, hasMore = false) => ({
  messages: ids.map((n) => ({ id: id(n), clientMessageId: `message-${n}` })),
  hasMore,
});
const deferred = () => Promise.withResolvers();

function queue() {
  const values = [];
  const waiters = [];
  return {
    push(value) {
      const waiter = waiters.shift();
      if (waiter) waiter(value);
      else values.push(value);
    },
    next() {
      return values.length
        ? Promise.resolve(values.shift())
        : new Promise((resolve) => waiters.push(resolve));
    },
  };
}

function harness(options) {
  const pages = [];
  const states = [];
  const finished = queue();
  const errors = queue();
  const sync = new MessageSync({
    retryDelayMs: 0,
    requestTimeoutMs: 500,
    onPage: (result, initial) => pages.push({ ...result, initial }),
    onSyncing: (state) => states.push(state),
    onSynced: (messages, myRead) => finished.push({ messages, myRead }),
    onError: (error) => errors.push(error),
    ...options,
  });
  return { sync, pages, states, finished, errors };
}

test('live 103 does not skip 101 and 102 after a failed recovery from 100', async (t) => {
  const calls = [];
  const failed = deferred();
  let attempts = 0;
  const h = harness({
    fetchNewest: async () => page([100]),
    fetchNewer: async (after) => {
      calls.push(after);
      if (++attempts === 1) return failed.promise;
      return page([103, 102, 101]);
    },
  });
  t.after(() => h.sync.stop());
  h.sync.start(undefined);
  const timeline = new Map((await h.finished.next()).messages.map((m) => [m.id, m]));
  h.sync.start(id(100));
  // This is the newer event displayed by the socket while the REST request fails.
  timeline.set(id(103), page([103]).messages[0]);
  failed.reject(new Error('temporary network error'));
  await h.errors.next();
  assert.equal(h.states.at(-1), true, 'read marks remain blocked while recovery is incomplete');
  const recovered = await h.finished.next();
  for (const message of recovered.messages) timeline.set(message.id, message);
  assert.deepEqual(calls, [id(100), id(100)]);
  assert.deepEqual([...timeline.keys()].sort(), [100, 101, 102, 103].map(id));
  assert.equal(recovered.myRead, id(100));
  assert.equal(h.states.at(-1), false);
});

test('a failed second page resumes after the first successful page and retains recovered events', async (t) => {
  const calls = [];
  let attempts = 0;
  const h = harness({
    fetchNewest: async () => page([100]),
    fetchNewer: async (after) => {
      calls.push(after);
      attempts += 1;
      if (attempts === 1) return page([102, 101], true);
      if (attempts === 2) throw new Error('second page failed');
      return page([104, 103]);
    },
  });
  t.after(() => h.sync.stop());
  h.sync.start(undefined);
  await h.finished.next();
  h.sync.start(id(100));
  const result = await h.finished.next();
  assert.deepEqual(calls, [id(100), id(102), id(102)]);
  assert.deepEqual(
    result.messages.map((m) => m.id),
    [102, 101, 104, 103].map(id),
  );
});

test('an initial fetch failure retries the initial page even when live messages are displayed', async (t) => {
  let attempts = 0;
  const h = harness({
    fetchNewest: async () => {
      if (++attempts === 1) throw new Error('initial fetch failed');
      return page([103, 102, 101], true);
    },
    fetchNewer: async () => assert.fail('must load the initial page first'),
  });
  t.after(() => h.sync.stop());
  h.sync.start(undefined);
  await h.finished.next();
  assert.equal(attempts, 2);
  assert.equal(h.pages.length, 1);
  assert.equal(h.pages[0].initial, true);
  assert.equal(h.pages[0].hasMore, true);
});

test('reconnecting cancels the old request and ignores its late response', async (t) => {
  const old = deferred();
  let attempts = 0;
  let oldSignal;
  const h = harness({
    fetchNewest: async (signal) => {
      if (++attempts === 1) {
        oldSignal = signal;
        return old.promise;
      }
      return page([100]);
    },
    fetchNewer: async () => assert.fail('old response must not advance the cursor'),
  });
  t.after(() => h.sync.stop());
  h.sync.start(undefined);
  h.sync.stop();
  h.sync.start(undefined);
  await h.finished.next();
  old.resolve(page([999]));
  await delay(0);
  assert.equal(oldSignal.aborted, true);
  assert.deepEqual(
    h.pages.map((p) => p.messages[0].id),
    [id(100)],
  );
});

test('a request that never settles times out and retries without waiting for a socket reconnect', async (t) => {
  let attempts = 0;
  let timedOutSignal;
  const h = harness({
    requestTimeoutMs: 10,
    fetchNewest: async (signal) => {
      if (++attempts === 1) {
        timedOutSignal = signal;
        return new Promise(() => {});
      }
      return page([100]);
    },
    fetchNewer: async () => assert.fail('initial page has not been loaded'),
  });
  t.after(() => h.sync.stop());
  h.sync.start(undefined);
  await h.finished.next();
  assert.equal(attempts, 2);
  assert.equal(timedOutSignal.aborted, true);
  assert.equal(h.pages.length, 1);
});

test('stopping cancels the retry and applies no response after unmount', async () => {
  let attempts = 0;
  const h = harness({
    retryDelayMs: 10,
    fetchNewest: async () => {
      attempts += 1;
      throw new Error('offline');
    },
    fetchNewer: async () => assert.fail('no initial cursor'),
  });
  h.sync.start(undefined);
  await h.errors.next();
  h.sync.stop();
  await delay(25);
  assert.equal(attempts, 1);
  assert.equal(h.pages.length, 0);
});

test('an initially empty room walks all newer pages after reconnect', async (t) => {
  const calls = [];
  const h = harness({
    fetchNewest: async () => page([]),
    fetchNewer: async (after) => {
      calls.push(after);
      return after === id(0) ? page([2, 1], true) : page([4, 3]);
    },
  });
  t.after(() => h.sync.stop());
  h.sync.start(undefined);
  await h.finished.next();
  h.sync.stop();
  h.sync.start(undefined);
  const recovered = await h.finished.next();
  assert.deepEqual(calls, [id(0), id(2)]);
  assert.deepEqual(
    recovered.messages.map((m) => m.id),
    [2, 1, 4, 3].map(id),
  );
  assert.deepEqual(
    h.pages.map((p) => p.initial),
    [true, false, false],
  );
});
