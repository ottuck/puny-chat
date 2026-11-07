import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { NATIVE_DRIVER } from './constants';

// The bowl and the poops bob now and then while they need tapping.
export function useBob(wantsFood: boolean, hasPoop: boolean): Animated.Value {
  const [nudge] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!wantsFood && !hasPoop) return;
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: -3, duration: 120, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(nudge, { toValue: 0, duration: 120, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(nudge, { toValue: -2, duration: 100, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(nudge, { toValue: 0, duration: 100, useNativeDriver: NATIVE_DRIVER }),
        Animated.delay(1600),
      ]),
    );
    bob.start();
    return () => {
      bob.stop();
      nudge.setValue(0);
    };
  }, [wantsFood, hasPoop, nudge]);
  return nudge;
}

// Rice in the bowl, but for when the buddy is hungry: then it is empty and asks to be filled.
export function useRice(bowlFull: boolean) {
  const [rice] = useState(() => new Animated.Value(bowlFull ? 1 : 0));
  const [riceSparkle, setRiceSparkle] = useState(false);
  const [riceWasFull] = useState(bowlFull);
  useEffect(() => {
    const change = bowlFull
      ? Animated.spring(rice, {
          toValue: 1,
          friction: 4,
          tension: 140,
          useNativeDriver: NATIVE_DRIVER,
        })
      : Animated.timing(rice, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        });
    change.start();
    // A sparkle as the bowl fills again (not when the stage first shows a full one).
    const timers =
      bowlFull && !riceWasFull
        ? [setTimeout(() => setRiceSparkle(true), 0), setTimeout(() => setRiceSparkle(false), 700)]
        : [];
    return () => {
      change.stop();
      timers.forEach(clearTimeout);
    };
  }, [bowlFull, rice, riceWasFull]);
  return { rice, riceSparkle };
}

// Each poop keeps its spot on the floor (a slot). The one tapped is the one that flies up and
// fades; the ones still there stay put. Cleaned some other way (the partner, "청소" in the chat),
// the last ones go. A new poop takes the first free spot.
export function usePoopSlots(poops: number) {
  const [slots, setSlots] = useState(() => Array.from({ length: poops }, (_, i) => i));
  const [tapped, setTapped] = useState<number[]>([]);
  const [poopRound, setPoopRound] = useState(0);
  const [flyingOff, setFlyingOff] = useState<{ key: string; index: number }[]>([]);
  if (poops !== slots.length) {
    let next = slots;
    let taps = tapped;
    const gone: number[] = [];
    while (next.length > poops) {
      const slot = taps.find((s) => next.includes(s)) ?? next[next.length - 1];
      taps = taps.filter((s) => s !== slot);
      next = next.filter((s) => s !== slot);
      gone.push(slot);
    }
    while (next.length < poops) {
      let free = 0;
      while (next.includes(free)) free++;
      next = [...next, free];
    }
    if (gone.length) {
      setFlyingOff((prev) => [
        ...prev,
        ...gone.map((slot) => ({ key: `${poopRound}-${slot}`, index: slot })),
      ]);
    }
    setPoopRound(poopRound + 1);
    setSlots(next);
    setTapped([]);
  }
  const doneLeaving = useCallback(
    (key: string) => setFlyingOff((prev) => prev.filter((poop) => poop.key !== key)),
    [],
  );
  const tapSlot = (slot: number) => setTapped((prev) => [...prev, slot]);
  return { slots, flyingOff, tapSlot, doneLeaving };
}
