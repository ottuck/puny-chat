import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import type { Reaction, ReactionKind } from '../../reactions';
import { EVOLVE_MS, GLOW_MS, NATIVE_DRIVER } from './constants';

// `leap`: a reaction's hops, on top of the buddy's own (dancing, a hiccup), so that neither stops the
// other halfway. `glow`, `flash` and `burst`: the evolution's rings, flash and sparkles.
export function useReactionMotion(reaction: Reaction | null) {
  const [leap] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  // Movement that goes with a reaction: hops for a message or a new level, a shudder while
  // straining. Evolving: rings of light spread from the buddy while it changes, a quick flash as the
  // new look settles, then a burst of sparkles.
  useEffect(() => {
    if (!reaction) return;
    const jump = (h: number) =>
      Animated.sequence([
        Animated.timing(leap, { toValue: -h, duration: 140, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(leap, { toValue: 0, duration: 140, useNativeDriver: NATIVE_DRIVER }),
      ]);
    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(leap, { toValue: 2, duration: 60, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(leap, { toValue: 0, duration: 60, useNativeDriver: NATIVE_DRIVER }),
      ]),
      { iterations: 10 },
    );
    const transform = Animated.sequence([
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 0, duration: 0, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(glow, {
            toValue: 1,
            duration: GLOW_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
        { iterations: Math.floor(EVOLVE_MS / GLOW_MS) },
      ),
      Animated.timing(flash, { toValue: 0.6, duration: 60, useNativeDriver: NATIVE_DRIVER }),
      Animated.parallel([
        Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: NATIVE_DRIVER }),
        jump(12),
        Animated.sequence([
          Animated.timing(burst, { toValue: 0, duration: 0, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(burst, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
      ]),
    ]);
    const moves: Partial<Record<ReactionKind, Animated.CompositeAnimation>> = {
      message: Animated.sequence([jump(14), jump(8)]),
      cleaned: jump(10),
      pooped: shake,
      levelUp: Animated.sequence([jump(10), jump(6)]),
      // The top level: three hops while the room sparkles.
      maxLevel: Animated.sequence([jump(12), jump(8), jump(12)]),
      evolved: transform,
      jobChanged: transform,
      // Both came today: two big happy jumps.
      together: Animated.sequence([jump(16), jump(16)]),
      // The partner is here: one happy hop.
      here: Animated.sequence([jump(12), jump(6)]),
      // A friend came in for the first time: three big hops.
      joined: Animated.sequence([jump(16), jump(12), jump(16)]),
    };
    const move = moves[reaction.kind];
    move?.start();
    return () => {
      move?.stop();
      // Cut short by the next one, it lands softly; the next one's hops start from where it is.
      Animated.timing(leap, { toValue: 0, duration: 100, useNativeDriver: NATIVE_DRIVER }).start();
      glow.setValue(0);
      burst.setValue(1);
      flash.setValue(0);
    };
  }, [reaction, leap, flash, glow, burst]);
  return { leap, flash, glow, burst };
}
