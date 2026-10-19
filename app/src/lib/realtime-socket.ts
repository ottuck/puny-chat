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
// background), reconnectNow() skips the wait (back in the foreground).

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

export type RealtimeSocketOptions<Event extends { type: string }> = {
  url: () => string;
  // Asked for on every connection; a failure closes that connection (and so retries later).
  token: () => Promise<string>;
  onStatus: (status: ConnectionStatus) => void;
  // Every frame after hello, ready included (right after the status turns 'online').
  onEvent: (event: Event) => void;
  maxBackoffMs?: number;
};

const MAX_BACKOFF_MS = 30_000;

export class RealtimeSocket<Event extends { type: string }> {
  private options: RealtimeSocketOptions<Event>;
  private ws: WebSocket | null = null;
  private ready = false;
  private stopped = false;
  // Closed on purpose while the app is in the background; resume() reconnects.
  private paused = false;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: RealtimeSocketOptions<Event>) {
    this.options = options;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.clearRetry();
    this.ws?.close();
    this.ws = null;
  }

  pause() {
    if (this.stopped || this.paused) return;
    this.paused = true;
    this.clearRetry();
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

  reconnectNow() {
    if (this.stopped || this.paused || this.ws) return;
    this.clearRetry();
    this.connect();
  }

  // Returns false until ready: nothing is queued here, the caller decides what to keep for later.
  send(frame: object): boolean {
    if (!this.ws || !this.ready) return false;
    this.ws.send(JSON.stringify(frame));
    return true;
  }

  private connect() {
    this.options.onStatus('connecting');
    const ws = new WebSocket(this.options.url());
    this.ws = ws;
    this.ready = false;

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
      this.options.onEvent(event);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return; // an old socket closing after a reconnect
      this.ws = null;
      this.ready = false;
      this.options.onStatus('offline');
      this.scheduleRetry();
    };
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
