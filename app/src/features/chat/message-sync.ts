import type { ServerMessage } from './types';

export type MessagePage = { messages: ServerMessage[]; hasMore: boolean };

type Options = {
  fetchNewest: (signal: AbortSignal) => Promise<MessagePage>;
  fetchNewer: (after: string, signal: AbortSignal) => Promise<MessagePage>;
  onPage: (page: MessagePage, initial: boolean) => void;
  onSynced: (messages: ServerMessage[], myRead: string | undefined) => void;
  onSyncing: (syncing: boolean) => void;
  onError: (error: unknown) => void;
  retryDelayMs?: number;
  requestTimeoutMs?: number;
};

// An empty room still needs a cursor: reconnecting then fetches every message after this point,
// rather than just the newest page and leaving a gap behind the live messages already displayed.
const EMPTY_CURSOR = '000000000000000000000000';

/** Owns the history cursor. Live events never move it past a page that has not been fetched. */
export class MessageSync {
  private options: Options;
  private cursor: string | undefined;
  private recovered: ServerMessage[] = [];
  private myRead: string | undefined;
  private connected = false;
  private generation = 0;
  private running = false;
  private requested = false;
  private abort: AbortController | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: Options) {
    this.options = options;
  }

  start(myRead: string | undefined) {
    this.generation += 1;
    this.connected = true;
    this.myRead = myRead;
    this.clearRetry();
    this.abort?.abort();
    this.requested = true;
    this.options.onSyncing(true);
    this.pump();
  }

  stop() {
    this.connected = false;
    this.generation += 1;
    this.requested = false;
    this.clearRetry();
    this.abort?.abort();
  }

  private current(generation: number) {
    return this.connected && this.generation === generation;
  }

  private clearRetry() {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  // A reconnect requests another round; it never runs alongside an older one.
  private pump() {
    if (this.running || !this.connected || !this.requested) return;
    this.requested = false;
    this.running = true;
    const generation = this.generation;
    void this.run(generation)
      .catch((error: unknown) => {
        if (!this.current(generation)) return;
        this.options.onError(error);
        if (!this.current(generation)) return;
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.requested = true;
          this.pump();
        }, this.options.retryDelayMs ?? 3_000);
      })
      .finally(() => {
        this.running = false;
        this.pump();
      });
  }

  private async run(generation: number) {
    for (;;) {
      const initial = this.cursor === undefined;
      const page = await this.fetchPage();
      if (!this.current(generation)) return;
      const newest = page.messages[0]?.id;
      if (!initial && newest && newest <= this.cursor!) {
        throw new Error('History page did not advance');
      }
      this.options.onPage(page, initial);
      this.recovered.push(...page.messages);
      // Each successful page is contiguous with the previous one. A failed next page resumes here.
      this.cursor = newest ?? this.cursor ?? EMPTY_CURSOR;
      // On the initial page, hasMore refers to older history, loaded by scrolling separately.
      if (initial || !page.hasMore || page.messages.length === 0) break;
    }
    if (!this.current(generation)) return;
    this.options.onSynced(this.recovered.splice(0), this.myRead);
    this.options.onSyncing(false);
  }

  private async fetchPage(): Promise<MessagePage> {
    const controller = new AbortController();
    this.abort = controller;
    let rejectAbort: () => void = () => {};
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = () => reject(new Error('History request cancelled or timed out'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    const deadline = setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? 15_000);
    try {
      return await Promise.race([
        this.cursor === undefined
          ? this.options.fetchNewest(controller.signal)
          : this.options.fetchNewer(this.cursor, controller.signal),
        aborted,
      ]);
    } finally {
      clearTimeout(deadline);
      controller.signal.removeEventListener('abort', rejectAbort);
      if (this.abort === controller) this.abort = null;
    }
  }
}
