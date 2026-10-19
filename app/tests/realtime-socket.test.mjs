import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import { RealtimeSocket } from '../src/lib/realtime-socket.ts';

// A stand-in for the platform's WebSocket: records what is sent, and lets the test play the server.
class FakeWebSocket {
  static all = [];
  sent = [];
  closed = false;
  onmessage = null;
  onclose = null;

  constructor(url) {
    this.url = url;
    FakeWebSocket.all.push(this);
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  // Like the platform's, the close event comes later, not inside close().
  close() {
    if (this.closed) return;
    this.closed = true;
    queueMicrotask(() => this.onclose?.());
  }

  // The connection lost from the server's side or the network's.
  drop() {
    this.closed = true;
    this.onclose?.();
  }

  serverSends(frame) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const latest = () => FakeWebSocket.all.at(-1);
const flush = () => new Promise((resolve) => setImmediate(resolve));

let realWebSocket;
beforeEach(() => {
  realWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = FakeWebSocket;
  FakeWebSocket.all = [];
  mock.timers.enable({ apis: ['setTimeout'] });
});
afterEach(() => {
  mock.timers.reset();
  globalThis.WebSocket = realWebSocket;
});

function socket(overrides = {}) {
  const statuses = [];
  const events = [];
  const s = new RealtimeSocket({
    url: () => 'ws://server/ws',
    token: async () => 'token-1',
    onStatus: (status) => statuses.push(status),
    onEvent: (event) => events.push(event),
    ...overrides,
  });
  return { s, statuses, events };
}

test('authenticates only after hello, and sends only once ready', async () => {
  const { s, statuses, events } = socket();
  s.start();
  assert.equal(latest().url, 'ws://server/ws');
  assert.deepEqual(latest().sent, []);
  assert.equal(s.send({ type: 'send' }), false);

  latest().serverSends({ type: 'hello' });
  await flush();
  assert.deepEqual(latest().sent, [{ type: 'auth', token: 'token-1' }]);
  assert.equal(s.send({ type: 'send' }), false);

  latest().serverSends({ type: 'ready', online: [] });
  assert.deepEqual(statuses, ['connecting', 'online']);
  // hello is the socket's own; everything from ready on goes to the app.
  assert.deepEqual(events, [{ type: 'ready', online: [] }]);
  assert.equal(s.send({ type: 'send', text: 'hi' }), true);
  assert.deepEqual(latest().sent.at(-1), { type: 'send', text: 'hi' });
});

test('the app can send from its ready handler', () => {
  let sentOnReady;
  const { s } = socket({ onEvent: () => (sentOnReady = s.send({ type: 'resend' })) });
  s.start();
  latest().serverSends({ type: 'ready' });
  assert.equal(sentOnReady, true);
});

test('reconnects with a growing wait, starting over once ready', () => {
  const { s, statuses } = socket();
  s.start();
  latest().drop();
  assert.deepEqual(statuses, ['connecting', 'offline']);
  assert.equal(FakeWebSocket.all.length, 1);

  mock.timers.tick(999);
  assert.equal(FakeWebSocket.all.length, 1);
  mock.timers.tick(1);
  assert.equal(FakeWebSocket.all.length, 2);

  latest().drop();
  mock.timers.tick(1999);
  assert.equal(FakeWebSocket.all.length, 2);
  mock.timers.tick(1);
  assert.equal(FakeWebSocket.all.length, 3);

  latest().serverSends({ type: 'ready' });
  latest().drop();
  mock.timers.tick(1000);
  assert.equal(FakeWebSocket.all.length, 4);
});

test('the wait stops growing at maxBackoffMs', () => {
  const { s } = socket({ maxBackoffMs: 3000 });
  s.start();
  for (const wait of [1000, 2000, 3000, 3000]) {
    const count = FakeWebSocket.all.length;
    latest().drop();
    mock.timers.tick(wait - 1);
    assert.equal(FakeWebSocket.all.length, count);
    mock.timers.tick(1);
    assert.equal(FakeWebSocket.all.length, count + 1);
  }
});

test('a token that cannot be had closes the connection, to try again later', async () => {
  const { s, statuses } = socket({
    token: async () => {
      throw new Error('signed out');
    },
  });
  s.start();
  latest().serverSends({ type: 'hello' });
  await flush();
  assert.equal(latest().closed, true);
  assert.deepEqual(statuses, ['connecting', 'offline']);
  mock.timers.tick(1000);
  assert.equal(FakeWebSocket.all.length, 2);
});

test('paused, it stays closed until resumed; reconnectNow skips the wait', () => {
  const { s, statuses } = socket();
  s.start();
  latest().serverSends({ type: 'ready' });
  s.pause();
  assert.equal(latest().closed, true);
  assert.deepEqual(statuses, ['connecting', 'online', 'offline']);
  s.reconnectNow();
  mock.timers.tick(60_000);
  assert.equal(FakeWebSocket.all.length, 1);

  s.resume();
  assert.equal(FakeWebSocket.all.length, 2);
  latest().drop();
  s.reconnectNow();
  assert.equal(FakeWebSocket.all.length, 3);
});

test('after stop nothing reconnects and late frames are ignored', () => {
  const { s, events } = socket();
  s.start();
  const first = latest();
  s.stop();
  first.serverSends({ type: 'ready' });
  mock.timers.tick(60_000);
  assert.equal(FakeWebSocket.all.length, 1);
  assert.deepEqual(events, []);
});

test('an old socket closing after a reconnect changes nothing', () => {
  const { s, statuses } = socket();
  s.start();
  const old = latest();
  s.pause();
  s.resume();
  const current = latest();
  current.serverSends({ type: 'ready' });
  old.onclose();
  assert.equal(statuses.at(-1), 'online');
  assert.equal(s.send({ type: 'x' }), true);
});

function readySocket(overrides = {}) {
  const made = socket({ ping: { type: 'ping' }, ...overrides });
  made.s.start();
  latest().serverSends({ type: 'ready' });
  return made;
}

const pings = (ws) => ws.sent.filter((frame) => frame.type === 'ping').length;

test('a quiet connection is asked for a reply, and one that does not answer is replaced', () => {
  const { statuses } = readySocket();
  const first = latest();
  mock.timers.tick(19_999);
  assert.equal(pings(first), 0);
  mock.timers.tick(1);
  assert.equal(pings(first), 1);

  first.serverSends({ type: 'pong' });
  mock.timers.tick(19_999);
  assert.equal(pings(first), 1);
  mock.timers.tick(1);
  assert.equal(pings(first), 2);

  mock.timers.tick(8_000);
  assert.equal(first.closed, true);
  assert.equal(statuses.at(-1), 'offline');
  mock.timers.tick(1000);
  assert.equal(FakeWebSocket.all.length, 2);
});

test('a send into a dead connection is found out without waiting for the close event', () => {
  const { s, statuses } = readySocket();
  const first = latest();
  assert.equal(s.send({ type: 'send', text: 'hi' }), true);
  assert.deepEqual(first.sent.slice(-2), [{ type: 'send', text: 'hi' }, { type: 'ping' }]);
  // A second send while the first ping waits for its reply does not ask again.
  s.send({ type: 'typing' });
  assert.equal(pings(first), 1);
  mock.timers.tick(8_000);
  assert.equal(statuses.at(-1), 'offline');
  // The given-up socket closing late does not schedule a second retry.
  first.onclose();
  mock.timers.tick(1000);
  assert.equal(FakeWebSocket.all.length, 2);
});

test('any frame counts as a reply', () => {
  const { s } = readySocket();
  const first = latest();
  s.send({ type: 'send', text: 'hi' });
  first.serverSends({ type: 'ack' });
  mock.timers.tick(8_000);
  assert.equal(first.closed, false);
});

test('a connection that never gets ready is given up on', () => {
  const { s, statuses } = socket();
  s.start();
  latest().serverSends({ type: 'hello' });
  mock.timers.tick(14_999);
  assert.equal(latest().closed, false);
  mock.timers.tick(1);
  assert.equal(latest().closed, true);
  assert.deepEqual(statuses, ['connecting', 'offline']);
  mock.timers.tick(1000);
  assert.equal(FakeWebSocket.all.length, 2);
});

test('reconnectNow on an open connection checks it instead', () => {
  const { s } = readySocket();
  s.reconnectNow();
  assert.equal(FakeWebSocket.all.length, 1);
  assert.equal(pings(latest()), 1);
});

test('the browser telling the network came back or went away', () => {
  const realWindow = globalThis.window;
  const win = new EventTarget();
  win.ononline = null;
  globalThis.window = win;
  try {
    const { s } = readySocket();
    win.dispatchEvent(new Event('offline'));
    assert.equal(pings(latest()), 1);
    latest().drop();
    win.dispatchEvent(new Event('online'));
    assert.equal(FakeWebSocket.all.length, 2);

    s.stop();
    win.dispatchEvent(new Event('online'));
    assert.equal(FakeWebSocket.all.length, 2);
  } finally {
    globalThis.window = realWindow;
  }
});
