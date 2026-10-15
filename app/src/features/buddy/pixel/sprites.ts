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
  f: '#FF9EB5', // petals
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
  '.......gg.......',
  '......gGgg......',
  '........G.......',
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
  '......gg....gg......',
  '.....gGgg..ggGg.....',
  '......ggGggGgg......',
  '.........GG.........',
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
  '..........ffff..........',
  '.........ffyyff.........',
  '.........ffyyff.........',
  '..........ffff..........',
  '.......gg..GG..gg.......',
  '........ggGGGGgg........',
  '...........GG...........',
  '.......kkkkkkkkkk.......',
  '.....kkbbbbbbbbbbkk.....',
  '....kbllbbbbbbbbbbbk....',
  '...kbllbbbbbbbbbbbbbk...',
  '..kbbbbbbbbbbbbbbbbbbk..',
  '..kbbbbkbbbbbbbbkbbbbk..',
  '..kbbbbkbbbbbbbbkbbbbk..',
  '..kbbpbbbbbkkbbbbbpbbk..',
  '..kbbbbbbbbbbbbbbbbbbk..',
  '.kbkbbbbbbbbbbbbbbbbkbk.',
  '.kbkbbbbbbbbbbbbbbbbkbk.',
  '..kksbbbbbbbbbbbbbbskk..',
  '....ksbbbbbbbbbbbbsk....',
  '.....kksssssssssskk.....',
  '......kbk......kbk......',
  '......kkk......kkk......',
  '........................',
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
    eyes: [12, 13, 7, 16],
    mouth: [14, 11, 12],
    cheeks: [14, 5, 18],
    feet: 21,
    feetStep: ['.....kbk........kbk.....', '.....kkk........kkk.....'],
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
  j: '#3F8740', // deep leaf
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

// What an adult works at, on the left of the stage in the buddy's own pixel size: it walks over
// and works behind it (a counter or desk, which hides its lower half) or beside it (the plant).
// Two frames each, swapped while it works. The counters are as tall as half the buddy's body, so
// the face stays clear; whatever stands on them is off to the side for the same reason.
export type Station = {
  frames: [Frame, Frame];
  // Rows at the bottom drawn below the floor line, so the station stands in front of the buddy.
  sink: number;
  // Where the buddy's grid stands while it works, in cells from the station's left edge.
  standAt: number;
  // Whether the buddy works behind it (drawn over the buddy) or beside it (drawn under).
  behind: boolean;
  // Cells the buddy stands higher while behind it: further back, and its face clear of the top.
  lift: number;
  // A tool in its hand while it works, by the grid cell of the tool's top left.
  held?: { frames: [Frame, Frame]; row: number; col: number };
};

const COUNTER_TOP = 'k'.repeat(32);

// A kitchen counter with a pot on the stove, the ladle stirring.
// prettier-ignore
const KITCHEN: [Frame, Frame] = [[
  '..v..v..........................',
  '...v..v.........................',
  '..v..v..........................',
  '.....k..........................',
  '.kkkkkkkk.......................',
  'kkSSSSSSkk......................',
  '.kSwSSSSk.......................',
  '.kSwSSSSk.......................',
  COUNTER_TOP,
  'k' + 'z'.repeat(30) + 'k',
  COUNTER_TOP,
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(13) + 'KkK' + 'n'.repeat(14) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  COUNTER_TOP,
], [
  '...v..v.........................',
  '..v..v..........................',
  '...v..v.........................',
  '......k.........................',
  '.kkkkkkkk.......................',
  'kkSSSSSSkk......................',
  '.kSwSSSSk.......................',
  '.kSwSSSSk.......................',
  COUNTER_TOP,
  'k' + 'z'.repeat(30) + 'k',
  COUNTER_TOP,
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(13) + 'KkK' + 'n'.repeat(14) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  'k' + 'n'.repeat(14) + 'k' + 'n'.repeat(15) + 'k',
  COUNTER_TOP,
]];

// A plant taller than the buddy, in a clay pot. Its crown sways while it is watered.
// prettier-ignore
const BIG_PLANT_STILL: Frame = [
  '........gggg........',
  '......ggGGGGgg......',
  '.....gGGjGGjGGg.....',
  '....gGjjGGGGjjGg....',
  '....gGGjjGGjjGGg....',
  '.....ggGGjjGGgg.....',
  '.......ggGDgg.......',
  '.........DD.........',
  '.........DD.........',
  '..gggg...DD...gggg..',
  '.gGGGGg..DD..gGGGGg.',
  'gGjjGGGg.DD.gGGGjjGg',
  'gGGjjGGGgDDgGGGjjGGg',
  '.gGGjjGGGDDGGGjjGGg.',
  '..ggGGGGgDDgGGGGgg..',
  '....gggg.DD.gggg....',
  '.........DD.........',
  '.........DD.........',
  '...ggg...DD...ggg...',
  '..gGGGg..DD..gGGGg..',
  '.gGjjGGg.DD.gGGjjGg.',
  '.gGGjjGGgDDgGGjjGGg.',
  '..ggGGGGgDDgGGGGgg..',
  '....gggg.DD.gggg....',
  '.........DD.........',
  '.........DD.........',
  '...kkkkkkkkkkkkkk...',
  '...keeeeeeeeeeeek...',
  '....k' + 'o'.repeat(10) + 'k....',
  '....k' + 'o'.repeat(10) + 'k....',
  '.....k' + 'o'.repeat(8) + 'k.....',
  '.....' + 'k'.repeat(10) + '.....',
];
// The crown leans a cell to the side.
const BIG_PLANT: [Frame, Frame] = [
  BIG_PLANT_STILL,
  BIG_PLANT_STILL.map((row, i) => (i < 6 ? '.' + row.slice(0, -1) : row)),
];

// The late-night radio desk: silver, a broadcast mic on a stand, the on-air lamp.
// prettier-ignore
const RADIO_DESK: [Frame, Frame] = [[
  '................................',
  '................................',
  '................................',
  '.....kkk........................',
  '....kKSKk.......................',
  '.kk.kSKSk.......................',
  'krrk.kkk........................',
  'kkkk..k.........................',
  COUNTER_TOP,
  'k' + 'z'.repeat(30) + 'k',
  COUNTER_TOP,
  'k' + 'S'.repeat(30) + 'k',
  'kS' + 'KS'.repeat(14) + 'Sk',
  'k' + 'S'.repeat(30) + 'k',
  'k' + 'S'.repeat(30) + 'k',
  'kSS' + 'K'.repeat(26) + 'SSk',
  'k' + 'S'.repeat(30) + 'k',
  COUNTER_TOP,
], [
  '................................',
  '................................',
  '................................',
  '.....kkk........................',
  '....kKSKk.......................',
  '.kk.kSKSk.......................',
  'kuuk.kkk........................',
  'kkkk..k.........................',
  COUNTER_TOP,
  'k' + 'z'.repeat(30) + 'k',
  COUNTER_TOP,
  'k' + 'S'.repeat(30) + 'k',
  'kS' + 'SK'.repeat(14) + 'Sk',
  'k' + 'S'.repeat(30) + 'k',
  'k' + 'S'.repeat(30) + 'k',
  'kSS' + 'K'.repeat(26) + 'SSk',
  'k' + 'S'.repeat(30) + 'k',
  COUNTER_TOP,
]];

// A wooden writing desk: an inkwell with its quill, paper on the top.
// prettier-ignore
const WRITING_DESK: [Frame, Frame] = [[
  '................................',
  '...kk...........................',
  '..kwwk..........................',
  '..kwvk..........................',
  '...kvk..........................',
  '..kkkkk.........................',
  '.kKKKKKk........................',
  '.kKKKKKk........................',
  COUNTER_TOP,
  'k' + 'L'.repeat(9) + 'w'.repeat(14) + 'L'.repeat(7) + 'k',
  COUNTER_TOP,
  'k' + 'D'.repeat(30) + 'k',
  'kDD' + 'k'.repeat(26) + 'DDk',
  'kDDk' + 'L'.repeat(24) + 'kDDk',
  'kDDk' + 'L'.repeat(11) + 'kk' + 'L'.repeat(11) + 'kDDk',
  'kDD' + 'k'.repeat(26) + 'DDk',
  'k' + 'D'.repeat(30) + 'k',
  COUNTER_TOP,
], [
  '................................',
  '....kk..........................',
  '...kwwk.........................',
  '...kwvk.........................',
  '...kvk..........................',
  '..kkkkk.........................',
  '.kKKKKKk........................',
  '.kKKKKKk........................',
  COUNTER_TOP,
  'k' + 'L'.repeat(9) + 'wKKKKKwwwwwwww' + 'L'.repeat(7) + 'k',
  COUNTER_TOP,
  'k' + 'D'.repeat(30) + 'k',
  'kDD' + 'k'.repeat(26) + 'DDk',
  'kDDk' + 'L'.repeat(24) + 'kDDk',
  'kDDk' + 'L'.repeat(11) + 'kk' + 'L'.repeat(11) + 'kDDk',
  'kDD' + 'k'.repeat(26) + 'DDk',
  'k' + 'D'.repeat(30) + 'k',
  COUNTER_TOP,
]];

// A café counter: an espresso machine pulling a shot into a cup, a dark wooden front.
// prettier-ignore
const CAFE_COUNTER: [Frame, Frame] = [[
  '..v.v...........................',
  '...v.v..........................',
  'kkkkkkkkk.......................',
  'kSSSSSSSk.......................',
  'kSKKKKKSk.......................',
  'kSSkKkSSk.......................',
  'kSkwwwkSk.......................',
  'kSkwwwkSk.......................',
  COUNTER_TOP,
  'k' + 'z'.repeat(30) + 'k',
  COUNTER_TOP,
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  COUNTER_TOP,
], [
  '...v.v..........................',
  '..v.v...........................',
  'kkkkkkkkk.......................',
  'kSSSSSSSk.......................',
  'kSKKKKKSk.......................',
  'kSSkKkSSk.......................',
  'kSkwRwkSk.......................',
  'kSkRRRkSk.......................',
  COUNTER_TOP,
  'k' + 'z'.repeat(30) + 'k',
  COUNTER_TOP,
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  'k' + 'RRRRD'.repeat(6) + 'k',
  COUNTER_TOP,
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
  CHEF: { frames: KITCHEN, sink: 2, standAt: 8, behind: true, lift: 2 },
  GARDENER: {
    frames: BIG_PLANT,
    sink: 1,
    standAt: 20,
    behind: false,
    lift: 0,
    held: { frames: HELD_CAN, row: 12, col: -8 },
  },
  DJ: { frames: RADIO_DESK, sink: 2, standAt: 8, behind: true, lift: 2 },
  POET: { frames: WRITING_DESK, sink: 2, standAt: 8, behind: true, lift: 2 },
  BARISTA: { frames: CAFE_COUNTER, sink: 2, standAt: 8, behind: true, lift: 2 },
};

// --- Decorations (docs/product.md, 무대 꾸미기) ---

// The plant in the corner grows finer with levels: a sprout in a clay pot, a leafy plant in a
// rimmed pot, then flowers in a glazed pot.
// prettier-ignore
const PLANT_1: Frame = [
  '..g...g..',
  '.gGg.gGg.',
  '.gGGgGGg.',
  '..gGGGg..',
  '...gGg...',
  '....G....',
  '.kkkkkkk.',
  '.kooooook',
  '..kooook.',
  '..kkkkkk.',
];

// prettier-ignore
const PLANT_2: Frame = [
  '..g..g..g..',
  '.gGg.gGgGg.',
  'gGgGgGgGgGg',
  '.gGgGgGgGg.',
  '..gGgGgGg..',
  '...gGGGg...',
  '.....G.....',
  'k'.repeat(11),
  'k' + 'e'.repeat(9) + 'k',
  '.k' + 'o'.repeat(7) + 'k.',
  '.k' + 'o'.repeat(7) + 'k.',
  '..k' + 'o'.repeat(5) + 'k..',
  '..' + 'k'.repeat(7) + '..',
];

// prettier-ignore
const PLANT_3: Frame = [
  '...f.....f...',
  '..fyf...fyf..',
  '...f.gGg.f...',
  '..gGg.G.gGg..',
  '.gGgGgGgGgGg.',
  'gGgGgfyfgGgGg',
  '.gGgGgfgGgGg.',
  '..gGgGgGgGg..',
  '......G......',
  'k'.repeat(13),
  'k' + 'a'.repeat(11) + 'k',
  '.k' + 'awawawawa' + 'k.',
  '.k' + 'B'.repeat(9) + 'k.',
  '..k' + 'B'.repeat(7) + 'k..',
  '..' + 'k'.repeat(9) + '..',
];

export type PlantTier = 1 | 2 | 3;
export const PLANTS: Record<PlantTier, Frame> = { 1: PLANT_1, 2: PLANT_2, 3: PLANT_3 };

export const RUG: Frame = [
  '..' + 'm'.repeat(26) + '..',
  '.' + 'mmn'.repeat(9) + 'm.',
  '.' + 'nmm'.repeat(9) + 'm.',
  '..' + 'm'.repeat(26) + '..',
];
