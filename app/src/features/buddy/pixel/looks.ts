import type { BuddyJob, BuddyStage } from '../api';
import type { Frame } from './pixel-sprite';
import { buddyFrame, type Pose } from './sprites';

// What the buddy wears and what happens around it (docs/art-handover.md, C·F·G·H): a job's look
// for a grown-up, a week's look for the season, and the pictures of the small happenings. The
// looks are drawn over the buddy's own grid in BUDDY_PALETTE; the things on the floor and in the
// air (the season's corner, the umbrella, the butterfly, the big heart) in PROP_PALETTE.

type Hatched = Exclude<BuddyStage, 'EGG'>;

// --- A grown-up's look for its job ---

// Rows painted over the adult's grid, from the row given in JOB_LOOKS: '.' keeps the buddy's own
// pixel, '-' clears it (the leaves a hat sits on). None of them covers the face or the blossom.

// A short cook's toque around the blossom.
// prettier-ignore
const CHEF_HAT: Frame = [
  '....kwww......wwwk....',
  '...kwwwwwwwwwwwwwwk...',
  '...kwwxwwwxwwwxwwwk...',
  '....kxxxxxxxxxxxxk....',
];
// A straw hat with a red band; the blossom grows up through it.
// prettier-ignore
const STRAW_HAT: Frame = [
  '.....-..........-.....',
  '....--kttttttttk--....',
  '......knnnnnnnnk......',
  '.kkkk..tttttttt..kkkk.',
  'kTttttttttttttttttttTk',
  '.kkTTTTTTTTTTTTTTTTkk.',
];
// Headphones: the band goes behind the blossom, a cup over each side.
// prettier-ignore
const HEADPHONES: Frame = [
  '....KKKKKKKKKKKKKK....',
  '...K..............K...',
  '..K................K..',
  '.kk................kk.',
  'kKr................rKk',
  'kKrk..............krKk',
  'kKrk..............krKk',
  'kKrk..............krKk',
  '.k.k..............k.k.',
];
// A wine-red beret, worn a little to one side, the blossom through it.
// prettier-ignore
const BERET: Frame = [
  '....k...fFfFk...-.....',
  '..kMSSMMMMMMMMMMk-....',
  '.kMSMMMMMMMMMMMMMk....',
  '.kDDDMMMMMMMMMMMDk....',
  '..kk.DDDDDDDDDDDk.....',
];
// A green café apron, darker at the sides as it goes round the body, with a small brown pocket.
// prettier-ignore
const APRON: Frame = [
  '.......kEEEEEEk.......',
  '.....kkCccccccCkk.....',
  '....kCCccccckJJkCC....',
  '.....CCccccckqqkCCk...',
  '.......CCCCCCkkC.k....',
];

const JOB_LOOKS: Record<BuddyJob, readonly [row: number, look: Frame]> = {
  CHEF: [5, CHEF_HAT],
  GARDENER: [5, STRAW_HAT],
  DJ: [7, HEADPHONES],
  WRITER: [5, BERET],
  BARISTA: [16, APRON],
};

// --- A week's look for the season ---

export type Season = 'SPRING' | 'SUMMER' | 'HALLOWEEN' | 'AUTUMN' | 'BLACK_FRIDAY' | 'CHRISTMAS';
export const SEASONS: readonly Season[] = [
  'SPRING',
  'SUMMER',
  'HALLOWEEN',
  'AUTUMN',
  'BLACK_FRIDAY',
  'CHRISTMAS',
];

// About a week each, by the device's own date: [month, first day, last day]. Black Friday moves
// with the calendar: the Friday after the fourth Thursday of November, through that Sunday.
const SEASON_DAYS: Record<Exclude<Season, 'BLACK_FRIDAY'>, readonly [number, number, number]> = {
  SPRING: [3, 25, 31],
  SUMMER: [7, 15, 21],
  HALLOWEEN: [10, 25, 31],
  AUTUMN: [11, 12, 18],
  CHRISTMAS: [12, 19, 25],
};

function blackFriday(year: number): number {
  const firstThursday = 1 + ((4 - new Date(year, 10, 1).getDay() + 7) % 7);
  return firstThursday + 22;
}

export function seasonOn(date: Date): Season | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 11) {
    const friday = blackFriday(date.getFullYear());
    if (day >= friday && day <= friday + 2) return 'BLACK_FRIDAY';
  }
  return (
    SEASONS.find((season) => {
      if (season === 'BLACK_FRIDAY') return false;
      const [m, from, to] = SEASON_DAYS[season];
      return month === m && day >= from && day <= to;
    }) ?? null
  );
}

// Winter (December to February): the rain falls as snow.
export function isWinter(date: Date): boolean {
  const month = date.getMonth() + 1;
  return month === 12 || month <= 2;
}

// Bat wings (Halloween), behind the body on both sides; a smaller pair for the baby.
// prettier-ignore
const WING: Frame = [
  'k.........',
  'kk........',
  'kAk.......',
  'kAak......',
  'kaAakkk...',
  'kaaaaaakk.',
  'kaaaaaaaak',
  '.kakaakaak',
  '..k..k..k.',
];
// prettier-ignore
const WING_SMALL: Frame = [
  'k......',
  'kk.....',
  'kAk....',
  'kaAakk.',
  'kaaaaak',
  '.kakaak',
  '..k..k.',
];
// Reindeer antlers (Christmas), behind the leaves.
// prettier-ignore
const ANTLER: Frame = [
  'k.k...',
  'jkjk..',
  'kjjk.k',
  '.kjjkj',
  '..kjjk',
  '...kj.',
  '...kj.',
  '...kj.',
];

// Bunny ears (spring), behind the head.
// prettier-ignore
const BUNNY_EAR: Frame = [
  '.kkk..',
  'kwwwk.',
  'kwfwk.',
  'kwffwk',
  '.kwfwk',
  '.kwfwk',
  '.kwfwk',
  '.kwwwk',
  '..kwk.',
];
// A red maple leaf caught on the head (autumn).
// prettier-ignore
const MAPLE_LEAF: Frame = [
  '...k...',
  '.k.Rk.k',
  'kRkRkRk',
  'kORRROk',
  '.kOROk.',
  'kORRROk',
  '.kkukk.',
  '...j...',
];
// A black bow with a gold knot, worn to one side (Black Friday).
// prettier-ignore
const BLACK_BOW: Frame = [
  '.kk...kk.',
  'kNBk.kBNk',
  'kNNBkBNNk',
  'kNNkYkNNk',
  'kNBk.kBNk',
  '.kk.k.kk.',
  '...kNk...',
];

// Where each look goes on each body, in its grid: the left wing's and antler's top-left cell (the
// right ones mirror them), the swim ring's top row, first column and width, the hand an umbrella is
// held in (the baby has no arms: by its side) and the top of its head. Ears stand like the
// antlers; the leaf and the bow sit at the head's upper right ("side").
type Fit = {
  wings: readonly [row: number, col: number];
  antlers: readonly [row: number, col: number];
  ears: readonly [row: number, col: number];
  side: readonly [row: number, col: number];
  ring: readonly [row: number, col: number, width: number];
  hand: readonly [row: number, col: number];
  head: number;
};
const FIT: Record<Hatched, Fit> = {
  BABY: {
    wings: [3, -2],
    antlers: [-4, 2],
    ears: [-5, 1],
    side: [1, 10],
    ring: [10, 0, 16],
    hand: [9, 14],
    head: 0,
  },
  CHILD: {
    wings: [5, -5],
    antlers: [-2, 2],
    ears: [-3, 3],
    side: [3, 13],
    ring: [13, 0, 20],
    hand: [13, 18],
    head: 1,
  },
  ADULT: {
    wings: [7, -4],
    antlers: [1, 0],
    ears: [-1, 2],
    side: [5, 14],
    ring: [17, 0, 22],
    hand: [17, 20],
    head: 0,
  },
};

// A red and white swim ring (summer) round the lower body.
function ring(width: number): Frame {
  const stripes = (color: string) =>
    Array.from({ length: width - 2 }, (_, i) => ((i + 2) % 5 < 2 ? 'w' : color)).join('');
  const edge = '.' + 'k'.repeat(width - 2) + '.';
  return [edge, 'k' + stripes('z') + 'k', 'k' + stripes('Z') + 'k', edge];
}

// Paints `look` over `frame` from `row` (and `col`). Where the pose has moved the face (an open
// mouth reaching down), the face stays in front.
function wear(frame: Frame, idle: Frame, row: number, col: number, look: Frame): Frame {
  const rows = frame.map((r) => r.split(''));
  look.forEach((line, y) =>
    [...line].forEach((key, x) => {
      const r = row + y;
      const c = col + x;
      if (key === '.' || rows[r]?.[c] === undefined || frame[r][c] !== idle[r][c]) return;
      rows[r][c] = key === '-' ? '.' : key;
    }),
  );
  return rows.map((r) => r.join(''));
}

const dressed = new Map<string, Frame>();

// The buddy as it looks now: dressed for the season if it is one, otherwise a grown-up for its job
// (the job's look is there all year, so the season's comes first).
export function dressedFrame(
  stage: BuddyStage,
  pose: Pose,
  job: BuddyJob | null,
  season: Season | null,
): Frame {
  const frame = buddyFrame(stage, pose);
  if (stage === 'EGG') return frame;
  const key = `${stage}:${pose}:${job}:${season}`;
  const known = dressed.get(key);
  if (known) return known;
  const idle = buddyFrame(stage, 'idle');
  let look = frame;
  if (season === 'SUMMER') {
    const [row, col, width] = FIT[stage].ring;
    look = wear(frame, idle, row, col, ring(width));
  } else if (!season && stage === 'ADULT' && job) {
    const [row, outfit] = JOB_LOOKS[job];
    look = wear(frame, idle, row, 0, outfit);
  }
  dressed.set(key, look);
  return look;
}

// Something drawn with the buddy, in its grid's cells (it may reach outside the grid).
export type Layer = { frame: Frame; row: number; col: number };

// A pair, mirrored about the middle of a grid `width` wide, the left one starting at `col`.
function pair(sprite: Frame, row: number, col: number, width: number): Layer {
  const span = width - 2 * col;
  const gap = '.'.repeat(span - 2 * sprite[0].length);
  return {
    frame: sprite.map((line) => line + gap + [...line].reverse().join('')),
    row,
    col,
  };
}

// What the season puts behind the body: wings, antlers or ears.
export function seasonBehind(stage: BuddyStage, season: Season | null): Layer | null {
  if (stage === 'EGG') return null;
  const width = buddyFrame(stage, 'idle')[0].length;
  const fit = FIT[stage];
  switch (season) {
    case 'HALLOWEEN':
      return pair(stage === 'BABY' ? WING_SMALL : WING, fit.wings[0], fit.wings[1], width);
    case 'CHRISTMAS':
      return pair(ANTLER, fit.antlers[0], fit.antlers[1], width);
    case 'SPRING':
      return pair(BUNNY_EAR, fit.ears[0], fit.ears[1], width);
    default:
      return null;
  }
}

// What the season puts on the front of the head: a leaf or a bow.
export function seasonFront(stage: BuddyStage, season: Season | null): Layer | null {
  if (stage === 'EGG' || (season !== 'AUTUMN' && season !== 'BLACK_FRIDAY')) return null;
  const [row, col] = FIT[stage].side;
  return { frame: season === 'AUTUMN' ? MAPLE_LEAF : BLACK_BOW, row, col };
}

// --- The season's corner, in place of the plant ---

// A jack-o'-lantern, glowing.
// prettier-ignore
const PUMPKIN: Frame = [
  '.........kk..........',
  '........kqqk.kkk.....',
  '........kqkk.kigk....',
  '....kkkkkkqkkkgkk....',
  '..kkOdOOdOOOdddddkk..',
  '.klldlOdlOOOdddddddk.',
  '.klldlydlOOOddyddddk.',
  'klldlyyVlOOOdyyVddddk',
  'klldyyyyVOOOyyyyVdddk',
  'klldlldllOyOddddddddk',
  'kOOdOOdOOOOOddddddddk',
  'kOOdyyyyyyyyyyyyVdddk',
  '.kOOdVyyOyyydyyVdddk.',
  '.kdddddVOOVOdVdddddk.',
  '..kdddddddddddddddk..',
  '...kkkkdddddddkkkk...',
];
// A Christmas tree as tall as the gardener's plant: a star, garlands and baubles, a gold-banded pot.
// prettier-ignore
const TREE: Frame = [
  '.........k.........',
  '........kyk........',
  '......kkywykk......',
  '......kyyyyyk......',
  '.......kyyyk.......',
  '......kyykyyk......',
  '......kkkGkkk......',
  '......kPgGiik......',
  '.....kPgQGiiik.....',
  '.....kPgGGiiik.....',
  '....kPggGGGiiik....',
  '.....kiiiiiiik.....',
  '....kPwgGGGiyik....',
  '...kPgagwGwiiiik...',
  '...kPgggGGGiiiik...',
  '..kPgggGGGGiiiiik..',
  '...kkiiiiiiiiikk...',
  '...kPgwgGQGiwiak...',
  '..kPyggGwGwiiiiik..',
  '..kPgggGGGGiiiiik..',
  '.kPggggGGGGGiiiiik.',
  '..kkiiiiiiiiiiikk..',
  '..kPwgwyGGGiwiwik..',
  '.kPggggGwGwGQiiiik.',
  '.kPggggGGGGGiiiiik.',
  'kPgggggGGGGGiiiiiik',
  '.kkkkkkkqqqkkkkkkk.',
  '...kQwQQQQQQQQQk...',
  '....kyyyyyyyyyk....',
  '....kQQQQQQQQQk....',
  '.....kEEEEEEEk.....',
  '......kkkkkkk......',
];

// A big cherry tree in full bloom, petals drifting down (spring).
// prettier-ignore
const CHERRY_TREE: Frame = [
  '..........kHHfk..........',
  '.......kkkHHfffkkk.......',
  '......kHHfMfffMHffk......',
  '.....kHHfffMfMHffffk.....',
  '...kkHHfffMMMMMfffFHkk...',
  '..kHwfMMfMHHfffMfMMfffk..',
  '..kHffMMMMHffffMMMMfffk..',
  '.kMffMHfffMfffMHfffMfFMk.',
  '..kfMHfffffMfMHfffffMFk..',
  '.kHMHfffffMMMMMffffFFMfk.',
  'kHHfMMMMMMHwfffMMMMMMfffk',
  'kHffMHffffHffffHHfffMfffk',
  'kfffwffffffffffHfffffffFk',
  'kMfMfffffFFfffHfffffFMFMk',
  '.kMMMMMfFFMfffMMffMMMMMk.',
  '..kHfffFMMfMMMHfMfHfffk..',
  '..kfffFMHffffHfffMfffFk..',
  '..kMMMMkffffFfffFkMMMMk..',
  '...kkkkkMMfMMMMMMkkkkk...',
  '........kkMkDkqkk........',
  '..........kDDqk..........',
  '.H........kDDqk..........',
  '..........kLDqk........f.',
  '..........kLDqk..........',
  '..........kLDqk..........',
  '...f......kLDqk..........',
  '..........kLDqk......H...',
  '..........kLDqk..........',
  '......H..kLDDDqk.........',
  '.........kLDDDqk...f.....',
  '.f.H..f...kkkkk...H..f.F.',
];
// A maple in its autumn colors, leaves on the ground (autumn).
// prettier-ignore
const MAPLE_TREE: Frame = [
  '.........kyyOk.........',
  '.......kkyyOOOkk.......',
  '......kOOEOOOEyOk......',
  '.....kOOddEEEyOOOk.....',
  '.....kOdEEOddEEOOk.....',
  '....kkddOOdddddOdkk....',
  '...kyyEdOdddddQdEQQk...',
  '..kyyOOEEEdddEEEQQQQk..',
  '.kyyOEEQQQEEEyOOEEQQEk.',
  '.kEOOQQQQQQyyOOOOOQEEk.',
  '..kOOQQQQQEEEOOOOdEEk..',
  '.kOEEQQQEEOddEEOddEEdk.',
  'kOOddEQQOOdddddddEOdddk',
  'kOdddEEEEdddddEEEEdddQk',
  'kEddEQQQQEdddEyOOOEdQEk',
  '.kEEQQQQQEdEQyOOOOdEEk.',
  '..kkQQQQEEEQEEOOOddkk..',
  '...kEQQEEQQQQQOOddEk...',
  '....kEEEEQQQQEEEEEk....',
  '.....kkkkEEQEEkkkk.....',
  '.........kDEqk.........',
  '.........kDDqk.......Q.',
  '.........kLDqk.........',
  '.O.......kLDqk.........',
  '.........kLDqk.........',
  '.........kLDqk.........',
  '.........kLDqk.........',
  '...y.....kLDqk......O..',
  '........kLDDDqk........',
  '........kLDDDqk........',
  '.O.Q..y..kkkkk..Q..O.E.',
];
// Shopping bags: a black one with a gold band, a pink one with tissue paper, a small kraft one
// (Black Friday).
// prettier-ignore
const SHOPPING_BAGS: Frame = [
  '......kkkk..............',
  '.....kYYYYk.............',
  '.....kYkkYk.............',
  '...kkkYkkYkkk...........',
  '..kbbbbbbbbbbk..........',
  '..kKbbbbbbbbbk..........',
  '..kKbbbbbbbbbk.kk.kk....',
  '..kKbbbbbbbbbkkwzkwzk...',
  '..kYYYYYYYYYYkkwzwwzk...',
  '..kKbbbbbbbbbk.kFkkFk...',
  '..kKbbbbbbbbbkkkFkkFkkk.',
  '..kkkkYbbbbbkFFFFFFFFFFk',
  '.kqqqqkYbbbbkHfffffffFFk',
  '.kqkkqkbbbbbkHfffffffFFk',
  '.kqkkqkkbbbbkHffwwfwwFFk',
  'kDDDDDDDkbbbkHffwwwwwFFk',
  'kLLLQLDDkkkkkHfffwwwfFFk',
  'kLLLQLDDk...kHffffwffFFk',
  'kLLLLLDDk...kHfffffffFFk',
  '.kkkkkkk.....kkkkkkkkkk.',
];

// In PROP_PALETTE, at `size` times the buddy's pixel size (the pumpkin and the bags a little
// finer, like the plant; the trees as tall as the gardener's plant). Summer keeps the plant.
export const SEASON_CORNER: Partial<Record<Season, { frame: Frame; size: number }>> = {
  SPRING: { frame: CHERRY_TREE, size: 1 },
  HALLOWEEN: { frame: PUMPKIN, size: 0.72 },
  AUTUMN: { frame: MAPLE_TREE, size: 1 },
  BLACK_FRIDAY: { frame: SHOPPING_BAGS, size: 0.8 },
  CHRISTMAS: { frame: TREE, size: 1 },
};

// --- Happenings (docs/art-handover.md, F) ---

// A butterfly that comes to rest on the head, its wings opening and closing.
// prettier-ignore
export const BUTTERFLY: readonly [Frame, Frame] = [[
  '..k...k..',
  '...k.k...',
  '.kk.k.kk.',
  'kIakkkaIk',
  'kIIIkIIIk',
  '.kIIkIIk.',
  '..kk.kk..',
], [
  '..k...k..',
  '...k.k...',
  '....k....',
  '...kIk...',
  '...kak...',
  '...kIk...',
  '....k....',
]];

// Where the butterfly rests: on top of the head, in the middle.
export function butterflyAt(stage: Hatched): readonly [row: number, col: number] {
  const width = buddyFrame(stage, 'idle')[0].length;
  return [FIT[stage].head - 6, Math.floor(width / 2) - 4];
}

// A blue umbrella with a scalloped edge.
// prettier-ignore
const CANOPY: Frame = [
  '..........kkkkk..........',
  '......kkkkaaaaBkkkk......',
  '....kkBIIIIaaaBBBBBkk....',
  '..kkBBBBBaaaaaBBBBBaakk..',
  '.kaaBBBBBaaaaaBBBBBaaaak.',
  '.kaaBBBBBaaaaaBBBBBaaaak.',
  'kaaaBBBBBaaaaaBBBBBaaaaak',
  'kaakBBBBkaaaakBBBBkaaaak.',
];

const umbrellas = new Map<Hatched, Layer>();

// The umbrella over the head on a rainy day, its handle leaning down to the hand.
export function umbrellaFor(stage: Hatched): Layer {
  const known = umbrellas.get(stage);
  if (known) return known;
  const width = buddyFrame(stage, 'idle')[0].length;
  const { hand, head } = FIT[stage];
  const top = head - 9;
  const left = Math.floor((width - CANOPY[0].length) / 2);
  const right = Math.max(left + CANOPY[0].length, hand[1] + 1);
  const rows = Array.from({ length: hand[0] + 3 - top }, () =>
    Array<string>(right - left).fill('.'),
  );
  CANOPY.forEach((line, y) => [...line].forEach((key, x) => (rows[y][x] = key)));
  // The shaft, from under the middle of the canopy to the hand, then the crook of the handle.
  const from = [top + CANOPY.length, left + Math.floor(CANOPY[0].length / 2) + 2] as const;
  for (let r = from[0]; r <= hand[0]; r++) {
    const c = Math.round(from[1] + ((hand[1] - from[1]) * (r - from[0])) / (hand[0] - from[0]));
    rows[r - top][c - left] = 'k';
  }
  rows[hand[0] + 1 - top][hand[1] - left] = 'k';
  rows[hand[0] + 2 - top][hand[1] - left] = 'k';
  rows[hand[0] + 2 - top][hand[1] - 1 - left] = 'k';
  const layer = { frame: rows.map((r) => r.join('')), row: top, col: left };
  umbrellas.set(stage, layer);
  return layer;
}

// A heart for the bigger moments (a pet from both, a writer's love), with a shine.
// prettier-ignore
export const HEART_BIG: Frame = [
  '...kkk...kkk...',
  '..kHwrk.krrrk..',
  '.kHrrrrkrrrrrk.',
  '.kHrrrrrrrrrQk.',
  '.krrrrrrrrrrQk.',
  '.krrrrrrrrrrQk.',
  '..krrrrrrrrQk..',
  '...krrrrrrQk...',
  '....krrrrQk....',
  '.....krrQk.....',
  '......kQk......',
  '.......k.......',
];
