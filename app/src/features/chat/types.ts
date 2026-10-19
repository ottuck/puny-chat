import type { BuddyEvent } from '@/features/buddy/api';

// MEMBER_JOINED: a friend came in with an invite. MEMBER_RETURNED: someone came in with a code made
// for the partner and took their seat.
export type SystemEvent = 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'MEMBER_RETURNED';

// What a long press on a text message offers. Each member has at most one on a message.
export const MESSAGE_REACTIONS = ['LIKE', 'SAD', 'WOW'] as const;
export type MessageReaction = (typeof MESSAGE_REACTIONS)[number];
export const REACTION_EMOJI: Record<MessageReaction, string> = { LIKE: '👍', SAD: '😢', WOW: '😮' };

// As the server sends it (server/src/main/java/com/buddychat/chat/Message.java).
export type ServerMessage = {
  id: string;
  roomId: string;
  senderId: string | null;
  type: 'TEXT' | 'PHOTO' | 'SYSTEM' | 'BUDDY_EVENT';
  text: string | null;
  // PHOTO: the stored file (docs/PROJECT.md, 사진).
  photo?: { id: string; width: number; height: number } | null;
  buddyEvent: BuddyEvent | null;
  // SYSTEM entries: what happened; text then holds the actor's name at the time.
  systemEvent?: SystemEvent | null;
  actorId: string | null;
  clientMessageId: string;
  createdAt: string;
  // TEXT, PHOTO: user id → their reaction. Null or absent when nobody has reacted.
  reactions?: Record<string, MessageReaction> | null;
};

// A live frame or already-started REST response may arrive after deletion was announced.
export function redactDeletedActor(
  message: ServerMessage,
  deletedUsers: ReadonlySet<string>,
): ServerMessage | null {
  if (message.senderId && deletedUsers.has(message.senderId)) return null;
  if (message.actorId && deletedUsers.has(message.actorId)) {
    if (message.type === 'SYSTEM') return null;
    return { ...message, actorId: null };
  }
  return message;
}

type MessageBase = {
  // Server id; absent while one of my messages is still on its way.
  id?: string;
  // Generated on the client so a retried send is stored only once (docs/PROJECT.md).
  clientMessageId: string;
  createdAt: string; // ISO 8601
};

export type TextMessage = MessageBase & {
  type: 'TEXT';
  senderId: string;
  text: string;
  // Only on my own messages that the server has not confirmed yet.
  status?: 'sending' | 'failed';
  // User id → their reaction; kinds this app version does not know are left out.
  reactions?: Record<string, MessageReaction>;
};

// A photo a member sent. While mine is on its way it shows the picked file (`localUri`); the server's
// copy is then at photoUrl(roomId, id) (photo.ts).
export type PhotoMessage = MessageBase & {
  type: 'PHOTO';
  senderId: string;
  photo: { id?: string; roomId?: string; localUri?: string; width: number; height: number };
  status?: 'sending' | 'failed';
  reactions?: Record<string, MessageReaction>;
};

// What a member sent (not the room's or the buddy's lines): it has a bubble, reactions and a read mark.
export type MemberMessage = TextMessage | PhotoMessage;
export const isMemberMessage = (message: Message): message is MemberMessage =>
  message.type === 'TEXT' || message.type === 'PHOTO';

export type BuddyEventMessage = MessageBase & {
  type: 'BUDDY_EVENT';
  event: BuddyEvent;
  // Member who triggered the event (FED, CLEANED); absent for events the buddy causes itself.
  actorId?: string;
  // LEVELED_UP, GROWN, MAX_LEVEL: the level reached; TOGETHER: the bonus EXP (the server sends it as text).
  level?: number;
  // GRADUATED: the name of the buddy that went its own way.
  detail?: string;
};

// E.g. "Yuki left". The name is kept on the entry: a member who left is no longer in the room.
export type SystemMessage = MessageBase & {
  type: 'SYSTEM';
  event: SystemEvent;
  actorName: string | null;
};

export type Message = TextMessage | PhotoMessage | BuddyEventMessage | SystemMessage;

export type Member = {
  id: string;
  displayName: string | null;
};

// Maps a server message to the timeline's shape; kinds this app version does not know are skipped.
export function fromServer(message: ServerMessage): Message | null {
  const base = {
    id: message.id,
    clientMessageId: message.clientMessageId,
    createdAt: message.createdAt,
  };
  if (message.type === 'TEXT' && message.senderId && message.text !== null) {
    return {
      ...base,
      type: 'TEXT',
      senderId: message.senderId,
      text: message.text,
      reactions: knownReactions(message.reactions),
    };
  }
  if (message.type === 'PHOTO' && message.senderId && message.photo) {
    return {
      ...base,
      type: 'PHOTO',
      senderId: message.senderId,
      photo: { ...message.photo, roomId: message.roomId },
      reactions: knownReactions(message.reactions),
    };
  }
  if (message.type === 'BUDDY_EVENT' && message.buddyEvent) {
    return {
      ...base,
      type: 'BUDDY_EVENT',
      event: message.buddyEvent,
      actorId: message.actorId ?? undefined,
      level: message.text ? Number(message.text) : undefined,
      detail: message.text ?? undefined,
    };
  }
  if (message.type === 'SYSTEM' && message.systemEvent) {
    return { ...base, type: 'SYSTEM', event: message.systemEvent, actorName: message.text };
  }
  return null;
}

export function knownReactions(
  reactions: ServerMessage['reactions'],
): Record<string, MessageReaction> | undefined {
  if (!reactions) return undefined;
  const known = Object.entries(reactions).filter(([, reaction]) =>
    MESSAGE_REACTIONS.includes(reaction),
  );
  return known.length > 0 ? Object.fromEntries(known) : undefined;
}
