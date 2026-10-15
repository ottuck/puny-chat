import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// The scene change on the buddy's stage (docs/fun-improvements.md, 목욕): a black circle closes on
// the buddy, the scene changes behind it, and it opens again. The circle's edge steps in blocks like
// the pixel art. With reduced motion on, a short fade to black and back instead.

// How it moves, as how closed it is (0 open, 1 dark) over time: it swoops in to a small circle on
// the buddy, holds there for a beat, and snaps shut; then the same the other way. About 0.8 s.
type Leg = { to: number; ms: number; ease: (p: number) => number };
const outCubic = (p: number) => 1 - (1 - p) ** 3;
const inQuad = (p: number) => p * p;
// The point in the run where only a small circle is left round the buddy (`spot`).
const SPOT = 0.8;
const CLOSING: readonly Leg[] = [
  { to: SPOT, ms: 210, ease: outCubic },
  { to: SPOT, ms: 120, ease: inQuad },
  { to: 1, ms: 80, ease: inQuad },
];
const HOLD_MS = 90;
const OPENING: readonly Leg[] = [
  { to: SPOT, ms: 80, ease: outCubic },
  { to: SPOT, ms: 90, ease: inQuad },
  { to: 0, ms: 260, ease: inQuad },
];
// The size of the circle's steps, in points.
const STEP = 6;
const SHADE = '#16110F';
// A timer rather than animation frames: those stop in a hidden tab, and the scene would wait.
const FRAME_MS = 16;

export type IrisRun = {
  // A new id starts a run.
  id: number;
  // Fully dark: change the scene now.
  onCovered: () => void;
  onDone?: () => void;
};

// Covered rows of a `width` by `height` stage, outside a circle of radius `r` around (fx, fy).
function irisPath(width: number, height: number, fx: number, fy: number, r: number): string {
  let d = '';
  const rect = (x: number, y: number, w: number, h: number) => {
    if (w > 0 && h > 0) d += `M${x} ${y}h${w}v${h}h${-w}z`;
  };
  for (let y = 0; y < height; y += STEP) {
    const dy = Math.abs(y + STEP / 2 - fy);
    if (dy >= r) {
      rect(0, y, width, STEP);
      continue;
    }
    const half = Math.sqrt(r * r - dy * dy);
    const left = Math.max(0, Math.round((fx - half) / STEP) * STEP);
    const right = Math.min(width, Math.round((fx + half) / STEP) * STEP);
    rect(0, y, left, STEP);
    rect(right, y, width - right, STEP);
  }
  return d;
}

export function Iris({
  run,
  width,
  height,
  focus,
  spot = 48,
}: {
  run: IrisRun | null;
  width: number;
  height: number;
  // Where the circle closes: the buddy. The middle of the stage if not given.
  focus?: { x: number; y: number };
  // The radius of the small circle it holds on, in points: about the buddy's size.
  spot?: number;
}) {
  // How closed it is: 0 open, 1 dark. Null when not running.
  const [shut, setShut] = useState<number | null>(null);
  const [fade, setFade] = useState(false);
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });

  const id = run?.id;
  useEffect(() => {
    if (id === undefined) return;
    let cancelled = false;
    let frame: ReturnType<typeof setTimeout> | undefined;
    let hold: ReturnType<typeof setTimeout> | undefined;
    // Runs the legs one after another from `from`, then `then`.
    const play = (legs: readonly Leg[], from: number, then: () => void) => {
      const [leg, ...rest] = legs;
      if (!leg) return then();
      const start = Date.now();
      const step = () => {
        if (cancelled) return;
        const p = Math.min(1, (Date.now() - start) / leg.ms);
        setShut(from + (leg.to - from) * leg.ease(p));
        if (p < 1) frame = setTimeout(step, FRAME_MS);
        else play(rest, leg.to, then);
      };
      frame = setTimeout(step, FRAME_MS);
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (cancelled) return;
        setFade(reduced);
        // Without the motion: a plain fade, as long.
        const closing = reduced ? [{ to: 1, ms: 300, ease: inQuad }] : CLOSING;
        const opening = reduced ? [{ to: 0, ms: 300, ease: inQuad }] : OPENING;
        play(closing, 0, () => {
          latest.current?.onCovered();
          hold = setTimeout(
            () =>
              play(opening, 1, () => {
                setShut(null);
                latest.current?.onDone?.();
              }),
            HOLD_MS,
          );
        });
      });
    return () => {
      cancelled = true;
      if (frame) clearTimeout(frame);
      if (hold) clearTimeout(hold);
    };
  }, [id]);

  if (shut === null || width === 0) return null;
  const fx = focus?.x ?? width / 2;
  const fy = focus?.y ?? height / 2;
  // Far enough to clear the farthest corner.
  const reach = Math.hypot(Math.max(fx, width - fx), Math.max(fy, height - fy)) + STEP;
  const radius =
    shut <= SPOT ? reach + (spot - reach) * (shut / SPOT) : spot * (1 - (shut - SPOT) / (1 - SPOT));
  return (
    // Blocks taps while it runs: the scene under it is changing.
    <View style={StyleSheet.absoluteFill}>
      {fade ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: SHADE, opacity: shut }]} />
      ) : (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path d={irisPath(width, height, fx, fy, radius)} fill={SHADE} />
        </Svg>
      )}
    </View>
  );
}
