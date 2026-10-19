import type { BuddyView } from '@/features/buddy/api';
import { idToken } from '@/lib/api';
import { wsUrl } from '@/lib/api-url';
import { type ConnectionStatus, RealtimeSocket } from '@/lib/realtime-socket';

import type { ServerMessage } from './types';

export type { ConnectionStatus };

// Server → app events (docs/PROJECT.md, "WebSocket 프로토콜"). The connection itself (hello, auth,
// reconnecting) is lib/realtime-socket.ts.
type ServerEvent =
  | { type: 'hello' }
  | {
      type: 'ready';
      userId: string;
      roomId: string;
      online: string[];
      reads: Record<string, string>;
      historyVersion?: number;
    }
  | { type: 'ack'; clientMessageId: string; message: ServerMessage }
  | { type: 'message'; message: ServerMessage }
  | { type: 'member'; userId: string; displayName: string | null }
  | { type: 'left'; userId: string }
  | { type: 'historyChanged'; historyVersion: number; deletedUserId: string | null }
  | { type: 'buddy'; buddy: BuddyView }
  | { type: 'presence'; userId: string; online: boolean }
  | { type: 'typing'; userId: string; typing: boolean }
  | { type: 'read'; userId: string; messageId: string }
  | { type: 'pet'; userId: string }
  | { type: 'error'; code: string; clientMessageId: string | null }
  | { type: 'pong' };

export type SocketListener = {
  onStatus: (status: ConnectionStatus) => void;
  // Authenticated; the app should fetch what it missed and resend unacknowledged messages.
  // online: other members connected now. reads: user id → newest message id they have read.
  onReady: (online: string[], reads: Record<string, string>, historyVersion: number) => void;
  onHistoryChanged: (historyVersion: number, deletedUserId: string | null) => void;
  onAck: (clientMessageId: string, message: ServerMessage) => void;
  onMessage: (message: ServerMessage) => void;
  // A friend joined or left this room; the room's member list is out of date.
  onMembersChanged: () => void;
  // The buddy changed (someone cared for it, or chatting gave it EXP).
  onBuddy: (buddy: BuddyView) => void;
  onPresence: (userId: string, online: boolean) => void;
  onTyping: (userId: string, typing: boolean) => void;
  onRead: (userId: string, messageId: string) => void;
  // The partner petted the buddy just now.
  onPet: (userId: string) => void;
  onSendFailed: (clientMessageId: string, code: string) => void;
  // The server refused the connection for a reason reconnecting will not fix (e.g. no room).
  onFatal: (code: string) => void;
};

// SEAT_TAKEN: a code made for this member let someone (them, elsewhere) take their seat.
const FATAL_CODES = new Set(['ROOM_NOT_FOUND', 'SEAT_TAKEN']);

/** The chat server's socket: this room's messages, reads, typing and buddy over one connection. */
export class ChatSocket {
  private readonly socket: RealtimeSocket<ServerEvent>;
  private readonly listener: SocketListener;

  constructor(listener: SocketListener) {
    this.listener = listener;
    this.socket = new RealtimeSocket<ServerEvent>({
      url: wsUrl,
      token: idToken,
      onStatus: (status) => listener.onStatus(status),
      onEvent: (event) => this.onEvent(event),
    });
  }

  start() {
    this.socket.start();
  }

  stop() {
    this.socket.stop();
  }

  // The app went to the background: disconnect so the others see it offline right away, instead of
  // after the OS suspends it and the server notices. Unread messages then come as push notifications.
  pause() {
    this.socket.pause();
  }

  resume() {
    this.socket.resume();
  }

  // E.g. when the app returns to the foreground: skip the backoff wait.
  reconnectNow() {
    this.socket.reconnectNow();
  }

  // Returns false when not connected; the caller keeps the message pending and resends on ready.
  send(clientMessageId: string, text: string): boolean {
    return this.socket.send({ type: 'send', clientMessageId, text });
  }

  // Typing and read marks are not worth queueing: while offline they are simply dropped.
  sendTyping(typing: boolean) {
    this.socket.send({ type: 'typing', typing });
  }

  // Like typing: only worth sending right now, and only the partner sees it.
  sendPet() {
    this.socket.send({ type: 'pet' });
  }

  sendRead(messageId: string): boolean {
    return this.socket.send({ type: 'read', messageId });
  }

  private onEvent(event: ServerEvent) {
    switch (event.type) {
      case 'ready':
        this.listener.onReady(event.online, event.reads, event.historyVersion ?? 0);
        break;
      case 'ack':
        this.listener.onAck(event.clientMessageId, event.message);
        break;
      case 'message':
        this.listener.onMessage(event.message);
        break;
      case 'buddy':
        this.listener.onBuddy(event.buddy);
        break;
      case 'presence':
        this.listener.onPresence(event.userId, event.online);
        break;
      case 'typing':
        this.listener.onTyping(event.userId, event.typing);
        break;
      case 'read':
        this.listener.onRead(event.userId, event.messageId);
        break;
      case 'pet':
        this.listener.onPet(event.userId);
        break;
      case 'member':
      case 'left':
        this.listener.onMembersChanged();
        break;
      case 'historyChanged':
        this.listener.onHistoryChanged(event.historyVersion, event.deletedUserId);
        break;
      case 'error':
        if (event.clientMessageId) {
          this.listener.onSendFailed(event.clientMessageId, event.code);
        } else if (FATAL_CODES.has(event.code)) {
          this.stop();
          this.listener.onFatal(event.code);
        }
        break;
    }
  }
}
