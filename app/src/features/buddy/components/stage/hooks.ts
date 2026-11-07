import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import type { BuddyJob } from '../../api';
import { type Season, seasonOn } from '../../pixel/looks';
import type { Reaction, ReactionKind } from '../../reactions';
import { CHEW_MS, EVOLVE_MS, NATIVE_DRIVER, REACTION_MS } from './constants';
import { asleepAt } from './room-time';

// The stage's small hooks (buddy-stage.tsx): the hour and season, the tick, the reaction playing,
// and things that come and go.

// Local night hours, checked once a minute. `at`: the hour to go by instead (the art preview).
export function useSleeping(job: BuddyJob | null, at?: number): boolean {
  const [now, setHour] = useState(() => new Date().getHours());
  const hour = at ?? now;
  useEffect(() => {
    const timer = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return asleepAt(job, hour);
}

// The season by the device's date, checked once an hour.
export function useSeason(chosen: Season | null | undefined): Season | null {
  const [season, setSeason] = useState(() => seasonOn(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setSeason(seasonOn(new Date())), 3_600_000);
    return () => clearInterval(timer);
  }, []);
  return chosen === undefined ? season : chosen;
}

// A counter that drives frame changes (steps, blinks, chewing) at a toy-like pace.
export function useTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return tick;
}

// The reaction playing now, and how far into it (in ticks of the phase that matters). A new event
// replaces the one playing.
export function useActiveReaction(reaction: Reaction | null) {
  const [active, setActive] = useState<{ kind: ReactionKind; phase: 'main' | 'after' } | null>(
    null,
  );
  useEffect(() => {
    if (!reaction) return;
    const timers = [setTimeout(() => setActive({ kind: reaction.kind, phase: 'main' }), 0)];
    const main =
      reaction.kind === 'fed'
        ? CHEW_MS
        : reaction.kind === 'evolved' || reaction.kind === 'jobChanged'
          ? EVOLVE_MS
          : undefined;
    if (main !== undefined) {
      timers.push(setTimeout(() => setActive({ kind: reaction.kind, phase: 'after' }), main));
    }
    timers.push(setTimeout(() => setActive(null), REACTION_MS[reaction.kind]));
    return () => timers.forEach(clearTimeout);
  }, [reaction]);
  return active;
}

// The reaction to play: the latest, but a new level waits for the care that earned it
// (Reaction.follows, reactions.ts) to play to its end, and plays it first when it never came on its
// own (two events arriving together reach the stage as one change). A care played already is not
// played again.
export function useQueuedReaction(latest: Reaction | null): Reaction | null {
  const [shown, setShown] = useState(latest);
  const playing = useRef<{ id?: string; at: number }>({ id: latest?.id, at: 0 });
  const played = useRef<string[]>([]);
  useEffect(() => {
    if (!latest || latest.id === playing.current.id) return;
    const show = (reaction: Reaction) => {
      playing.current = { id: reaction.id, at: Date.now() };
      played.current = [...played.current.slice(-9), reaction.id];
      setShown(reaction);
    };
    const care = latest.follows;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (care && care.id === playing.current.id) {
      const left = REACTION_MS[care.kind] - (Date.now() - playing.current.at);
      timers.push(setTimeout(() => show(latest), Math.max(0, left)));
    } else if (care && !played.current.includes(care.id)) {
      timers.push(
        setTimeout(() => show(care), 0),
        setTimeout(() => show(latest), REACTION_MS[care.kind]),
      );
    } else {
      timers.push(setTimeout(() => show(latest), 0));
    }
    return () => timers.forEach(clearTimeout);
  }, [latest]);
  return shown;
}

// Something that comes and goes with the moment (the thought of food, the meal's table): it springs
// in, and on the way out stays a beat to leave instead of blinking off. `value` runs 0 → 1 in, 1 → 0
// out; `present` is false once it has left.
export function usePresence(on: boolean, leaveMs: number) {
  const [value] = useState(() => new Animated.Value(on ? 1 : 0));
  const [present, setPresent] = useState(on);
  if (on && !present) setPresent(true);
  useEffect(() => {
    const change = on
      ? Animated.spring(value, {
          toValue: 1,
          friction: 6,
          tension: 170,
          useNativeDriver: NATIVE_DRIVER,
        })
      : Animated.timing(value, {
          toValue: 0,
          duration: leaveMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        });
    // Gone once the leave ends, also when it is cut short: the thing's view making way for another
    // (the thought of food for the level-up mark or a heart) stops the animation, and it would
    // otherwise stay for good.
    change.start(() => !on && setPresent(false));
    return () => change.stop();
  }, [on, value, leaveMs]);
  return { present: on || present, value };
}
