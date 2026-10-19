// One WebSocket to an app server that keeps itself connected. Kept apart from the app (no `@/`
// imports, no server paths, no protocol beyond the handshake) so another app can take the file as
// it is; the app passes the address, the token and what to do with each event.
//
// Frames are JSON objects with a `type`. The handshake:
//   server → { type: 'hello' }          it reads from here on (a frame sent right at open can be lost)
//   app    → { type: 'auth', token }
//   server → { type: 'ready', ... }     authenticated; send() works from here
// When the connection drops it reconnects with exponential backoff (1s, 2s, 4s, … up to
// maxBackoffMs) until stop(). pause() / resume() close and reopen it on purpose (the app in the
// background), reconnectNow() skips the wait (back in the foreground, the network back).
//
// A network that goes away often closes nothing, so the close event can be minutes late. A
// connection that is not ready within connectTimeoutMs, or that does not answer a `ping` frame
// within pingTimeoutMs, is taken for dead and replaced. The ping goes after pingIntervalMs without
// a frame from the server and right after each send.

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

export type RealtimeSocketOptions<Event extends { type: string }> = {
  url: () => string;
  // Asked for on every connection; a failure closes that connection (and so retries later).
  token: () => Promise<string>;
  onStatus: (status: ConnectionStatus) => void;
  // Every frame after hello, ready included (right after the status turns 'online').
  onEvent: (event: Event) => void;
  maxBackoffMs?: number;
  // A frame the server answers (with any frame). Without it only the close event is relied on.
  ping?: object;
  pingIntervalMs?: number;
  pingTimeoutMs?: number;
  connectTimeoutMs?: number;
};

const MAX_BACKOFF_MS = 30_000;
const PING_INTERVAL_MS = 20_000;
const PING_TIMEOUT_MS = 8_000;
const CONNECT_TIMEOUT_MS = 15_000;

export class RealtimeSocket<Event extends { type: string }> {
  private options: RealtimeSocketOptions<Event>;
  private ws: WebSocket | null = null;
  private ready = false;
  private stopped = false;
  // Closed on purpose while the app is in the background; resume() reconnects.
  private paused = false;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  // Until the next ping (quiet for a while), and until the reply or ready that must come in time.
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private deadline: ReturnType<typeof setTimeout> | null = null;

  constructor(options: RealtimeSocketOptions<Event>) {
    this.options = options;
  }

  start() {
    this.stopped = false;
    this.watchNetwork(true);
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.watchNetwork(false);
    this.clearRetry();
    this.clearLiveness();
    this.ws?.close();
    this.ws = null;
  }

  pause() {
    if (this.stopped || this.paused) return;
    this.paused = true;
    this.clearRetry();
    this.clearLiveness();
    this.ws?.close();
    this.ws = null;
    this.ready = false;
    this.options.onStatus('offline');
  }

  resume() {
    if (this.stopped || !this.paused) return;
    this.paused = false;
    this.attempt = 0;
    this.connect();
  }

  // A connection that looks open is asked for a reply instead: it may have died unnoticed meanwhile.
  reconnectNow() {
    if (this.stopped || this.paused) return;
    if (this.ws) {
      this.probe();
      return;
    }
    this.clearRetry();
    this.connect();
  }

  // Returns false until ready: nothing is queued here, the caller decides what to keep for later.
  send(frame: object): boolean {
    if (!this.ws || !this.ready) return false;
    this.ws.send(JSON.stringify(frame));
    // Sent into a dead connection it would wait for the close event; this finds out in time.
    this.probe();
    return true;
  }

  private connect() {
    this.options.onStatus('connecting');
    const ws = new WebSocket(this.options.url());
    this.ws = ws;
    this.ready = false;
    this.expectWithin(ws, this.options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS);

    ws.onmessage = (message) => {
      if (this.ws !== ws || this.stopped || this.paused) return;
      const event = JSON.parse(String(message.data)) as Event;
      if (event.type === 'hello') {
        this.authenticate(ws);
        return;
      }
      if (event.type === 'ready') {
        this.ready = true;
        this.attempt = 0;
        this.options.onStatus('online');
      }
      if (this.ready) this.heard();
      this.options.onEvent(event);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return; // an old socket closing after a reconnect, or one given up on
      this.lost();
    };
  }

  private lost() {
    this.ws = null;
    this.ready = false;
    this.clearLiveness();
    this.options.onStatus('offline');
    this.scheduleRetry();
  }

  // The server is there. After a quiet spell it is asked again.
  private heard() {
    this.clearLiveness();
    if (!this.options.ping) return;
    this.idleTimer = setTimeout(
      () => this.probe(),
      this.options.pingIntervalMs ?? PING_INTERVAL_MS,
    );
  }

  private probe() {
    const ws = this.ws;
    if (!ws || !this.ready || !this.options.ping || this.deadline) return;
    ws.send(JSON.stringify(this.options.ping));
    this.expectWithin(ws, this.options.pingTimeoutMs ?? PING_TIMEOUT_MS);
  }

  // Without a frame (or ready, while connecting) in time, the connection is given up on.
  private expectWithin(ws: WebSocket, ms: number) {
    this.deadline = setTimeout(() => {
      this.deadline = null;
      if (this.ws !== ws) return;
      this.lost();
      ws.close();
    }, ms);
  }

  private clearLiveness() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.deadline) clearTimeout(this.deadline);
    this.idleTimer = null;
    this.deadline = null;
  }

  // Browsers say when the network comes back (reconnect now) or goes (check the connection).
  // React Native has no such events on its global object, so there this does nothing.
  private readonly onOnline = () => this.reconnectNow();
  private readonly onOffline = () => this.probe();

  private watchNetwork(on: boolean) {
    if (typeof window === 'undefined' || !('ononline' in window)) return;
    if (on) {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    } else {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
  }

  private async authenticate(ws: WebSocket) {
    try {
      ws.send(JSON.stringify({ type: 'auth', token: await this.options.token() }));
    } catch {
      ws.close();
    }
  }

  private scheduleRetry() {
    if (this.stopped || this.paused) return;
    const max = this.options.maxBackoffMs ?? MAX_BACKOFF_MS;
    const delay = Math.min(1000 * 2 ** this.attempt, max);
    this.attempt += 1;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private clearRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}
