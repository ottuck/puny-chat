import type { BuddyEvent } from './api';

// The fields of a chat message (features/chat/types, ServerMessage) a reaction depends on. The chat
// passes its messages in; the buddy does not know the chat's types.
export type ReactionSource = {
  id: string;
  type: 'TEXT' | 'SYSTEM' | 'BUDDY_EVENT';
  senderId: string | null;
  buddyEvent: BuddyEvent | null;
  systemEvent?: string | null;
  actorId: string | null;
};

// Something that just happened in the room, for the buddy on its stage to react to.
export type ReactionKind =
  | 'message'
  | 'fed'
  | 'cleaned'
  | 'pooped'
  // A grown-up's work at its station, earning EXP.
  | 'worked'
  | 'levelUp'
  // The top level: the room sparkles.
  | 'maxLevel'
  | 'evolved'
  | 'together'
  // The partner is here too (docs/fun-improvements.md, 함께 있을 때): not from a message but from presence.
  | 'here'
  // A friend just came in with the invite: the room is for two now.
  | 'joined';
export type Reaction = { id: string; kind: ReactionKind };

const BY_EVENT: Partial<Record<string, ReactionKind>> = {
  FED: 'fed',
  CLEANED: 'cleaned',
  POOPED: 'pooped',
  WORKED: 'worked',
  LEVELED_UP: 'levelUp',
  GROWN: 'levelUp',
  MAX_LEVEL: 'maxLevel',
  // The new egg arrives with the same rings of light as an evolution.
  GRADUATED: 'evolved',
  EVOLVED: 'evolved',
  TOGETHER: 'together',
};

// Only for messages arriving live; history loaded after a reconnect is not reacted to. Care and
// growth events come for whoever caused them, so the partner's feeding shows here too. The
// user's own texts are not reacted to, only the partner's; nor is their own coming in.
export function reactionTo(message: ReactionSource, myId: string): Reaction | null {
  const kind =
    message.type === 'BUDDY_EVENT'
      ? BY_EVENT[message.buddyEvent ?? '']
      : message.type === 'TEXT' && message.senderId !== myId
        ? 'message'
        : message.type === 'SYSTEM' &&
            message.systemEvent === 'MEMBER_JOINED' &&
            message.actorId !== myId
          ? 'joined'
          : undefined;
  return kind ? { id: message.id, kind } : null;
}

// The buddy reached the top level or evolved while this user was away (in messages loaded on
// opening or reconnecting, newer than what they had read): worth showing once, the other care
// events are not. The top level first, it is the bigger moment. Someone who never read anything
// here just joined, and the buddy's past is not news to them.
export function missedMoment(
  loaded: ReactionSource[],
  myRead: string | undefined,
): Reaction | null {
  if (!myRead) return null;
  // Hex ids sort by time (docs/PROJECT.md).
  const newer = (event: string) =>
    loaded.find((m) => m.type === 'BUDDY_EVENT' && m.buddyEvent === event && m.id > myRead);
  const top = newer('MAX_LEVEL');
  if (top) return { id: top.id, kind: 'maxLevel' };
  const evolved = newer('EVOLVED');
  return evolved ? { id: evolved.id, kind: 'evolved' } : null;
}
