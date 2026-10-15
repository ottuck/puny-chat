import type { BuddyJob, BuddyStage } from '../api';
import type { Frame, Palette } from './pixel-sprite';

// The buddy's pixel art, in the spirit of GitAnimals: a small grid, few colors, a thick outline
// and a big head (docs/product.md, Buddy). An original character, a round mochi whose sprout
// shows how far it has grown: a small sprout, then two leaves, then a flower.

export const BUDDY_PALETTE: Palette = {
  k: '#3A2E2A', // outline, eyes
  e: '#FFF3DD', // egg shell
  d: '#EBD5B5', // egg shade
  o: '#F4A261', // egg spots
  b: '#FFD9AE', // body
  l: '#FFEDD5', // body highlight
  s: '#F2B27E', // body shade
  p: '#FF9E90', // cheeks
  g: '#8BCB6B', // leaf
  G: '#5DA14E', // leaf shade, stem
  P: '#B8E39A', // leaf, lit
  f: '#FF9EB5', // petals
  h: '#FFD3DE', // petal, lit
  F: '#F27A9B', // petal shade
  y: '#FFD166', // flower center
  m: '#D9576B', // inside of an open mouth
};

// prettier-ignore
const EGG: Frame = [
  '................',
  '......kkkk......',
  '.....keeeek.....',
  '....keeeeeek....',
  '...keeooeeeek...',
  '...keooooeeek...',
  '..keeeooeeeeek..',
  '..keeeeeeeooek..',
  '..keeeeeeoooek..',
  '..keooeeeeooek..',
  '..koooeeeeeedk..',
  '..keooeeeeeddk..',
  '...keeeeeeddk...',
  '....keeedddk....',
  '.....kkkkkk.....',
  '................',
];

// prettier-ignore
const BABY: Frame = [
  '....kkk..kkk....',
  '...kPggkkggPk...',
  '....kkkGGkkk....',
  '.....kkkkkk.....',
  '...kkbbbbbbkk...',
  '..kbllbbbbbbbk..',
  '.kbllbbbbbbbbbk.',
  '.kbbkbbbbbbkbbk.',
  '.kbbkbbbbbbkbbk.',
  '.kbpbbbkkbbbpbk.',
  '.kbbbbbbbbbbbbk.',
  '.ksbbbbbbbbbbsk.',
  '..ksbbbbbbbbsk..',
  '...kksssssskk...',
  '...kbk....kbk...',
  '...kkk....kkk...',
];

// prettier-ignore
const CHILD: Frame = [
  '....kkk......kkk....',
  '...kPggk....kggPk...',
  '...kgGGGkGGkGGGgk...',
  '....kkkkkGGkkkkk....',
  '......kkkkkkkk......',
  '....kkbbbbbbbbkk....',
  '...kbllbbbbbbbbbk...',
  '..kbllbbbbbbbbbbbk..',
  '..kbbbbbbbbbbbbbbk..',
  '.kbbbkbbbbbbbbkbbbk.',
  '.kbbbkbbbbbbbbkbbbk.',
  '.kbpbbbbbkkbbbbbpbk.',
  '.kbbbbbbbbbbbbbbbbk.',
  'kbkbbbbbbbbbbbbbbkbk',
  '.kksbbbbbbbbbbbbskk.',
  '...ksbbbbbbbbbbsk...',
  '....kksssssssskk....',
  '.....kbk....kbk.....',
  '.....kkk....kkk.....',
  '....................',
];

// prettier-ignore
const ADULT: Frame = [
  '..........kk..........',
  '........kkhfkk........',
  '.......khffFhfk.......',
  '.......kfFyyfFk.......',
  '........kffhfk........',
  '.....kkkkfFfFkkkk.....',
  '....kPgGkkkkkkGgPk....',
  '.......kkkkkkkk.......',
  '.....kkbbbbbbbbkk.....',
  '....kbllbbbbbbbbbk....',
  '...kbllbbbbbbbbbbbk...',
  '...kblbbbbbbbbbbbbk...',
  '..kbbbbbbbbbbbbbbbbk..',
  '..kbbbbkbbbbbbkbbbbk..',
  '..kbbbbkbbbbbbkbbbbk..',
  '..kbbpbbbbkkbbbbpbbk..',
  '..kbbbbbbbbbbbbbbbbk..',
  '.kbkbbbbbbbbbbbbbbkbk.',
  '..kksbbbbbbbbbbbbskk..',
  '....ksbbbbbbbbbbsk....',
  '.....kksssssssskk.....',
  '......kbk....kbk......',
  '......kkk....kkk......',
  '......................',
];

// Where the face and feet are in each hatched stage's grid, so every pose is made from one drawing
// and the character stays the same across poses.
type Anatomy = {
  base: Frame;
  eyes: [top: number, bottom: number, left: number, right: number];
  mouth: [row: number, from: number, to: number];
  cheeks: [row: number, left: number, right: number];
  feet: number; // first of the two feet rows
  feetStep: [string, string]; // those rows mid-step
};

const ANATOMY: Record<Exclude<BuddyStage, 'EGG'>, Anatomy> = {
  BABY: {
    base: BABY,
    eyes: [7, 8, 4, 11],
    mouth: [9, 7, 8],
    cheeks: [9, 3, 12],
    feet: 14,
    feetStep: ['..kbk......kbk..', '..kkk......kkk..'],
  },
  CHILD: {
    base: CHILD,
    eyes: [9, 10, 5, 14],
    mouth: [11, 9, 10],
    cheeks: [11, 3, 16],
    feet: 17,
    feetStep: ['....kbk......kbk....', '....kkk......kkk....'],
  },
  ADULT: {
    base: ADULT,
    eyes: [13, 14, 7, 14],
    mouth: [15, 10, 11],
    cheeks: [15, 5, 16],
    feet: 21,
    feetStep: ['.....kbk......kbk.....', '.....kkk......kkk.....'],
  },
};

export type Pose =
  | 'idle'
  | 'step'
  | 'blink'
  | 'happy'
  | 'sleep'
  | 'hungry'
  | 'eat'
  | 'strain'
  | 'laugh'
  | 'worried'
  | 'yawn'
  | 'hiccup'
  | 'surprised';

export const POSES_IN_ORDER: readonly Pose[] = [
  'idle',
  'step',
  'blink',
  'happy',
  'sleep',
  'hungry',
  'eat',
  'strain',
  'laugh',
  'worried',
  'yawn',
  'hiccup',
  'surprised',
];

type Pixel = [row: number, col: number, key: string];

function paint(frame: Frame, pixels: Pixel[]): Frame {
  const rows = frame.map((row) => row.split(''));
  for (const [r, c, key] of pixels) rows[r][c] = key;
  return rows.map((row) => row.join(''));
}

function makePoses({ base, eyes, mouth, cheeks, feet, feetStep }: Anatomy): Record<Pose, Frame> {
  const [top, bottom, left, right] = eyes;
  const [mouthRow, m1, m2] = mouth;
  const [cheekRow, cheekLeft, cheekRight] = cheeks;
  const open: Pixel[] = [
    [top, left, 'b'],
    [top, right, 'b'],
  ];
  const smiling: Pixel[] = [
    [bottom, left, 'b'],
    [bottom, left - 1, 'k'],
    [bottom, left + 1, 'k'],
    [bottom, right, 'b'],
    [bottom, right - 1, 'k'],
    [bottom, right + 1, 'k'],
  ];
  // Eyes shut as short lines.
  const shut: Pixel[] = [...open, [bottom, left - 1, 'k'], [bottom, right + 1, 'k']];
  // A small round "o" for a mouth, from the mouth row down.
  const oMouth: Pixel[] = [
    [mouthRow + 1, m1 - 1, 'k'],
    [mouthRow + 1, m2 + 1, 'k'],
    [mouthRow + 2, m1, 'k'],
    [mouthRow + 2, m2, 'k'],
  ];
  // The mouth opened down, `rows` rows of inside under the usual line, which widens to its edges.
  const openMouth = (rows: number, wideTop: boolean): Pixel[] => [
    ...(wideTop
      ? ([
          [mouthRow, m1 - 1, 'k'],
          [mouthRow, m2 + 1, 'k'],
        ] as Pixel[])
      : []),
    ...Array.from({ length: rows }, (_, i): Pixel[] => [
      [mouthRow + 1 + i, m1 - 1, 'k'],
      [mouthRow + 1 + i, m1, 'm'],
      [mouthRow + 1 + i, m2, 'm'],
      [mouthRow + 1 + i, m2 + 1, 'k'],
    ]).flat(),
    [mouthRow + 1 + rows, m1, 'k'],
    [mouthRow + 1 + rows, m2, 'k'],
  ];
  return {
    idle: base,
    step: base.map((row, i) => (i === feet ? feetStep[0] : i === feet + 1 ? feetStep[1] : row)),
    // Eyes as short lines.
    blink: paint(base, [...open, [bottom, left - 1, 'k'], [bottom, right + 1, 'k']]),
    // ^ ^
    happy: paint(base, smiling),
    sleep: paint(base, [...open, [bottom, left - 1, 'k'], [bottom, right - 1, 'k']]),
    // A small, lowered mouth.
    hungry: paint(base, [
      [mouthRow, m1, 'b'],
      [mouthRow, m2, 'b'],
      [mouthRow + 1, m1, 'k'],
      [mouthRow + 1, m2, 'k'],
    ]),
    // Mouth wide open (alternated with idle, it chews).
    eat: paint(base, [
      [mouthRow + 1, m1, 'k'],
      [mouthRow + 1, m2, 'k'],
      [mouthRow, m1 - 1, 'k'],
      [mouthRow, m2 + 1, 'k'],
    ]),
    // > <, squeezing out a poop.
    strain: paint(base, [
      [top, left, 'b'],
      [top, left - 1, 'k'],
      [top, right, 'b'],
      [top, right + 1, 'k'],
    ]),
    // ^ ^ and a wide-open mouth, laughing out loud.
    laugh: paint(base, [...smiling, ...openMouth(1, true)]),
    // Brows raised at the inner ends, clear of the eyes, and a little frown: "are you okay?"
    worried: paint(base, [
      [top - 2, left + 1, 'k'],
      [top - 2, right - 1, 'k'],
      [mouthRow + 1, m1 - 1, 'k'],
      [mouthRow + 1, m2 + 1, 'k'],
    ]),
    // Sleepy eyes and a tall open mouth.
    yawn: paint(base, [
      ...open,
      [bottom, left - 1, 'k'],
      [bottom, right - 1, 'k'],
      ...openMouth(2, false),
    ]),
    // Eyes squeezed, a small "o" and flushed cheeks: hic!
    hiccup: paint(base, [
      ...shut,
      ...oMouth,
      [cheekRow, cheekLeft + 1, 'p'],
      [cheekRow, cheekRight - 1, 'p'],
    ]),
    // Eyes grown tall and a small "o".
    surprised: paint(base, [[top - 1, left, 'k'], [top - 1, right, 'k'], ...oMouth]),
  };
}

const POSES: Record<Exclude<BuddyStage, 'EGG'>, Record<Pose, Frame>> = {
  BABY: makePoses(ANATOMY.BABY),
  CHILD: makePoses(ANATOMY.CHILD),
  ADULT: makePoses(ANATOMY.ADULT),
};

export function buddyFrame(stage: BuddyStage, pose: Pose): Frame {
  return stage === 'EGG' ? EGG : POSES[stage][pose];
}

export const STAGE_ORDER: readonly BuddyStage[] = ['EGG', 'BABY', 'CHILD', 'ADULT'];

export const PROP_PALETTE: Palette = {
  k: '#3A2E2A',
  c: '#A0673C', // poop
  h: '#C98D5A', // poop highlight
  w: '#FFFFFF', // rice, sparkles
  a: '#7FB3D5', // bowl
  r: '#FF6B81', // heart
  y: '#FFD166', // sparkles
  u: '#F07A4A', // level up
  g: '#8BCB6B', // plant
  G: '#5DA14E', // plant shade
  o: '#E0875F', // flower pot
  m: '#F4B8A8', // rug
  n: '#FFF1E6', // rug stripes
  f: '#FF9EB5', // flowers
  F: '#F27A9B', // flower shade
  S: '#C8CED6', // silver bowl
  Y: '#EFBF3A', // gold bowl
  e: '#C96F4A', // pot rim
  B: '#4F86B8', // glazed pot, headphone cups
  v: '#BFC8D1', // steam, quill shade
  z: '#E9EDF1', // pot lid
  K: '#5B5562', // dark grey: mic, headband, ink
  R: '#6B4426', // coffee
  D: '#9C6B43', // wood
  L: '#C99A68', // wood, lit
  j: '#3F8740', // leaf outline
  P: '#B8E39A', // leaf, lit
  q: '#74502F', // wood, dark
  x: '#99A2AD', // metal shade
  N: '#3A6A96', // glazed pot shade
  Z: '#33413B', // chalkboard
};

// prettier-ignore
export const POOP: Frame = [
  '....k...',
  '...kck..',
  '..kchck.',
  '.kcchcck',
  'kcccccck',
  'kkkkkkkk',
];

// The bowl gets finer with levels: blue, then silver (with a shine), then gold.
export type BowlTier = 0 | 1 | 2;
const BOWL_COLOR = ['a', 'S', 'Y'] as const;

// The rice on top of a bowl, drawn over an empty one so it can pop in and shrink away.
// prettier-ignore
export const RICE: Frame = [
  '...wwwwww...',
  '..wwwwwwww..',
];

export function bowl(full: boolean, tier: BowlTier): Frame {
  const c = BOWL_COLOR[tier];
  const shine = tier > 0 ? 'w' : c;
  return [
    full ? '...wwwwww...' : '............',
    full ? '..wwwwwwww..' : '............',
    'kkkkkkkkkkkk',
    '.k' + c + shine + c.repeat(6) + 'k.',
    '..k' + c.repeat(6) + 'k..',
    '...kkkkkk...',
  ];
}

// prettier-ignore
export const HEART: Frame = [
  '.rr.rr.',
  'rrrrrrr',
  'rrrrrrr',
  '.rrrrr.',
  '..rrr..',
  '...r...',
];

// prettier-ignore
export const ZZZ: Frame = [
  'kkkk',
  '..k.',
  '.k..',
  'kkkk',
];

// prettier-ignore
export const SPARKLE: Frame = [
  '..y..',
  '..y..',
  'yywyy',
  '..y..',
  '..y..',
];

// prettier-ignore
export const EXCLAIM: Frame = [
  'kk',
  'kk',
  'kk',
  'kk',
  '..',
  'kk',
];

// "LV ▲" over the buddy's head on a new level.
// prettier-ignore
export const LEVEL_UP: Frame = [
  'u....u...u....u..',
  'u....u...u...uuu.',
  'u.....u.u...uuuuu',
  'u.....u.u....uuu.',
  'uuuu...u.....uuu.',
];

// ♪ rising from a singing buddy.
// prettier-ignore
export const NOTE: Frame = [
  '...kk',
  '...kk',
  '...k.',
  '...k.',
  '.kkk.',
  'kkkk.',
  '.kk..',
];

// --- Job props (docs/art-handover.md, 6) ---

// What an adult holds at its work, small and plain: two frames each, swapped every tick (steam
// drifting, water pouring, a note, a line written).
// prettier-ignore
const POT: [Frame, Frame] = [[
  '...v....v...',
  '....v....v..',
  '...v....v...',
  '............',
  '.....kk.....',
  '...kkkkkk...',
  '..kzzzzzzk..',
  '.kkkkkkkkkk.',
  'kkSwSSSSSSkk',
  '.kSwSSSSSSk.',
  '.kSSSSSSSSk.',
  '..kkkkkkkk..',
], [
  '....v....v..',
  '...v....v...',
  '....v....v..',
  '............',
  '.....kk.....',
  '...kkkkkk...',
  '..kzzzzzzk..',
  '.kkkkkkkkkk.',
  'kkSwSSSSSSkk',
  '.kSwSSSSSSk.',
  '.kSSSSSSSSk.',
  '..kkkkkkkk..',
]];

// prettier-ignore
const WATERING_CAN: [Frame, Frame] = [[
  '............',
  '...kkkk.....',
  '..k....k....',
  '..k....k..kk',
  '.kkkkkkk.kak',
  '.kaaaaaakak.',
  '.kawaaaaak..',
  '.kawaaaak...',
  '.kaaaaaak...',
  '.kaaaaaak...',
  '..kkkkkk....',
  '............',
], [
  '............',
  '...kkkk.....',
  '..k....k....',
  '..k....k..kk',
  '.kkkkkkk.kak',
  '.kaaaaaakak.',
  '.kawaaaaak.a',
  '.kawaaaak...',
  '.kaaaaaak.a.',
  '.kaaaaaak..a',
  '..kkkkkk....',
  '..........a.',
]];

// prettier-ignore
const HEADPHONES: [Frame, Frame] = [[
  '............',
  '............',
  '............',
  '...kkkkkk...',
  '..kKKKKKKk..',
  '.kKk....kKk.',
  '.kk......kk.',
  'kBBk....kBBk',
  'kBwk....kwBk',
  'kBBk....kBBk',
  '.kk......kk.',
  '............',
], [
  '...........k',
  '...........k',
  '..........kk',
  '...kkkkkk...',
  '..kKKKKKKk..',
  '.kKk....kKk.',
  '.kk......kk.',
  'kBBk....kBBk',
  'kBwk....kwBk',
  'kBBk....kBBk',
  '.kk......kk.',
  '............',
]];

// prettier-ignore
const QUILL: [Frame, Frame] = [[
  '.........kk.',
  '........kwk.',
  '.......kwvk.',
  '......kwvk..',
  '.....kwvk...',
  '....kwvk....',
  '...kkkk.....',
  'kkkkkkkkkk..',
  'knnnnnnnnk..',
  'knKKKnnnnk..',
  'knnnnnnnnk..',
  'kkkkkkkkkk..',
], [
  '..........kk',
  '.........kwk',
  '........kwvk',
  '.......kwvk.',
  '......kwvk..',
  '.....kwvk...',
  '....kkkk....',
  'kkkkkkkkkk..',
  'knnnnnnnnk..',
  'knKKKKnnnk..',
  'knnnnnnnnk..',
  'kkkkkkkkkk..',
]];

// prettier-ignore
const COFFEE: [Frame, Frame] = [[
  '...v..v.....',
  '..v..v......',
  '...v..v.....',
  '............',
  '.kkkkkkkk...',
  '.kRRRRRRk...',
  '.kwwwwwwkkk.',
  '.kwwwwwwk.k.',
  '.kwwwwwwkkk.',
  '..kwwwwk....',
  'kwwwwwwwwwk.',
  '.kkkkkkkkk..',
], [
  '..v..v......',
  '...v..v.....',
  '..v..v......',
  '............',
  '.kkkkkkkk...',
  '.kRRRRRRk...',
  '.kwwwwwwkkk.',
  '.kwwwwwwk.k.',
  '.kwwwwwwkkk.',
  '..kwwwwk....',
  'kwwwwwwwwwk.',
  '.kkkkkkkkk..',
]];

export const JOB_PROPS: Record<BuddyJob, [Frame, Frame]> = {
  CHEF: POT,
  GARDENER: WATERING_CAN,
  DJ: HEADPHONES,
  POET: QUILL,
  BARISTA: COFFEE,
};

// --- Job stations (docs/art-handover.md, A·B) ---

// What an adult works at, on the left of the stage in the buddy's own pixel size, always drawn in
// front of it: it walks over and works behind it (a counter or desk, which hides its lower body)
// or beside it (the plant). Two frames each, swapped while it works. The counters reach just below
// the buddy's mouth and are a little narrower than it, so it stands towards their right end;
// whatever stands on them is at the left end, clear of the face.
export type Station = {
  frames: [Frame, Frame];
  // Rows at the bottom drawn below the floor line, so the station stands in front of the buddy.
  sink: number;
  // Where the buddy's grid stands while it works, in cells from the station's left edge.
  standAt: number;
  // A tool in its hand while it works, by the grid cell of the tool's top left.
  held?: { frames: [Frame, Frame]; row: number; col: number };
};

// A kitchen counter: a pot on a lit burner (the flame flickers, the steam drifts), a cutting board
// with tomato and herbs, an oven door with a window and two drawers.
// prettier-ignore
const KITCHEN: [Frame, Frame] = [[
  '..v...v...............',
  '...v...v..............',
  '..v...v...............',
  '...kk.................',
  '.kkkkkk...............',
  '.kzwzzk...............',
  'kkkkkkkk..............',
  '.kwSSxk...............',
  '.kSSSxk...............',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kKuuuuKwwwwwwwLLLLLLwk',
  'kzzzzzzzzzzzzzLrLrgLzk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'knKKKKKKKKnknnnnnnnnnk',
  'knkKKvKKKknknnnKKKnnnk',
  'knkKvKKKKknkvvvvvvvvvk',
  'knkkkkkkkknknnnKKKnnnk',
  'kkkkkkkkkkkkkkkkkkkkkk',
], [
  '...v...v..............',
  '..v...v...............',
  '...v...v..............',
  '....kk................',
  '.kkkkkk...............',
  '.kzwzzk...............',
  'kkkkkkkk..............',
  '.kwSSxk...............',
  '.kSSSxk...............',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kKyyyyKwwwwwwwLLLLLLwk',
  'kzzzzzzzzzzzzzLrLrgLzk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'knKKKKKKKKnknnnnnnnnnk',
  'knkKKvKKKknknnnKKKnnnk',
  'knkKvKKKKknkvvvvvvvvvk',
  'knkkkkkkkknknnnKKKnnnk',
  'kkkkkkkkkkkkkkkkkkkkkk',
]];

// A plant taller than the buddy, in a clay pot: broad outlined leaves up a trunk. Its crown
// sways while it is watered.
// prettier-ignore
const BIG_PLANT: [Frame, Frame] = [[
  '.....jj.....',
  '....jPgj....',
  '...jPggGj...',
  '...jgPGgj...',
  '...jggGgj...',
  '....jgGj....',
  '.....jj.jjj.',
  '.....DqjPPgj',
  '.....DjGGGgj',
  '.jjj.Dqjggj.',
  'jgPPjDq.jj..',
  'jgGGGjq.....',
  '.jggjDq.jjj.',
  '..jj.DqjPPgj',
  '.....DjGGGgj',
  '.jjj.Dqjggj.',
  'jgPPjDq.jj..',
  'jgGGGjq.....',
  '.jggjDq.jjj.',
  '..jj.DqjPPgj',
  '.....DjGGGgj',
  '.....Dqjggj.',
  '.....Dq.jj..',
  '.....Dq.....',
  '.kkkkkkkkkk.',
  '.koooooooek.',
  '..kkkkkkkk..',
  '..kooooooek.',
  '...koooook..',
  '...kkkkkk...',
], [
  '......jj....',
  '.....jPgj...',
  '....jPggGj..',
  '....jgPGgj..',
  '....jggGgj..',
  '.....jgGj...',
  '......jj.jjj',
  '.....DqjPPgj',
  '.....DjGGGgj',
  '.jjj.Dqjggj.',
  'jgPPjDq.jj..',
  'jgGGGjq.....',
  '.jggjDq.jjj.',
  '..jj.DqjPPgj',
  '.....DjGGGgj',
  '.jjj.Dqjggj.',
  'jgPPjDq.jj..',
  'jgGGGjq.....',
  '.jggjDq.jjj.',
  '..jj.DqjPPgj',
  '.....DjGGGgj',
  '.....Dqjggj.',
  '.....Dq.jj..',
  '.....Dq.....',
  '.kkkkkkkkkk.',
  '.koooooooek.',
  '..kkkkkkkk..',
  '..kooooooek.',
  '...koooook..',
  '...kkkkkk...',
]];

// The late-night radio desk: a broadcast mic on a boom stand, headphones on the desk, faders, a
// level meter that jumps with the music and the on-air lamp, which blinks.
// prettier-ignore
const RADIO_DESK: [Frame, Frame] = [[
  '...kkkk...............',
  '..kSwSSk..............',
  '..kxSxSk..............',
  '..kSxSxk..............',
  '..kxSxSk..............',
  '...kkkk...............',
  '....kk................',
  '.kkkkk................',
  '.k....................',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kzzzzzzzzzzzzzkKKKKkzk',
  'kSSSSSSSSSSSSkBBkkBBkk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kSKSSwSSKSSKSSKKKkkkkk',
  'kSwSSKSSKSSwSSKKKkrrkk',
  'kSKSSKSSwSSKSSgggkrrkk',
  'kSKSSKSSKSSKSSgggkkkkk',
  'kkkkkkkkkkkkkkkkkkkkkk',
], [
  '...kkkk...............',
  '..kSwSSk..............',
  '..kxSxSk..............',
  '..kSxSxk..............',
  '..kxSxSk..............',
  '...kkkk...............',
  '....kk................',
  '.kkkkk................',
  '.k....................',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kzzzzzzzzzzzzzkKKKKkzk',
  'kSSSSSSSSSSSSkBBkkBBkk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kSwSSKSSKSSKSSrrrkkkkk',
  'kSKSSKSSwSSKSSyyykuukk',
  'kSKSSwSSKSSKSSgggkuukk',
  'kSKSSKSSKSSwSSgggkkkkk',
  'kkkkkkkkkkkkkkkkkkkkkk',
]];

// A wooden writing desk: a lit candle, a quill in its inkwell, an open book being written in, two
// drawers with brass knobs.
// prettier-ignore
const WRITING_DESK: [Frame, Frame] = [[
  '......kk..............',
  '.....kwk..............',
  '.u..kwvk..............',
  '.y..kwk...............',
  'knk.kvk...............',
  'knkkkkkk..............',
  'knkKwKKk..............',
  'knkKKKKk..............',
  'kYkkkkkk..............',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLwwwwkwwwwLLLk',
  'kLLLLLLLLwKKwkwKwwLLLk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkDkkkkkkkkkk',
  'kDkLLLyLLLkDkLLLyLLLkk',
  'kDkkkkkkkkkDkkkkkkkkkk',
  'kDqDDDqDDqDDDqDDDqDDqk',
  'kkkkkkkkkkkkkkkkkkkkkk',
], [
  '......kk..............',
  '.....kwk..............',
  '.y..kwvk..............',
  '.y..kwk...............',
  'knk.kvk...............',
  'knkkkkkk..............',
  'knkKwKKk..............',
  'knkKKKKk..............',
  'kYkkkkkk..............',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLwwwwkwwwwLLLk',
  'kLLLLLLLLwKKwkwKKwLLLk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkDkkkkkkkkkk',
  'kDkLLLyLLLkDkLLLyLLLkk',
  'kDkkkkkkkkkDkkkkkkkkkk',
  'kDqDDDqDDqDDDqDDDqDDqk',
  'kkkkkkkkkkkkkkkkkkkkkk',
]];

// A café counter: an espresso machine with its gauge pulling a shot into a cup, and a chalkboard
// menu on the front.
// prettier-ignore
const CAFE_COUNTER: [Frame, Frame] = [[
  '...v.v................',
  'kkkkkkkk..............',
  'kSwSSSxk..............',
  'kSkwkSxk..............',
  'kKKKKKKk..............',
  'kxkKKkxk..............',
  'kxkwwkxk..............',
  'kxkwwkxk..............',
  'kkkkkkkk..............',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLLLLLLLLLLLLLk',
  'kDDDDDDDDDDDDDDDDDDDDk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkkkkkkkkkkDk',
  'kDkZwwwZvvvvZwwZvvZkDk',
  'kDkZvvZZwwwZZvvvZwZkDk',
  'kDkkkkkkkkkkkkkkkkkkDk',
  'kkkkkkkkkkkkkkkkkkkkkk',
], [
  '..v.v.................',
  'kkkkkkkk..............',
  'kSwSSSxk..............',
  'kSkwkSxk..............',
  'kKKKKKKk..............',
  'kxkKKkxk..............',
  'kxkRRkxk..............',
  'kxkwwkxk..............',
  'kkkkkkkk..............',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLLLLLLLLLLLLLk',
  'kDDDDDDDDDDDDDDDDDDDDk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkkkkkkkkkkDk',
  'kDkZwwwZvvvvZwwZvvZkDk',
  'kDkZvvZZwwwZZvvvZwZkDk',
  'kDkkkkkkkkkkkkkkkkkkDk',
  'kkkkkkkkkkkkkkkkkkkkkk',
]];

// The gardener's watering can, held out towards the plant: the water falls from the spout.
// prettier-ignore
export const HELD_CAN: [Frame, Frame] = [[
  '.....kkkk.',
  '....k....k',
  'kk..kkkkkk',
  'kak.kaaaak',
  '.kakkawaak',
  '..kaaawaak',
  '...kaaaaak',
  '...kaaaaak',
  '....kkkkk.',
  'a.........',
  '..........',
  '.a........',
], [
  '.....kkkk.',
  '....k....k',
  'kk..kkkkkk',
  'kak.kaaaak',
  '.kakkawaak',
  '..kaaawaak',
  '...kaaaaak',
  '...kaaaaak',
  '....kkkkk.',
  '..........',
  'a.........',
  '..........',
]];

export const JOB_STATIONS: Record<BuddyJob, Station> = {
  CHEF: { frames: KITCHEN, sink: 3, standAt: 3 },
  GARDENER: {
    frames: BIG_PLANT,
    sink: 1,
    standAt: 15,
    held: { frames: HELD_CAN, row: 12, col: -8 },
  },
  DJ: { frames: RADIO_DESK, sink: 3, standAt: 3 },
  POET: { frames: WRITING_DESK, sink: 3, standAt: 3 },
  BARISTA: { frames: CAFE_COUNTER, sink: 3, standAt: 3 },
};

// --- Decorations (docs/product.md, 무대 꾸미기) ---

// The plant in the corner grows finer with levels: a sprout in a clay pot, a leafy plant in a
// rimmed pot, then flowers in a glazed pot.
// prettier-ignore
const PLANT_1: Frame = [
  '.kkk...kkk.',
  'kPggk.kggPk',
  'kgGGGkGGGgk',
  '.kkkkGkkkk.',
  '.....G.....',
  '.....G.....',
  'kkkkkkkkkkk',
  'kwoooooooek',
  'kkkkkkkkkkk',
  '.kooooooek.',
  '.kooooooek.',
  '..kooooeek.',
  '..kkkkkkk..',
];

// prettier-ignore
const PLANT_2: Frame = [
  '..kkk...kkk..',
  '.kPggk.kggPk.',
  '.kgGGGGGGGgk.',
  '.kkkkkGkkkkk.',
  'kPggk.G.kggPk',
  'kgGGGkGkGGGgk',
  '.kkkkkGkkkkk.',
  '..kPggGggPk..',
  '..kgGkGGGgk..',
  '...kkkGkkk...',
  'kkkkkkkkkkkkk',
  'kwoooooooooek',
  'kkkkkkkkkkkkk',
  '.kooooooooek.',
  '.kooooooooek.',
  '..kooooooeek.',
  '..kkkkkkkkk..',
];

// prettier-ignore
const PLANT_3: Frame = [
  '.kkk.........',
  'kfyfk....kkk.',
  'kffFk...kfyfk',
  '.kkk.kkkkffFk',
  '....kfyfkkkk.',
  '.kkkkffFk....',
  'kPggkkkk.kkk.',
  'kgGGGkG.kggPk',
  '.kkkk.GkGGGgk',
  '......G.kkkk.',
  'kkkkkkkkkkkkk',
  'kwaaaaaaaaaak',
  'kkkkkkkkkkkkk',
  '.kaBBBBBBBNk.',
  '.kaBBBBBBBNk.',
  '..kBBBBBBNNk.',
  '..kkkkkkkkk..',
];

export type PlantTier = 1 | 2 | 3;
export const PLANTS: Record<PlantTier, Frame> = { 1: PLANT_1, 2: PLANT_2, 3: PLANT_3 };

export const RUG: Frame = [
  '..' + 'm'.repeat(26) + '..',
  '.' + 'mmn'.repeat(9) + 'm.',
  '.' + 'nmm'.repeat(9) + 'm.',
  '..' + 'm'.repeat(26) + '..',
];
