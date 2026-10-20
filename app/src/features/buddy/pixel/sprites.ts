import type { BuddyJob, BuddyStage } from '../api';
import type { Frame, Palette } from './pixel-sprite';

// The buddy's pixel art, in the spirit of GitAnimals: a small grid, few colors, a thick outline
// and a big head (docs/PROJECT.md, Buddy). An original character, a round mochi whose sprout
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
  // What it wears (looks.ts): a job's look, the season's.
  w: '#FFFFFF', // cook's hat, swim ring stripes
  x: '#DCE1E7', // cook's hat shade
  t: '#F4D27C', // straw
  T: '#D3A64C', // straw shade
  n: '#C2564B', // hat band
  K: '#4A4550', // headphones
  r: '#E8575A', // headphone cups
  M: '#8C3F5A', // beret
  S: '#B35C7C', // beret, lit
  D: '#6A2C43', // beret shade
  c: '#4E9A73', // bandana
  C: '#3A7457', // bandana shade
  a: '#4B3B5C', // bat wings
  A: '#7A6699', // bat wings, lit
  j: '#9C6B43', // antlers
  z: '#FF8080', // swim ring
  Z: '#E05A5A', // swim ring shade
  R: '#E0533D', // maple leaf
  O: '#F49A3C', // maple leaf, lit
  u: '#B83A2B', // maple leaf shade
  N: '#2B2730', // black bow
  B: '#55505E', // black bow, lit
  Y: '#F2C14E', // the bow's gold knot
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
  '....................',
  '....kkk......kkk....',
  '...kPggk....kggPk...',
  '...kgGGGkGGkGGGgk...',
  '....kkkkkGGkkkkk....',
  '......kkkkkkkk......',
  '....kkbbbbbbbbkk....',
  '...kbllbbbbbbbbbk...',
  '..kbllbbbbbbbbbbbk..',
  '..kbbbkbbbbbbkbbbk..',
  '..kbbbkbbbbbbkbbbk..',
  '..kbpbbbbkkbbbbpbk..',
  '..kbbbbbbbbbbbbbbk..',
  '.kbkbbbbbbbbbbbbkbk.',
  '..kksbbbbbbbbbbskk..',
  '....ksbbbbbbbbsk....',
  '.....kksssssskk.....',
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
    eyes: [9, 10, 6, 13],
    mouth: [11, 9, 10],
    cheeks: [11, 4, 15],
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

// Sitting down (on the rug): the feet tucked away, the body two rows lower. Done on the dressed
// frame, so what it wears comes down with it; the stage lowers the frame by those two rows.
export const SIT_ROWS = 2;

export function seated(stage: BuddyStage, frame: Frame): Frame {
  if (stage === 'EGG') return frame;
  const { feet } = ANATOMY[stage];
  const blank = '.'.repeat(frame[0].length);
  return frame.map((row, i) => (i === feet || i === feet + 1 ? blank : row));
}

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
  // The season's corner and the happenings (looks.ts).
  O: '#F48C3C', // pumpkin
  l: '#FFB061', // pumpkin, lit
  d: '#D66A28', // pumpkin shade
  V: '#C9961E', // the pumpkin's glow, shaded
  i: '#2F7A43', // dark green: tree shade, pumpkin leaf
  Q: '#E8575A', // red: tree pot, baubles, heart shade
  E: '#C0404A', // tree pot shade
  H: '#FFC2CC', // heart shine
  I: '#BFE3FF', // pale blue: butterfly, umbrella shine
  M: '#D9577F', // cherry blossom shade
  b: '#2E2A33', // black shopping bag
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

// The bowl gets finer with levels: blue, then silver (with a shine), then gold, and last white
// porcelain with a blue band (and a blue soup bowl to match at the table).
export type BowlTier = 0 | 1 | 2 | 3;
const BOWL_COLOR = ['a', 'S', 'Y', 'z'] as const;

// The rice on top of a bowl, drawn over an empty one so it can pop in and shrink away.
// prettier-ignore
export const RICE: Frame = [
  '...wwwwww...',
  '..wwwwwwww..',
];

export function bowl(full: boolean, tier: BowlTier): Frame {
  const c = BOWL_COLOR[tier];
  const shine = tier > 0 ? 'w' : c;
  const foot = tier === 3 ? 'B' : c;
  return [
    full ? '...wwwwww...' : '............',
    full ? '..wwwwwwww..' : '............',
    'kkkkkkkkkkkk',
    '.k' + c + shine + c.repeat(6) + 'k.',
    '..k' + foot.repeat(6) + 'k..',
    '...kkkkkk...',
  ];
}

// A child or grown-up eats at a low round table instead (docs/PROJECT.md, 식사): it shows only
// for the meal, laid for one with rice in a bowl of the reward's color, soup with steam and a side
// dish. Once eaten, the rice is gone.
export function mealTable(full: boolean, tier: BowlTier): Frame {
  const c = BOWL_COLOR[tier];
  const shine = tier > 0 ? 'w' : c;
  const foot = tier === 3 ? 'B' : c;
  // The soup bowl: red lacquer, or blue to go with the porcelain.
  const [soup, soupShade] = tier === 3 ? ['a', 'B'] : ['Q', 'E'];
  const rows = [
    '................v.v........',
    full ? '.....kkkk........v.........' : '.................v.........',
    full ? '....kwwwwk.....kkkkkk......' : '...............kkkkkk......',
    full ? '...kwwwwwwk...kQQQQQQk.....' : '...kkkkkkkk...kQQQQQQk.....',
    '...k' + c + shine + c.repeat(5) + 'k..kEQQQQEk.kkk.',
    '....k' + foot.repeat(5) + 'k....kEEEEk.kgGk.',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kLLLLLLLLLLLLLLLLLLLLLLLLLk',
    'kDDDDDDDDDDDDDDDDDDDDDDDDDk',
    '.kkkkkkkkkkkkkkkkkkkkkkkkk.',
    '...kqk...............kqk...',
    '...kqk...............kqk...',
    '...kkk...............kkk...',
  ];
  return rows.map((row, i) =>
    i >= 3 && i <= 5
      ? row.slice(0, 13) + row.slice(13).replace(/Q/g, soup).replace(/E/g, soupShade)
      : row,
  );
}

// What a hungry buddy thinks of: a bowl of rice, steaming, in a cloud, with two small puffs trailing
// down toward its head.
// prettier-ignore
export const THOUGHT_FOOD: Frame = [
  '.....kkk.kkwkk.....',
  '....kwwwvwvwwwk....',
  '...kwwwwwvwwwwwk...',
  '..kwwwwwkkkkwwwkk..',
  '..kwwwwkwwwwkwwwwk.',
  '.kwwwwkkkkkkkkwwwwk',
  'kwwwwwkaaaaaakwwwwk',
  'kwwwwwwkaaaakwwwwzk',
  'kzwwwwwwkkkkwwwwzk.',
  '.kzzzzzwwwwwwwwzk..',
  '..kkkkkzwwwzzzzk...',
  '.......kzzzkkkk....',
  '..kkk...kkk........',
  '.kwwzk.............',
  '.kwzzk.............',
  '..kkk..............',
  '...................',
  '.k.................',
  'kwk................',
  '.k.................',
];

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

// --- Job stations (docs/fun-improvements.md, 직업) ---

// What an adult works at, on the left of the stage in the buddy's own pixel size, always drawn in
// front of it: it walks over and works behind it (a counter or desk, which hides its lower body)
// or beside it (the plant). Two frames each, swapped while it works. The counters reach just below
// the buddy's mouth and are a little narrower than it, so it stands towards their right end;
// whatever stands on them is at the left end, clear of the face.
export type Station = {
  frames: [Frame, Frame];
  // Rows at the bottom drawn below the floor line, so the station stands in front of the buddy.
  sink: number;
  // Its cells, as a part of the buddy's pixel size (1 if left out): a finer picture, like the
  // room's own things.
  fine?: number;
  // Where the buddy's grid stands while it works, in the station's cells from its left edge.
  standAt: number;
  // Something of the station's that stands behind the buddy, `col` station cells from its left,
  // on the floor.
  behind?: { frame: Frame; col: number };
  // A tool in its hand while it works, by the grid cell of the tool's top left.
  // Drawn at `size` of the buddy's pixel size, its right edge (the handle) kept at the hand.
  held?: { frames: [Frame, Frame]; row: number; col: number; size?: number };
  // Its small light at night (room-light.tsx), by the cell it glows from (in `behind`'s frame if
  // `onBehind`) and its color: so the left of the room is not all dark when the lamp lights the right.
  light: { col: number; row: number; color: string; onBehind?: boolean };
};

// A kitchen counter: a pot on a lit burner (the flame flickers, the steam drifts), a cutting board
// with tomato and herbs, an oven door with a window and two drawers.
// prettier-ignore
const KITCHEN: [Frame, Frame] = [[
  '..v...v.................',
  '...v...v................',
  '..v...v.................',
  '...kk...................',
  '.kkkkkk.................',
  '.kzwzzk.................',
  'kkkkkkkk................',
  '.kwSSxk.................',
  '.kSSSxk.................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kKuuuuKwwwwwwwwwLLLLLLwk',
  'kzzzzzzzzzzzzzzzLrLrgLzk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'knKKKKKKKKnknnnnnnnnnnnk',
  'knkKKvKKKknknnnnKKKnnnnk',
  'knkKvKKKKknkvvvvvvvvvvvk',
  'knkkkkkkkknknnnnKKKnnnnk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
], [
  '...v...v................',
  '..v...v.................',
  '...v...v................',
  '....kk..................',
  '.kkkkkk.................',
  '.kzwzzk.................',
  'kkkkkkkk................',
  '.kwSSxk.................',
  '.kSSSxk.................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kKyyyyKwwwwwwwwwLLLLLLwk',
  'kzzzzzzzzzzzzzzzLrLrgLzk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'knKKKKKKKKnknnnnnnnnnnnk',
  'knkKKvKKKknknnnnKKKnnnnk',
  'knkKvKKKKknkvvvvvvvvvvvk',
  'knkkkkkkkknknnnnKKKnnnnk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
]];

// A plant taller than the buddy, in a clay pot: broad outlined leaves up a trunk. Its crown
// sways while it is watered. Drawn finer than the buddy (Station.fine), like the room's own plant.
// prettier-ignore
const BIG_PLANT: [Frame, Frame] = [[
  '...........jjj..........',
  '..........jPiPj.........',
  '.........jPPiPj.........',
  '.........jPPiggj........',
  '.........jgiigj...jj....',
  '.........jgiigj..jPPjj..',
  '........jggiGGjjjPPPij..',
  '.jjjjj...jGiGGjPPPiigj..',
  '.jPPPPj..jGiGjPggiiggj..',
  '.jPiPPPj.jGGGjggiiggGj..',
  '.jPPiPPgj.jjjggiiGGGj...',
  '.jPPgigggj.jjgiGGGjj....',
  '..jgggiggGjiPjGGGj......',
  '...jggGiGjPiPPjjj.......',
  '....jGGGijPiPgj.i.......',
  '.....jGGGjgiigj.i.......',
  '......jjjjgiigj.i.......',
  '.......i.jggiGji....jj..',
  '.......i.jGGiGjijjjjPPjj',
  '.......i..jGiGjjPPPPggij',
  '........i.jjjjjPPggiiiij',
  '.jjjjjjji...ijgiiiiggGGj',
  'jPPPPPggjj..ijgigggGGGj.',
  'jiiiiiggggj.i.jjGGjjjj..',
  'jgggiiiiiij.i.i.jji.....',
  '.jgggGGGGGj.i.i..i......',
  '..jjjjjjjj..i.i..i......',
  '......i..i..jjjjjj......',
  '......jjjjjjPiPPPPjj....',
  '.....jPPPgijPiiiigggj...',
  '....jPggiiigjgggiiiij...',
  '...jgiiiggGjjjjgGGGijj..',
  '...jiigGGGj.iiijjjjj....',
  '....jjjjjji.ii..........',
  '..........iiii..........',
  '..........iii...........',
  '...........ii...........',
  '...kkkkkkkkkkkkkkkkkk...',
  '...keeeeeeeeeeeeeeeek...',
  '...kkkkkkkkkkkkkkkkkk...',
  '....kollooooooooodddk...',
  '....kolooooooooooddk....',
  '.....kooooooooooodk.....',
  '.....kooooooooooodk.....',
  '......koooooooooddk.....',
  '......kkkkkkkkkkkk......',
], [
  '............jjj.........',
  '...........jPiPj........',
  '..........jPPiPj........',
  '..........jPPiggj.......',
  '..........jgiigj...jj...',
  '..........jgiigj..jPPjj.',
  '.........jggiGGjjjPPPij.',
  '..jjjjj...jGiGGjPPPiigj.',
  '..jPPPPj..jGiGjPggiiggj.',
  '..jPiPPPj.jGGGjggiiggGj.',
  '..jPPiPPgj.jjjggiiGGGj..',
  '..jPPgigggj.jjgiGGGjj...',
  '...jgggiggGjiPjGGGj.....',
  '....jggGiGjPiPPjjj......',
  '.....jGGGijPiPgj.i......',
  '......jGGGjgiigji.......',
  '.......jjjjgiigji.......',
  '........i.jggiGji...jj..',
  '........i.jGGiGjjjjjPPjj',
  '........i..jGiGjPPPPggij',
  '........i..jjjjPPggiiiij',
  '.jjjjjjji...ijgiiiiggGGj',
  'jPPPPPggjj..ijgigggGGGj.',
  'jiiiiiggggj.i.jjGGjjjj..',
  'jgggiiiiiij.i..ijji.....',
  '.jgggGGGGGj.i.i..i......',
  '..jjjjjjjj..i.i..i......',
  '......i...i.jjjjjj......',
  '......jjjjjjPiPPPPjj....',
  '.....jPPPgijPiiiigggj...',
  '....jPggiiigjgggiiiij...',
  '...jgiiiggGjjjjgGGGijj..',
  '...jiigGGGj.iiijjjjj....',
  '....jjjjjji.ii..........',
  '..........iiii..........',
  '..........iii...........',
  '...........ii...........',
  '...kkkkkkkkkkkkkkkkkk...',
  '...keeeeeeeeeeeeeeeek...',
  '...kkkkkkkkkkkkkkkkkk...',
  '....kollooooooooodddk...',
  '....kolooooooooooddk....',
  '.....kooooooooooodk.....',
  '.....kooooooooooodk.....',
  '......koooooooooddk.....',
  '......kkkkkkkkkkkk......',
]];

// The gardener's small standing lamp, right of the plant and behind the buddy: a cream shade lit
// along its rim, a slim wooden pole and a round base. Its light at night is the station's.
// prettier-ignore
const GARDEN_LAMP: Frame = [
  '..kkkkk..',
  '.knnnnnk.',
  '.knnnnvk.',
  'knnnnnvvk',
  'knnnnvvvk',
  'kyyyyyyyk',
  'kkkkkkkkk',
  '...kLk...',
  '...kDk...',
  '...kDk...',
  '...kDk...',
  '...kDk...',
  '...kDk...',
  '...kDk...',
  '...kDk...',
  '...kDk...',
  '..kkDkk..',
  '.kLLLLqk.',
  '.kqqqqqk.',
  '..kkkkk..',
];

// The late-night radio desk: a broadcast mic on a boom stand, headphones on the desk, faders, a
// level meter that jumps with the music and the on-air lamp, which blinks.
// prettier-ignore
const RADIO_DESK: [Frame, Frame] = [[
  '...kkkk.................',
  '..kSwSSk................',
  '..kxSxSk................',
  '..kSxSxk................',
  '..kxSxSk................',
  '...kkkk.................',
  '....kk..................',
  '.kkkkk..................',
  '.k......................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kzzzzzzzzzzzzzzzkKKKKkzk',
  'kSSSSSSSSSSSSSSkBBkkBBkk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kSKSSwSSKSSKSSSSKKKkkkkk',
  'kSwSSKSSKSSwSSSSKKKkrrkk',
  'kSKSSKSSwSSKSSSSgggkrrkk',
  'kSKSSKSSKSSKSSSSgggkkkkk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
], [
  '...kkkk.................',
  '..kSwSSk................',
  '..kxSxSk................',
  '..kSxSxk................',
  '..kxSxSk................',
  '...kkkk.................',
  '....kk..................',
  '.kkkkk..................',
  '.k......................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kzzzzzzzzzzzzzzzkKKKKkzk',
  'kSSSSSSSSSSSSSSkBBkkBBkk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kSwSSKSSKSSKSSSSrrrkkkkk',
  'kSKSSKSSwSSKSSSSyyykuukk',
  'kSKSSwSSKSSKSSSSgggkuukk',
  'kSKSSKSSKSSwSSSSgggkkkkk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
]];

// A wooden writing desk: a lit candle, a quill in its inkwell, an open book being written in, two
// drawers with brass knobs.
// prettier-ignore
const WRITING_DESK: [Frame, Frame] = [[
  '......kk................',
  '.....kwk................',
  '.u..kwvk................',
  '.y..kwk.................',
  'knk.kvk.................',
  'knkkkkkk................',
  'knkKwKKk................',
  'knkKKKKk................',
  'kYkkkkkk................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLwwwwkwwwwLLLLLk',
  'kLLLLLLLLwKKwkwKwwLLLLLk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkDkkkkkkkkkkkk',
  'kDkLLLyLLLkDkLLLLyLLLLkk',
  'kDkkkkkkkkkDkkkkkkkkkkkk',
  'kDqDDDqDDqDDDqDDDqDDqDqk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
], [
  '......kk................',
  '.....kwk................',
  '.y..kwvk................',
  '.y..kwk.................',
  'knk.kvk.................',
  'knkkkkkk................',
  'knkKwKKk................',
  'knkKKKKk................',
  'kYkkkkkk................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLwwwwkwwwwLLLLLk',
  'kLLLLLLLLwKKwkwKKwLLLLLk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkDkkkkkkkkkkkk',
  'kDkLLLyLLLkDkLLLLyLLLLkk',
  'kDkkkkkkkkkDkkkkkkkkkkkk',
  'kDqDDDqDDqDDDqDDDqDDqDqk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
]];

// A café counter: an espresso machine with its gauge pulling a shot into a cup, and a chalkboard
// menu on the front.
// prettier-ignore
const CAFE_COUNTER: [Frame, Frame] = [[
  '...v.v..................',
  'kkkkkkkk................',
  'kSwSSSxk................',
  'kSkwkSxk................',
  'kKKKKKKk................',
  'kxkKKkxk................',
  'kxkwwkxk................',
  'kxkwwkxk................',
  'kkkkkkkk................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLLLLLLLLLLLLLLLk',
  'kDDDDDDDDDDDDDDDDDDDDDDk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkkkkkkkkkkkkDk',
  'kDkZwwwZvvvvZwwZvvZZwkDk',
  'kDkZvvZZwwwZZvvvZwZZvkDk',
  'kDkkkkkkkkkkkkkkkkkkkkDk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
], [
  '..v.v...................',
  'kkkkkkkk................',
  'kSwSSSxk................',
  'kSkwkSxk................',
  'kKKKKKKk................',
  'kxkKKkxk................',
  'kxkRRkxk................',
  'kxkwwkxk................',
  'kkkkkkkk................',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLLLLLLLLLLLLLLLk',
  'kDDDDDDDDDDDDDDDDDDDDDDk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kDkkkkkkkkkkkkkkkkkkkkDk',
  'kDkZwwwZvvvvZwwZvvZZwkDk',
  'kDkZvvZZwwwZZvvvZwZZvkDk',
  'kDkkkkkkkkkkkkkkkkkkkkDk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
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
  // The burner's flame under the pot.
  CHEF: { frames: KITCHEN, sink: 3, standAt: 3, light: { col: 3.5, row: 7, color: '#FF9A4A' } },
  // The small lamp right of the plant, behind the buddy.
  GARDENER: {
    frames: BIG_PLANT,
    sink: 1,
    fine: 0.6,
    standAt: 25,
    held: { frames: HELD_CAN, row: 12, col: -8, size: 0.6 },
    behind: { frame: GARDEN_LAMP, col: 25 },
    light: { col: 4.5, row: 3.5, color: '#FFD27A', onBehind: true },
  },
  // The red on-air light on the desk.
  DJ: {
    frames: RADIO_DESK,
    sink: 3,
    standAt: 3,
    light: { col: 20.5, row: 15.5, color: '#FF6A7E' },
  },
  // The candle on the desk.
  WRITER: {
    frames: WRITING_DESK,
    sink: 3,
    standAt: 3,
    light: { col: 1.5, row: 2.5, color: '#FFD27A' },
  },
  // The espresso machine's warm light.
  BARISTA: {
    frames: CAFE_COUNTER,
    sink: 3,
    standAt: 3,
    light: { col: 4, row: 4, color: '#FFC07A' },
  },
};

// --- Decorations (docs/PROJECT.md, 무대 꾸미기) ---

// The plant in the corner grows finer with levels: a sprout in a clay pot, a bigger plant in a
// rimmed pot (a flowering cactus, a rubber plant, a snake plant or a round-leaved one, whichever the
// room drew), flowers in a glazed pot, a small tree, and the tree in fruit.
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
  '.....kkk.....',
  '....kfyfk....',
  '....kPgGk....',
  '....kPwGk.kk.',
  '.kk.kPgGk.kgk',
  'kgk.kwgGk.kwk',
  'kwk.kPgGkkkgk',
  'kgkkkPgwGgggk',
  'kggggPgGkkkk.',
  '.kkkkPwGk....',
  '....kPgGk....',
  '....kPgGk....',
  'kkkkkkkkkkkkk',
  'kwoooooooooek',
  'kkkkkkkkkkkkk',
  '.kooooooooek.',
  '.kooooooooek.',
  '..kooooooeek.',
  '..kkkkkkkkk..',
];

// A rubber plant: glossy oval leaves by turns up the stem.
// prettier-ignore
const PLANT_2_RUBBER: Frame = [
  '....kgggk....',
  '...kiiiiik...',
  '...kGGGGGgk..',
  '...kggqGGigk.',
  '..kgGiqkGGigk',
  '.kPiGGqkkkGk.',
  'kGiGGkqGPgk..',
  '.kkkggqGGigk.',
  '.kggiGqkGGiGk',
  'kgPiGGqkkkGk.',
  'kGGGkkqk..k..',
  '.kkk.kqk.....',
  'kkkkkkkkkkkkk',
  'kwoooooooooek',
  'kkkkkkkkkkkkk',
  '.kooooooooek.',
  '.kooooooooek.',
  '..kooooooeek.',
  '..kkkkkkkkk..',
];

// A snake plant: tall pointed leaves with stripes across.
// prettier-ignore
const PLANT_2_SNAKE: Frame = [
  '........k....',
  '.....k.kgk...',
  '....kgkgjk...',
  '...kgjkgjk.k.',
  '..kkgjkPgkkgk',
  '.kgkPgkgjkgjk',
  'kgjkgjkgjkgjk',
  'kgjkgjkPgkPgk',
  'kPgkPgkgjkgjk',
  'kgjkgjkgjkgjk',
  'kgjkgjkPgkPgk',
  'kPgkPgkgjkgjk',
  'kkkkkkkkkkkkk',
  'kwoooooooooek',
  'kkkkkkkkkkkkk',
  '.kooooooooek.',
  '.kooooooooek.',
  '..kooooooeek.',
  '..kkkkkkkkk..',
];

// Round leaves in pairs up a stem.
// prettier-ignore
const PLANT_2_ROUND: Frame = [
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

// A small tree in a big glazed pot, and later the same tree hung with oranges: a tall crown on a
// long trunk, taller than it is wide.
// prettier-ignore
const PLANT_4: Frame = [
  '.....kkkkk.....',
  '...kkPPggGkk...',
  '..kPPgggggGGk..',
  '.kPPggggGgggGk.',
  '.kPgggGgggggGk.',
  'kPggggggggGggGk',
  'kPgGgggggggGGGk',
  'kPgggGggggggGGk',
  'kggggggGgggGGGk',
  'kPggggGgggggGGk',
  'kggGgggggGggGGk',
  'kggggGggGgggGGk',
  '.kgggggggggGGk.',
  '.kGgggGgggGGGk.',
  '..kkGGGGGGGkk..',
  '......kDqk.....',
  '......kDqk.....',
  '......kDqk.....',
  '......kDqk.....',
  '......kDqk.....',
  '......kDqk.....',
  '......kDqk.....',
  '......kDqk.....',
  '.....kDDqqk....',
  'kkkkkkkkkkkkkkk',
  'kwaaaaaaaaaaaak',
  'kkkkkkkkkkkkkkk',
  '.kaBBBBBBBBBNk.',
  '.kaBBBBBBBBBNk.',
  '..kaBBBBBBBNNk.',
  '..kBBBBBBBBNNk.',
  '...kkkkkkkkkk..',
];

// The oranges of the tree in fruit, big enough to read in pixels: round, lit at the top left with a
// shine, a leaf on the stem. Drawn over the tree's crown at FRUIT_AT (the stage pops them out one by
// one as the tree fruits, stage-decor.tsx), and one fallen on the floor by the pot.
// prettier-ignore
export const ORANGE: Frame = [
  '..jP.',
  '.lOO.',
  'lwOOd',
  'OOOOd',
  '.dOd.',
];
// Lying on the floor: no leaf.
export const ORANGE_FALLEN: Frame = ORANGE.slice(1);
// Where the oranges hang on the crown (PLANT_4), by the cell of each one's top left.
export const FRUIT_AT: readonly (readonly [row: number, col: number])[] = [
  [2, 2],
  [1, 8],
  [6, 6],
  [8, 1],
  [9, 10],
];

// The tree with its oranges on, for still pictures (the guide).
function stamp(frame: Frame, part: Frame, at: readonly (readonly [number, number])[]): Frame {
  const rows = frame.map((row) => [...row]);
  for (const [row, col] of at) {
    part.forEach((line, dy) =>
      [...line].forEach((cell, dx) => {
        if (cell !== '.' && rows[row + dy]?.[col + dx] !== undefined)
          rows[row + dy][col + dx] = cell;
      }),
    );
  }
  return rows.map((row) => row.join(''));
}
const PLANT_5: Frame = stamp(PLANT_4, ORANGE, FRUIT_AT);

export type PlantTier = 1 | 2 | 3 | 4 | 5;
// The tree in fruit without its oranges, for drawing them over it.
export const FRUIT_TREE: Frame = PLANT_4;
// The kinds a pot may grow into at each tier.
export const PLANTS: Record<PlantTier, readonly Frame[]> = {
  1: [PLANT_1],
  2: [PLANT_2, PLANT_2_RUBBER, PLANT_2_SNAKE, PLANT_2_ROUND],
  3: [PLANT_3],
  4: [PLANT_4],
  // The same tree: the stage draws its oranges on it one by one (stage-decor.tsx, Plant).
  5: [PLANT_5],
};
