// Rectangles drawn as one SVG path per fill, in the order the fills first appear. On the iPhone
// each SVG element is a native view, so a sprite, a floor or falling snow drawn a rectangle at a
// time ran to hundreds or thousands of them (docs/fun-improvements.md, 그림 작업).
export type Box = { x: number; y: number; w: number; h: number; fill: string };

export function boxPaths(boxes: readonly Box[]): { fill: string; d: string }[] {
  const byFill = new Map<string, string[]>();
  for (const { x, y, w, h, fill } of boxes) {
    const parts = byFill.get(fill) ?? [];
    parts.push(`M${x} ${y}h${w}v${h}h${-w}z`);
    byFill.set(fill, parts);
  }
  return [...byFill].map(([fill, parts]) => ({ fill, d: parts.join('') }));
}
