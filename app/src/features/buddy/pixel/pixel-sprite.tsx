import { memo, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

// A pixel-art frame: equal-length rows, one character per pixel. '.' is transparent; every other
// character is looked up in the palette. Drawn as SVG squares, so it stays crisp at any size on
// iOS and the web (a scaled-up bitmap would be smoothed and blurry). One path per color rather than
// a rectangle per run: on the iPhone each SVG element is a native view, and a screen of sprites (the
// guide's rewards) made thousands of them at once, slow enough to tap twice.
export type Frame = readonly string[];
export type Palette = Readonly<Record<string, string>>;

type Run = { x: number; y: number; width: number; color: string };

const at = (frame: Frame, x: number, y: number) =>
  y < 0 || y >= frame.length || x < 0 || x >= frame[0].length ? '.' : frame[y][x];

// Twice the pixels by Scale2x (EPX): each pixel becomes four, and where two neighbors that meet at
// a corner match (and the other two do not), that quarter takes their color. Stairs on diagonals
// and round outlines join up; no new colors, and the drawn size stays the same.
export function smoothFrame(frame: Frame): Frame {
  const rows: string[] = [];
  frame.forEach((row, y) => {
    let top = '';
    let bottom = '';
    for (let x = 0; x < row.length; x++) {
      const p = row[x];
      const up = at(frame, x, y - 1);
      const right = at(frame, x + 1, y);
      const left = at(frame, x - 1, y);
      const down = at(frame, x, y + 1);
      const quarter = (a: string, b: string, c: string, d: string) =>
        a === b && a !== c && a !== d ? a : p;
      top += quarter(left, up, down, right) + quarter(up, right, left, down);
      bottom += quarter(down, left, right, up) + quarter(right, down, up, left);
    }
    rows.push(top, bottom);
  });
  return rows;
}

// Adjacent pixels of one color in a row become one rectangle.
function toRuns(frame: Frame, palette: Palette): Run[] {
  const runs: Run[] = [];
  frame.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      const color = palette[key];
      if (key !== '.' && color) runs.push({ x, y, width: end - x, color });
      x = end;
    }
  });
  return runs;
}

// Each color's runs as one path of rectangles, in the order the colors first appear. Each is a hair
// bigger than its run: without it, anti-aliasing leaves faint seams between squares.
function toPaths(runs: Run[]): { color: string; d: string }[] {
  const byColor = new Map<string, string[]>();
  for (const { x, y, width, color } of runs) {
    const w = width + 0.02;
    const parts = byColor.get(color) ?? [];
    parts.push(`M${x} ${y}h${w}v1.02h${-w}z`);
    byColor.set(color, parts);
  }
  return [...byColor].map(([color, parts]) => ({ color, d: parts.join('') }));
}

type Props = {
  frame: Frame;
  palette: Palette;
  // Screen points per pixel.
  scale: number;
  // Mirror horizontally (facing the other way).
  flipped?: boolean;
  // Drawn at twice the pixels with diagonals joined up (smoothFrame): the buddy, which is round.
  smooth?: boolean;
};

export const PixelSprite = memo(function PixelSprite({
  frame,
  palette,
  scale,
  flipped,
  smooth = false,
}: Props) {
  const drawn = useMemo(() => (smooth ? smoothFrame(frame) : frame), [frame, smooth]);
  const paths = useMemo(() => toPaths(toRuns(drawn, palette)), [drawn, palette]);
  const width = frame[0]?.length ?? 0;
  const height = frame.length;
  return (
    <Svg
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${drawn[0]?.length ?? 0} ${drawn.length}`}
      style={flipped ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {paths.map(({ color, d }) => (
        <Path key={color} d={d} fill={color} />
      ))}
    </Svg>
  );
});
