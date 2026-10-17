import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { BuddyJob, BuddyStage } from './api';

// What a grown buddy says (docs/PROJECT.md, Buddy 무대): a greeting when the app opens, a word
// back when it is fed, petted or cleaned, and now and then a line of its own. Lines are keys under
// buddy.say in the translations. Nothing is sent or stored in the chat.

export type Line =
  | 'thanks'
  | 'yummy'
  | 'refreshed'
  | 'digestion'
  | 'hungry'
  | 'full'
  | 'alreadyClean'
  | 'longTime'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'ateYet'
  | 'whatsUp'
  | 'howWasToday'
  | 'together'
  // Felt from a word in the chat (chat-words.ts, chatMood).
  | 'laugh'
  | 'love'
  | 'goodnight'
  | 'cheer'
  | 'comfort'
  // Both are here now, and both petted it.
  | 'bothHere'
  | 'coPet'
  // Questions to start a talk (ASKS).
  | 'bestThing'
  | 'wantEat'
  | 'wantGo'
  | 'weekend'
  | 'watching'
  | 'music'
  | 'sleptWell'
  | 'funny'
  | 'wish'
  | 'favFood'
  | 'tired'
  // Small things that happen on their own.
  | 'hiccup'
  | 'startle'
  | 'lookAround'
  | 'yawn'
  | 'butterfly'
  | 'rain'
  | 'snow'
  | 'shootingStar'
  // The room's guests, and goodbye when it goes its own way.
  | 'snail'
  | 'sparrow'
  | 'catTail'
  | 'train'
  | 'ladybug'
  | 'dragonfly'
  | 'swallow'
  | 'owl'
  | 'squirrel'
  // Sitting down on the rug.
  | 'sit'
  | 'farewell'
  // A tap on a thing in the room (buddy-stage.tsx, touchProp).
  | 'plant'
  | 'clock'
  | 'windowDay'
  | 'windowDusk'
  | 'windowNight'
  | 'fish'
  | 'plush'
  | 'table'
  | 'kotatsu'
  // A job's own words (JOB_LINES), and what it says at its own moments.
  | 'chef1'
  | 'chef2'
  | 'chef3'
  | 'chef4'
  | 'gardener1'
  | 'gardener2'
  | 'gardener3'
  | 'gardener4'
  | 'dj1'
  | 'dj2'
  | 'dj3'
  | 'dj4'
  | 'writer1'
  | 'writer2'
  | 'writer3'
  | 'writer4'
  | 'barista1'
  | 'barista2'
  | 'barista3'
  | 'barista4'
  | 'chefFed'
  | 'gardenerCleaned'
  | 'writerLove';

const SAY_MS = 3000;
const CHATTER_MIN_MS = 60_000;
const CHATTER_MAX_MS = 120_000;
// Questions to start a talk (docs/fun-improvements.md, 질문 말풍선). Said only while the chat is quiet.
const ASKS: Line[] = [
  'ateYet',
  'whatsUp',
  'howWasToday',
  'bestThing',
  'wantEat',
  'wantGo',
  'weekend',
  'watching',
  'music',
  'sleptWell',
  'funny',
  'wish',
  'favFood',
  'tired',
];
// What an adult says of its own, by job (docs/fun-improvements.md, 직업): now and then instead of a
// question, and when it does its work alone.
export const JOB_LINES: Record<BuddyJob, Line[]> = {
  CHEF: ['chef1', 'chef2', 'chef3', 'chef4'],
  GARDENER: ['gardener1', 'gardener2', 'gardener3', 'gardener4'],
  DJ: ['dj1', 'dj2', 'dj3', 'dj4'],
  WRITER: ['writer1', 'writer2', 'writer3', 'writer4'],
  BARISTA: ['barista1', 'barista2', 'barista3', 'barista4'],
};
// A barista talks this much more often, and also while the two are chatting.
const BARISTA_PACE = 0.6;
// How often an adult with a job says one of its own lines instead of a question.
const OWN_LINE_CHANCE = 0.35;

// A question stays a little longer than a thank-you, so it can be read and answered.
const ASK_MS = 4500;
// No text for this long counts as quiet.
const QUIET_CHAT_MS = 90_000;
let lastAsk: Line | null = null;
const LONG_TIME_MS = 3 * 24 * 60 * 60 * 1000;
// When this device last opened the chat, to say "long time no see" or "good morning".
const LAST_VISIT_KEY = 'buddy-last-visit';

// The stage mounts again every time it unfolds; greet once per app session.
let greeted = false;

// Babies and eggs do not talk yet.
export function talks(stage: BuddyStage): boolean {
  return stage === 'CHILD' || stage === 'ADULT';
}

function greetingFor(hour: number): Line | null {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 23) return 'evening';
  return null; // asleep
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * The line being said, and `say` to make the buddy say one. `quiet`: not a moment for idle
 * chatter (asleep, or busy with something else).
 */
export function useBuddyTalk({
  stage,
  quiet,
  greets,
  lastTalkAt,
  job,
}: {
  stage: BuddyStage;
  quiet: boolean;
  // Off in the tour: its buddy is not the user's, and it has no visits to count.
  greets: boolean;
  // When a text last came or went (ms); 0 when none yet.
  lastTalkAt: number;
  // The adult's job: its own lines, and how much it talks.
  job: BuddyJob | null;
}) {
  const [line, setLine] = useState<Line | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canTalk = talks(stage);
  const canTalkRef = useRef(canTalk);
  useEffect(() => {
    canTalkRef.current = canTalk;
  });

  const say = useCallback((next: Line, ms = SAY_MS) => {
    if (!canTalkRef.current) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setLine(next);
    hideTimer.current = setTimeout(() => setLine(null), ms);
  }, []);
  // Drops what is being said, for a moment that should have the stage to itself.
  const hush = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setLine(null);
  }, []);
  // Counts the chances that passed while the chat was lively, to try again after the next wait.
  const [skipped, setSkipped] = useState(0);
  const lastTalkRef = useRef(lastTalkAt);
  useEffect(() => {
    lastTalkRef.current = lastTalkAt;
  });

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  // On opening: "long time no see" after three days away, else a greeting on the first visit of
  // the day. The visit is recorded even while the buddy is too young to talk.
  useEffect(() => {
    if (!greets || greeted) return;
    greeted = true;
    let cancelled = false;
    (async () => {
      const last = Number(await AsyncStorage.getItem(LAST_VISIT_KEY).catch(() => null)) || 0;
      const now = new Date();
      await AsyncStorage.setItem(LAST_VISIT_KEY, String(now.getTime())).catch(() => {});
      if (cancelled || !last) return;
      if (now.getTime() - last > LONG_TIME_MS) {
        say('longTime');
      } else if (new Date(last).toDateString() !== now.toDateString()) {
        const greeting = greetingFor(now.getHours());
        if (greeting) say(greeting);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [greets, say]);

  // Now and then a question of its own, when the two have not been writing for a while, or a line
  // of its job's. While they are chatting it keeps out of the way (a barista does not).
  useEffect(() => {
    if (!canTalk || quiet || line) return;
    const pace = job === 'BARISTA' ? BARISTA_PACE : 1;
    const timer = setTimeout(
      () => {
        const lively = Date.now() - lastTalkRef.current < QUIET_CHAT_MS;
        if (lively && job !== 'BARISTA') {
          setSkipped((count) => count + 1);
          return;
        }
        const own = job ? JOB_LINES[job] : [];
        const useOwn = own.length > 0 && (lively || Math.random() < OWN_LINE_CHANCE);
        const next = pick((useOwn ? own : ASKS).filter((ask) => ask !== lastAsk));
        lastAsk = next;
        say(next, useOwn ? SAY_MS + 1000 : ASK_MS);
      },
      pace * (CHATTER_MIN_MS + Math.random() * (CHATTER_MAX_MS - CHATTER_MIN_MS)),
    );
    return () => clearTimeout(timer);
  }, [canTalk, quiet, line, skipped, job, say]);

  return { line: canTalk ? line : null, say, hush };
}
