import type { Frame, Palette } from './pixel-sprite';
import { buddyFrame } from './sprites';
import type { Hatched } from './looks';

// The hot spring (docs/fun-improvements.md, 목욕): a wooden tub the buddy sits in up to its cheeks,
// steam, and the buttons that go there and back home.

export const BATH_PALETTE: Palette = {
  k: '#3A2E2A', // outline
  W: '#F3D7A8', // rim, lit wood
  L: '#E6BC85', // staves, lit side
  V: '#D7A469', // staves
  U: '#BC8650', // staves, shaded side
  v: '#9E6C3C', // stave seams
  H: '#6F4A2E', // hoops
  h: '#9A6A43', // hoops, lit
  q: '#8FCDEB', // water
  Q: '#E4F6FF', // water, glinting
  i: '#5FA9CF', // water, deep
  w: '#FFFFFF', // steam, towel
  x: '#A9BAC6', // steam shade
  R: '#E8575A', // the sign's steam, the roof
  D: '#9C6B43', // door
  // The bamboo fence behind.
  b: '#C9DCB4', // bamboo, lit
  B: '#AEC897', // bamboo
  n: '#8FAE7A', // bamboo, shaded; its knots
  r: '#B09272', // the binding
  // Clouds in the sky.
  c: '#FFFFFF', // cloud
  C: '#C2D7E5', // cloud, shaded underneath
};

// Where the water comes to on the buddy: two rows under its cheeks.
const WATER_ROW: Record<Hatched, number> = { BABY: 12, CHILD: 14, ADULT: 18 };
// The tub is this many pixels wider than the buddy on each side.
const TUB_SIDE = 3;
// It stands this many pixels lower than the buddy's grid: the buddy sits inside, off the floor.
export const TUB_SINK = 2;

export type Tub = {
  // Behind the buddy: the far rim and the inside of the far wall, seen on both sides of it.
  back: Frame;
  // In front: the water's surface, the near rim and the round staves with two hoops.
  front: Frame;
  // The buddy's grid sits this many pixels in from the tub's left.
  inset: number;
};

const tubs = new Map<Hatched, Tub>();

// A row of staves across `inner` pixels, lit on the left and shaded on the right like a round tub.
function staves(inner: number, hoop: boolean): string {
  return [...Array(inner)]
    .map((_, i) => {
      const side = i < inner * 0.28 ? 'lit' : i >= inner * 0.74 ? 'shade' : 'mid';
      if (hoop) return side === 'lit' ? 'h' : 'H';
      if (i % 4 === 3) return 'v';
      return side === 'lit' ? 'L' : side === 'shade' ? 'U' : 'V';
    })
    .join('');
}

export function tubFor(stage: Hatched): Tub {
  const known = tubs.get(stage);
  if (known) return known;
  const grid = buddyFrame(stage, 'idle');
  const width = grid[0].length + 2 * TUB_SIDE;
  const height = grid.length - WATER_ROW[stage] + TUB_SINK;
  const inner = width - 2;
  // Ripples on the water: a glint here and there, deeper at the ends.
  const water = [...Array(inner - 2)]
    .map((_, i) => (i === 0 || i === inner - 3 ? 'i' : i % 6 === 2 || i % 6 === 3 ? 'Q' : 'q'))
    .join('');
  const front: string[] = [`.k${water}k.`, `k${'W'.repeat(inner)}k`];
  const body = height - 3;
  for (let row = 0; row < body; row++) {
    const hoop = row === 1 || row === body - 2;
    // A barrel's foot: the last row tucks in.
    front.push(row === body - 1 ? `.k${staves(inner - 2, false)}k.` : `k${staves(inner, hoop)}k`);
  }
  front.push(`..${'k'.repeat(inner - 2)}..`);
  const tub: Tub = {
    back: [
      `..${'k'.repeat(inner - 2)}..`,
      `.k${'W'.repeat(inner - 2)}k.`,
      `.k${'U'.repeat(inner - 2)}k.`,
    ],
    front,
    inset: TUB_SIDE,
  };
  tubs.set(stage, tub);
  return tub;
}

// A wisp of steam curling up off the water, two frames.
// prettier-ignore
export const STEAM: readonly Frame[] = [
  [
    '..w.',
    '.wx.',
    '.w..',
    '..w.',
    '..xw',
    '..w.',
    '.w..',
    '.x..',
  ],
  [
    '.w..',
    '.xw.',
    '..w.',
    '.w..',
    'wx..',
    '.w..',
    '..w.',
    '..x.',
  ],
];

// One bay of the bamboo fence along the back (repeated across the stage): two poles of uneven
// height with knots, bound by two rails. Soft colors: it stays behind the buddy.
// prettier-ignore
const FENCE_BAY: Frame = [
  '.B......',
  'bBn..B..',
  'bBn.bBn.',
  'nnn.bBn.',
  'bBn.nnn.',
  'rrrrrrrr',
  'bBn.bBn.',
  'bBn.bBn.',
  'bBn.bBn.',
  'nnn.bBn.',
  'bBn.nnn.',
  'rrrrrrrr',
  'bBn.bBn.',
  'bBn.bBn.',
];

// The fence as wide as `cells` pixels.
export function fence(cells: number): Frame {
  const bays = Math.ceil(cells / FENCE_BAY[0].length);
  return FENCE_BAY.map((line) => line.repeat(bays).slice(0, cells));
}

// A little wooden bucket with a towel over its rim, by the tub.
// prettier-ignore
export const BUCKET: Frame = [
  '.kkkkkkkkk.',
  'kWWWWWWWWWk',
  'kLwwVvVVvUk',
  'kHwwHHHHHHk',
  'kLxwVvVVvUk',
  '.kLVVvVVUk.',
  '..kkkkkkk..',
];

// Clouds drifting across the sky: a big one and a small one, soft, with no outline.
// prettier-ignore
export const CLOUD_BIG: Frame = [
  '..........cccc..........',
  '........cccccccc........',
  '...cccc.ccccccccc.......',
  '..cccccccccccccccccccc..',
  '.cccccccccccccccccccccc.',
  'cccccccccccccccccccccccc',
  'CccccccccccccccccccccccC',
  '..CCCCCCCCCCCCCCCCCCCC..',
];

// prettier-ignore
export const CLOUD_SMALL: Frame = [
  '.....ccc......',
  '...ccccccc.cc.',
  '.ccccccccccccc',
  'cccccccccccccc',
  '.CCCCCCCCCCCC.',
];

// A drop of water, splashed up when the buddy is petted in the tub.
// prettier-ignore
export const DROP: Frame = [
  '.Q.',
  'QqQ',
  '.q.',
];

// The button to the hot spring: the ♨ sign, a tub with steam.
// prettier-ignore
export const BATH_ICON: Frame = [
  '..R...R...R.',
  '.R...R...R..',
  '.R...R...R..',
  '..R...R...R.',
  '..R...R...R.',
  '.R...R...R..',
  'kkkkkkkkkkkk',
  'kqQqqqqqQqqk',
  'kWWWWWWWWWWk',
  'kVVvVVVvVVVk',
  '.kkkkkkkkkk.',
];

// The button to the album of buddies gone their own way: a framed picture with a heart, hung on a
// nail.
// prettier-ignore
export const ALBUM_ICON: Frame = [
  '.....kk.....',
  '....k..k....',
  'kkkkkkkkkkkk',
  'kWWWWWWWWWWk',
  'kWqqqqqqqqWk',
  'kWqRRqqRRqWk',
  'kWqRRRRRRqWk',
  'kWqqRRRRqqWk',
  'kWqqqRRqqqWk',
  'kWWWWWWWWWWk',
  'kkkkkkkkkkkk',
];

// The button back home: a little house.
// prettier-ignore
export const HOME_ICON: Frame = [
  '.....kk.....',
  '....kRRk....',
  '...kRRRRk...',
  '..kRRRRRRk..',
  '.kRRRRRRRRk.',
  'kkkkkkkkkkkk',
  '.kWWWWWWWWk.',
  '.kWDDWWqqWk.',
  '.kWDDWWqqWk.',
  '.kWDDWWWWWk.',
  '.kkkkkkkkkk.',
];
