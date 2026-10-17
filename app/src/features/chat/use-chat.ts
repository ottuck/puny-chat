import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { BuddyView } from '@/features/buddy/api';
import { chatMood, chatWord } from '@/features/buddy/chat-words';
import type { Cue } from '@/features/buddy/components/buddy-stage';
import { missedMoment, type Reaction, reactionTo } from '@/features/buddy/reactions';
import { ApiError } from '@/lib/api';

import { fetchNewer, fetchNewest, fetchOlder } from './api';
import { MessageSync } from './message-sync';
import { ChatSocket, type ConnectionStatus } from './socket';
import { fromServer, type Message, redactDeletedActor, type ServerMessage } from './types';

// While typing, "typing" is repeated this often; the partner drops it when it stops coming.
const TYPING_REPEAT_MS = 3_000;
const TYPING_TTL_MS = 6_000;
const HERE_AGAIN_MS = 10 * 60_000;

// Newest first, which is the order the inverted list renders. My unconfirmed messages have no
// server id yet and sit on top; the rest follow the server's order (ids increase over time).
function sortTimeline(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    if (!a.id || !b.id) return a.id ? 1 : b.id ? -1 : b.createdAt.localeCompare(a.createdAt);
    return b.id.localeCompare(a.id);
  });
}

// Adds or replaces by clientMessageId, so an ack replaces my pending copy and a message that
// arrives twice (socket and catch-up) shows once.
function merge(current: Message[], incoming: ServerMessage[]): Message[] {
  const byKey = new Map(current.map((m) => [m.clientMessageId, m]));
  for (const serverMessage of incoming) {
    const message = fromServer(serverMessage);
    if (message) byKey.set(message.clientMessageId, message);
  }
  return sortTimeline([...byKey.values()]);
}

type Options = {
  myId: string;
  // The server no longer knows this user's room (e.g. it changed on another device).
  onRoomLost: () => void;
  // A friend joined or left: the room's members changed.
  onRoomChanged: () => void;
  onBuddy: (buddy: BuddyView) => void;
};

export function useChat({ myId, onRoomLost, onRoomChanged, onBuddy }: Options) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [syncing, setSyncing] = useState(true);
  const syncingRef = useRef(true);
  const [hasOlder, setHasOlder] = useState(false);
  // The first page has arrived; before that an empty timeline means "not loaded yet".
  const [loaded, setLoaded] = useState(false);
  // Other members connected right now, and who of them is typing.
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  // User id → newest message id they have read.
  const [reads, setReads] = useState<Record<string, string>>({});
  const readsRef = useRef(reads);
  const [active, setActive] = useState(AppState.currentState === 'active');
  // Newest message id when the app last went to the background, to count what arrived since.
  const [awaySince, setAwaySince] = useState<string | undefined>(undefined);
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const typingSentAt = useRef(0);
  const readSent = useRef<string | undefined>(undefined);
  const messagesRef = useRef(messages);
  const historyVersion = useRef<number | undefined>(undefined);
  const historyGeneration = useRef(0);
  const deletedUsers = useRef(new Set<string>());
  // Kept synchronously in event handlers: ready can arrive before React commits the pending bubble.
  const outbox = useRef(new Map<string, { text: string; status: 'sending' | 'failed' }>());
  const socketRef = useRef<ChatSocket | null>(null);
  const onRoomLostRef = useRef(onRoomLost);
  const onRoomChangedRef = useRef(onRoomChanged);
  const onBuddyRef = useRef(onBuddy);
  const myIdRef = useRef(myId);
  useEffect(() => {
    messagesRef.current = messages;
    onRoomLostRef.current = onRoomLost;
    onRoomChangedRef.current = onRoomChanged;
    onBuddyRef.current = onBuddy;
    myIdRef.current = myId;
    readsRef.current = reads;
  }, [messages, onRoomLost, onRoomChanged, onBuddy, myId, reads]);
  // The latest live event for the buddy to react to (see reactionTo).
  const [reaction, setReaction] = useState<Reaction | null>(null);
  // The latest one-word message ("밥", "춤", …) or mood word ("사랑해", "ㅋㅋ", …) from either of us,
  // for the buddy to answer.
  const [cue, setCue] = useState<Cue | null>(null);
  // The partner just petted the buddy; the stage sets it against this user's own pets (a pet of
  // both within seconds is a bigger moment, docs/fun-improvements.md, 함께 있을 때).
  const [partnerPet, setPartnerPet] = useState<{ id: string } | null>(null);
  // When the partner's arrival last made the buddy cheer: once in a while, not at every reconnect.
  const hereAt = useRef(0);
  const cheerPartnerHere = useCallback(() => {
    const now = Date.now();
    if (now - hereAt.current < HERE_AGAIN_MS) return;
    hereAt.current = now;
    setReaction({ id: `here-${now}`, kind: 'here' });
  }, []);
  // When a text last came or went live, for the buddy to start a talk only when it is quiet.
  const [lastTalkAt, setLastTalkAt] = useState(0);
  const cueFrom = useCallback((message: ServerMessage) => {
    if (message.type === 'TEXT') setLastTalkAt(Date.now());
    const kind =
      message.type === 'TEXT' && message.text
        ? (chatWord(message.text) ?? chatMood(message.text))
        : null;
    // A resent message is acked again with the same id: answered once.
    if (kind) setCue((prev) => (prev?.id === message.id ? prev : { id: message.id, kind }));
  }, []);

  const apply = useCallback((incoming: ServerMessage[]) => {
    const visible = incoming.flatMap((message) => {
      const redacted = redactDeletedActor(message, deletedUsers.current);
      return redacted ? [redacted] : [];
    });
    setMessages((prev) => merge(prev, visible));
  }, []);

  const setTypingOf = useCallback(function updateTyping(userId: string, on: boolean) {
    const timers = typingTimers.current;
    clearTimeout(timers.get(userId));
    timers.delete(userId);
    if (on)
      timers.set(
        userId,
        setTimeout(() => updateTyping(userId, false), TYPING_TTL_MS),
      );
    setTyping((prev) => {
      const without = prev.filter((id) => id !== userId);
      return on ? [...without, userId] : without;
    });
  }, []);

  const markStatus = useCallback((clientMessageId: string, status: 'sending' | 'failed') => {
    const pending = outbox.current.get(clientMessageId);
    if (pending) outbox.current.set(clientMessageId, { ...pending, status });
    setMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === clientMessageId && m.type === 'TEXT' && !m.id ? { ...m, status } : m,
      ),
    );
  }, []);

  useEffect(() => {
    const sync = new MessageSync({
      fetchNewest,
      fetchNewer,
      onPage: (page, initial) => {
        apply(page.messages);
        if (initial) {
          setHasOlder(page.hasMore);
          setLoaded(true);
        }
      },
      onSynced: (fetched, myRead) => {
        const missed = missedMoment(fetched, myRead);
        if (missed) setReaction(missed);
      },
      onSyncing: (next) => {
        syncingRef.current = next;
        setSyncing(next);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'ROOM_NOT_FOUND') {
          sync.stop();
          onRoomLostRef.current();
        } else {
          console.warn('catch-up failed; retrying', error);
        }
      },
    });

    const resetHistory = (version: number, myRead: string | undefined) => {
      historyVersion.current = version;
      historyGeneration.current += 1;
      // Unconfirmed outgoing messages remain in the outbox and can still be retried.
      setMessages((prev) => prev.filter((message) => !message.id));
      setHasOlder(false);
      setLoaded(false);
      setReaction(null);
      setCue(null);
      readSent.current = undefined;
      sync.reset(myRead);
    };

    const socket = new ChatSocket({
      onStatus: (next) => {
        setStatus(next);
        if (next !== 'online') {
          sync.stop();
          syncingRef.current = true;
          setSyncing(true);
          // Unknown while disconnected; ready brings the current state back.
          setOnline([]);
          for (const userId of typingTimers.current.keys()) setTypingOf(userId, false);
        }
      },
      onReady: (onlineNow, readsNow, version) => {
        setOnline(onlineNow);
        if (onlineNow.length > 0) cheerPartnerHere();
        setReads(readsNow);
        readsRef.current = readsNow;
        // Anything sent before the connection dropped may not have arrived.
        readSent.current = undefined;
        typingSentAt.current = 0;
        if (historyVersion.current !== undefined && historyVersion.current !== version) {
          resetHistory(version, readsNow[myIdRef.current]);
        } else {
          historyVersion.current = version;
          sync.start(readsNow[myIdRef.current]);
        }
        // Outgoing messages do not wait for REST history recovery. The same id keeps retries safe.
        for (const [clientMessageId, message] of outbox.current) {
          if (message.status === 'sending') {
            socket.send(clientMessageId, message.text);
          }
        }
      },
      onAck: (_clientMessageId, message) => {
        outbox.current.delete(message.clientMessageId);
        apply([message]);
        cueFrom(message);
      },
      onMessage: (incoming) => {
        const message = redactDeletedActor(incoming, deletedUsers.current);
        if (!message) return;
        // The message they were typing has arrived.
        if (message.senderId) setTypingOf(message.senderId, false);
        apply([message]);
        const next = reactionTo(message, myIdRef.current);
        if (next) setReaction(next);
        cueFrom(message);
        // A buddy went its own way: the album has a new page.
        if (message.type === 'BUDDY_EVENT' && message.buddyEvent === 'GRADUATED') {
          onRoomChangedRef.current();
        }
      },
      onPresence: (userId, isOnline) => {
        setOnline((prev) => {
          const without = prev.filter((id) => id !== userId);
          return isOnline ? [...without, userId] : without;
        });
        if (isOnline) cheerPartnerHere();
        else setTypingOf(userId, false);
      },
      onPet: () => setPartnerPet({ id: randomUUID() }),
      onTyping: setTypingOf,
      onRead: (userId, messageId) =>
        setReads((prev) =>
          (prev[userId] ?? '') >= messageId ? prev : { ...prev, [userId]: messageId },
        ),
      onSendFailed: (clientMessageId) => markStatus(clientMessageId, 'failed'),
      onMembersChanged: () => onRoomChangedRef.current(),
      onHistoryChanged: (version, deletedUserId) => {
        if (deletedUserId) deletedUsers.current.add(deletedUserId);
        if (version > (historyVersion.current ?? -1)) {
          resetHistory(version, readsRef.current[myIdRef.current]);
        }
      },
      onBuddy: (buddy) => onBuddyRef.current(buddy),
      onFatal: () => onRoomLostRef.current(),
    });
    socketRef.current = socket;
    socket.start();

    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state !== 'active') setAwaySince(messagesRef.current.find((m) => m.id)?.id ?? '');
      if (state === 'active') {
        socket.resume();
        socket.reconnectNow();
      } else if (state === 'background' && Platform.OS !== 'web') {
        // Web has no push notifications, so a hidden tab stays connected.
        socket.pause();
      }
    });
    const timers = typingTimers.current;
    return () => {
      subscription.remove();
      sync.stop();
      socket.stop();
      socketRef.current = null;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [apply, cheerPartnerHere, cueFrom, markStatus, setTypingOf]);

  // While the chat is on screen, tell the others how far I have read: up to the newest message
  // that is not my own. Hex ids sort by time, so comparing strings compares age.
  useEffect(() => {
    if (status !== 'online' || !active || syncing || syncingRef.current) return;
    const newest = messages.find((m) => m.id && !(m.type === 'TEXT' && m.senderId === myId))?.id;
    if (!newest) return;
    if ((reads[myId] ?? '') >= newest || (readSent.current ?? '') >= newest) return;
    if (socketRef.current?.sendRead(newest)) readSent.current = newest;
  }, [messages, status, active, reads, myId, syncing]);

  // Called as the draft changes. Repeats "typing" while it keeps changing; the partner lets it
  // lapse once it stops, so no timer is needed here.
  const notifyTyping = useCallback((hasDraft: boolean) => {
    const now = Date.now();
    if (hasDraft) {
      if (now - typingSentAt.current < TYPING_REPEAT_MS) return;
      typingSentAt.current = now;
      socketRef.current?.sendTyping(true);
    } else if (typingSentAt.current) {
      typingSentAt.current = 0;
      socketRef.current?.sendTyping(false);
    }
  }, []);

  const notifyPet = useCallback(() => socketRef.current?.sendPet(), []);

  const send = useCallback(
    (text: string) => {
      const clientMessageId = randomUUID();
      const pending: Message = {
        clientMessageId,
        type: 'TEXT',
        senderId: myId,
        text,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      outbox.current.set(clientMessageId, { text, status: 'sending' });
      setMessages((prev) => sortTimeline([pending, ...prev]));
      // The partner stops showing "typing" when the message arrives; start over for the next one.
      typingSentAt.current = 0;
      // If offline it stays 'sending' and goes out after the next reconnect.
      socketRef.current?.send(clientMessageId, text);
    },
    [myId],
  );

  const retry = useCallback(
    (clientMessageId: string) => {
      const message = messagesRef.current.find((m) => m.clientMessageId === clientMessageId);
      if (message?.type !== 'TEXT') return;
      markStatus(clientMessageId, 'sending');
      socketRef.current?.send(clientMessageId, message.text);
    },
    [markStatus],
  );

  const loadingOlder = useRef(false);
  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current.findLast((m) => m.id)?.id;
    if (!hasOlder || !oldest || loadingOlder.current) return;
    loadingOlder.current = true;
    const generation = historyGeneration.current;
    try {
      const page = await fetchOlder(oldest);
      if (generation !== historyGeneration.current) return;
      apply(page.messages);
      setHasOlder(page.hasMore);
    } catch (e) {
      console.warn('loading older messages failed', e);
    } finally {
      loadingOlder.current = false;
    }
  }, [apply, hasOlder]);

  // Others' messages that arrived while the app was in the background (a hidden browser tab).
  const unreadWhileAway = active
    ? 0
    : messages.filter(
        (m) => m.type === 'TEXT' && m.senderId !== myId && m.id && m.id > (awaySince ?? ''),
      ).length;

  return {
    messages,
    status: status === 'online' && syncing ? 'connecting' : status,
    online,
    typing,
    reads,
    unreadWhileAway,
    reaction,
    cue,
    lastTalkAt,
    partnerPet,
    notifyPet,
    loaded,
    send,
    retry,
    loadOlder,
    notifyTyping,
  };
}
