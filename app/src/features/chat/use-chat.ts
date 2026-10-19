import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Platform } from 'react-native';

import type { BuddyView } from '@/features/buddy/api';
import { chatMood, chatWord } from '@/features/buddy/chat-words';
import type { Cue } from '@/features/buddy/components/buddy-stage';
import {
  missedMoment,
  type Reaction,
  type ReactionKind,
  reactionTo,
} from '@/features/buddy/reactions';
import { ApiError } from '@/lib/api';

import { fetchNewer, fetchNewest, fetchOlder } from './api';
import { MessageSync } from './message-sync';
import { type PreparedPhoto, photoUrl, uploadPhoto } from './photo';
import { releasePhoto } from './photo-resize';
import { ChatSocket, type ConnectionStatus } from './socket';
import {
  fromServer,
  isMemberMessage,
  knownReactions,
  type Message,
  type MessageReaction,
  redactDeletedActor,
  type ServerMessage,
} from './types';

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
// arrives twice (socket and catch-up) shows once. My photo keeps showing the file I picked, so it
// does not flash while the server's copy loads.
function merge(current: Message[], incoming: ServerMessage[]): Message[] {
  const byKey = new Map(current.map((m) => [m.clientMessageId, m]));
  for (const serverMessage of incoming) {
    const message = fromServer(serverMessage);
    if (!message) continue;
    const previous = byKey.get(message.clientMessageId);
    const localUri = previous?.type === 'PHOTO' ? previous.photo.localUri : undefined;
    byKey.set(
      message.clientMessageId,
      message.type === 'PHOTO' && localUri
        ? { ...message, photo: { ...message.photo, localUri } }
        : message,
    );
  }
  return sortTimeline([...byKey.values()]);
}

type Options = {
  myId: string;
  // The server no longer knows this user's room (e.g. it changed on another device).
  // `code`: why the server cut this device off, when it said (e.g. SEAT_TAKEN).
  onRoomLost: (code?: string) => void;
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
  // Photos go over REST, not the socket: kept until stored, for "retry". One that failed for want of
  // a connection goes again on the next ready, like a text.
  const photoOutbox = useRef(new Map<string, { photo: PreparedPhoto; retryOnReady: boolean }>());
  // How many times the socket has become ready, to tell whether it reconnected during an upload.
  const readyCount = useRef(0);
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
  // Care this user did, already shown on the tap (use-buddy.ts): its event from the server, a moment
  // later, is not played again.
  const playedMine = useRef<{ kind: ReactionKind; at: number }[]>([]);
  const playMine = useCallback((kind: 'fed' | 'cleaned') => {
    const now = Date.now();
    playedMine.current.push({ kind, at: now });
    setReaction({ id: `mine-${kind}-${now}`, kind });
  }, []);
  const cheerPartnerHere = useCallback(() => {
    const now = Date.now();
    if (now - hereAt.current < HERE_AGAIN_MS) return;
    hereAt.current = now;
    setReaction({ id: `here-${now}`, kind: 'here' });
  }, []);
  // When a text last came or went live, for the buddy to start a talk only when it is quiet.
  const [lastTalkAt, setLastTalkAt] = useState(0);
  const cueFrom = useCallback((message: ServerMessage) => {
    if (message.type === 'TEXT' || message.type === 'PHOTO') setLastTalkAt(Date.now());
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

  // Only the reactions, on messages already shown: catching up adds the messages themselves.
  const applyReactions = useCallback((incoming: ServerMessage[]) => {
    const byId = new Map(incoming.map((message) => [message.id, message.reactions]));
    setMessages((prev) =>
      prev.map((m) =>
        isMemberMessage(m) && m.id && byId.has(m.id)
          ? { ...m, reactions: knownReactions(byId.get(m.id)) }
          : m,
      ),
    );
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
        m.clientMessageId === clientMessageId && isMemberMessage(m) && !m.id ? { ...m, status } : m,
      ),
    );
  }, []);

  // Stored over REST (docs/PROJECT.md, 사진); the room hears it from the server like a text.
  const uploadPending = useCallback(
    async (clientMessageId: string) => {
      const pending = photoOutbox.current.get(clientMessageId);
      if (!pending) return;
      const { photo } = pending;
      let message: ServerMessage;
      for (;;) {
        const readyAtStart = readyCount.current;
        pending.retryOnReady = false;
        try {
          message = await uploadPhoto(clientMessageId, photo);
          break;
        } catch (e) {
          console.warn('sending a photo failed', e);
          const offline = e instanceof ApiError && e.code === 'NETWORK';
          // The connection came back while this one was on its way: that ready did not wait for it,
          // so try again now on the new connection.
          if (offline && readyCount.current !== readyAtStart) continue;
          pending.retryOnReady = offline;
          markStatus(clientMessageId, 'failed');
          return;
        }
      }
      try {
        photoOutbox.current.delete(clientMessageId);
        apply([message]);
        cueFrom(message);
        // Once the server's copy is loaded, show it instead and let the picked file go (in a
        // browser it stays in memory until then). Without it, the picked file stays on screen.
        if (message.photo) {
          // Native resolves true, the web nothing: only a rejection or false means not loaded.
          const loaded = await Image.prefetch(photoUrl(message.roomId, message.photo.id)).then(
            (ok: boolean | void) => ok !== false,
            () => false,
          );
          if (loaded) {
            setMessages((prev) =>
              prev.map((m) =>
                m.clientMessageId === clientMessageId && m.type === 'PHOTO' && m.photo.localUri
                  ? { ...m, photo: { ...m.photo, localUri: undefined } }
                  : m,
              ),
            );
            releasePhoto(photo.uri);
          }
        }
      } catch (e) {
        // Stored already; only showing the server's copy failed.
        console.warn('showing the sent photo failed', e);
      }
    },
    [apply, cueFrom, markStatus],
  );

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
        readyCount.current += 1;
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
          const reconnected = historyVersion.current !== undefined;
          historyVersion.current = version;
          sync.start(readsNow[myIdRef.current]);
          // Catching up only reads what is newer. Reactions put on recent messages while this
          // device was away come with the newest page.
          if (reconnected) {
            const generation = historyGeneration.current;
            fetchNewest()
              .then((page) => {
                if (generation === historyGeneration.current) applyReactions(page.messages);
              })
              .catch((e: unknown) => console.warn('refreshing reactions failed', e));
          }
        }
        // Outgoing messages do not wait for REST history recovery. The same id keeps retries safe.
        for (const [clientMessageId, message] of outbox.current) {
          if (message.status === 'sending') {
            socket.send(clientMessageId, message.text);
          }
        }
        for (const [clientMessageId, pending] of photoOutbox.current) {
          if (pending.retryOnReady) {
            markStatus(clientMessageId, 'sending');
            void uploadPending(clientMessageId);
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
        const shownAlready =
          next &&
          message.type === 'BUDDY_EVENT' &&
          message.actorId === myIdRef.current &&
          takePlayed(playedMine.current, next.kind);
        if (next && !shownAlready) setReaction(next);
        // The friend's first arrival is cheered already; "together now" would follow right after.
        if (next?.kind === 'joined') hereAt.current = Date.now();
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
      onReaction: (message) => applyReactions([message]),
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
      onFatal: (code) => onRoomLostRef.current(code),
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
        // Web push is off until someone turns it on, so a hidden tab stays connected to keep receiving.
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
  }, [apply, applyReactions, cheerPartnerHere, cueFrom, markStatus, setTypingOf, uploadPending]);

  // While the chat is on screen, tell the others how far I have read: up to the newest message
  // that is not my own. Hex ids sort by time, so comparing strings compares age.
  useEffect(() => {
    if (status !== 'online' || !active || syncing || syncingRef.current) return;
    const newest = messages.find((m) => m.id && !(isMemberMessage(m) && m.senderId === myId))?.id;
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

  const sendPhoto = useCallback(
    (photo: PreparedPhoto) => {
      const clientMessageId = randomUUID();
      const pending: Message = {
        clientMessageId,
        type: 'PHOTO',
        senderId: myId,
        photo: { localUri: photo.uri, width: photo.width, height: photo.height },
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      photoOutbox.current.set(clientMessageId, { photo, retryOnReady: false });
      setMessages((prev) => sortTimeline([pending, ...prev]));
      void uploadPending(clientMessageId);
    },
    [myId, uploadPending],
  );

  // Shown at once; the server's reaction event then brings the stored state. Offline it is not
  // queued: the bubble stays as it was.
  const react = useCallback(
    (messageId: string, reaction: MessageReaction | null) => {
      if (!socketRef.current?.sendReaction(messageId, reaction)) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (!isMemberMessage(m) || m.id !== messageId) return m;
          const next = { ...m.reactions };
          delete next[myId];
          if (reaction) next[myId] = reaction;
          return { ...m, reactions: Object.keys(next).length > 0 ? next : undefined };
        }),
      );
    },
    [myId],
  );

  const retry = useCallback(
    (clientMessageId: string) => {
      const message = messagesRef.current.find((m) => m.clientMessageId === clientMessageId);
      if (message?.type === 'PHOTO') {
        markStatus(clientMessageId, 'sending');
        void uploadPending(clientMessageId);
        return;
      }
      if (message?.type !== 'TEXT') return;
      markStatus(clientMessageId, 'sending');
      socketRef.current?.send(clientMessageId, message.text);
    },
    [markStatus, uploadPending],
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
        (m) => isMemberMessage(m) && m.senderId !== myId && m.id && m.id > (awaySince ?? ''),
      ).length;

  return {
    messages,
    status: status === 'online' && syncing ? 'connecting' : status,
    online,
    typing,
    reads,
    unreadWhileAway,
    reaction,
    playMine,
    cue,
    lastTalkAt,
    partnerPet,
    notifyPet,
    loaded,
    send,
    sendPhoto,
    retry,
    react,
    loadOlder,
    notifyTyping,
  };
}

// The oldest care of this kind shown on the tap in the last while, taken off the list.
const PLAYED_FOR_MS = 15_000;
function takePlayed(played: { kind: ReactionKind; at: number }[], kind: ReactionKind): boolean {
  const now = Date.now();
  for (let i = played.length - 1; i >= 0; i--) {
    if (now - played[i].at > PLAYED_FOR_MS) played.splice(i, 1);
  }
  const index = played.findIndex((entry) => entry.kind === kind);
  if (index < 0) return false;
  played.splice(index, 1);
  return true;
}
