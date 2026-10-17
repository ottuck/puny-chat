import type { Frame, Palette } from './pixel-sprite';
import { ROOM_PALETTE } from './room';

// The room's later things (docs/fun-improvements.md, 방 소품): what the window grows into (a wind
// chime, petals, a rainbow, more guests at the glass), what sits on its sill (a pot, the plush
// friends), the shelf on the wall (books by the music box and a radio that turns into a
// gramophone), the side table with a goldfish bowl, the low table in the middle (a kotatsu in
// winter) with tea and New Year's mochi, a cuckoo clock and a fringed lamp shade. The last rug is
// with the others (room.ts).

export const THINGS_PALETTE: Palette = {
  ...ROOM_PALETTE,
  c: '#CFEFFA', // water
  d: '#9FD3EA', // water, deep
  g: '#8CCB72', // leaf
  G: '#5E9F4F', // leaf, shaded
  Q: '#E8603C', // the dragonfly
  s: '#2F3B5C', // the swallow
  b: '#C8925E', // the bear
  B: '#9E6B3F', // the bear, shaded
  V: '#76C1B0', // the radio
  t: '#4E9C8B', // the radio, shaded
  // The hanging plant: leaves from light to dark, its vines, the ropes, the pot's lit edge.
  '1': '#BFE79A',
  '2': '#7DC466',
  '3': '#4F9447',
  '4': '#3F7A3A',
  '5': '#D9C3A0',
  '6': '#B49A72',
  '7': '#FFC08A',
};

// The music box once it turns gold (Lv.43).
export const GOLD_PALETTE: Palette = {
  ...ROOM_PALETTE,
  L: '#FFE08A',
  D: '#E8B53E',
  q: '#B07F22',
};

// --- At the window ---

// A glass wind chime (Lv.31, in summer) at the top of the glass: a red pattern on the bell, the
// clapper, and its paper strip swinging in the breeze.
// prettier-ignore
export const FURIN: [Frame, Frame] = [[
  '..k...',
  '.kkk..',
  'kIwIk.',
  'kuIuk.',
  'kIIIk.',
  'kkNkk.',
  '..k...',
  '.kWk..',
  '.kak..',
  '.kWk..',
  '.kkk..',
], [
  '..k...',
  '.kkk..',
  'kIwIk.',
  'kuIuk.',
  'kIIIk.',
  'kkNkk.',
  '...k..',
  '..kWk.',
  '..kak.',
  '..kWk.',
  '..kkk.',
]];

// A trailing plant hung at the window's top right corner (Lv.21), drawn finer than the window
// (HANGING_PLANT_FINE): a terracotta pot on two ropes, leaves spilling over its rim and three vines
// falling along the frame in gentle curves, leaves on alternate sides.
export const HANGING_PLANT_FINE = 9 / 16;
// It hangs with its middle over the frame's right edge, the vines falling mostly past the glass.
// Where it hangs, in the window's cells: its left column and how far above the window's top.
export const HANGING_PLANT_AT = { col: 22, above: 2 };

// A small leaf, light at its top, and its mirror.
const LEAF = ['12.', '223', '.3.'];
const LEAF_LEFT = ['.21', '322', '.3.'];

export const HANGING_PLANT: Frame = (() => {
  const width = 12;
  const rows = Array.from({ length: 27 }, () => Array<string>(width).fill('.'));
  const set = (row: number, col: number, cell: string) => {
    if (row >= 0 && row < rows.length && col >= 0 && col < width) rows[row][col] = cell;
  };
  const put = (frame: string[], top: number, left: number) =>
    frame.forEach((line, dy) =>
      [...line].forEach((cell, dx) => {
        if (cell !== '.') set(top + dy, left + dx, cell);
      }),
    );
  // The hook and the ropes down to the pot's rim.
  set(0, 5, '6');
  set(0, 6, '6');
  for (let row = 1; row <= 5; row++) {
    set(row, 5 - Math.round((row - 1) * 0.75), '5');
    set(row, 6 + Math.round((row - 1) * 0.75), '5');
  }
  // The pot: a rim, then rounding in, lit on the left.
  const pot = [
    [6, 2, 'kkkkkkkk'],
    [7, 2, 'k7oooOOk'],
    [8, 2, 'kkkkkkkk'],
    [9, 3, 'k7oOOk'],
    [10, 4, 'kkkk'],
  ] as const;
  for (const [row, col, line] of pot) [...line].forEach((cell, i) => set(row, col + i, cell));
  // Leaves spilling over the rim.
  put(LEAF_LEFT, 4, 0);
  put(LEAF, 4, 8);
  put(LEAF, 5, 4);
  // Vines from both sides of the pot, the right one longest, and a short one from its middle.
  const vines = [
    { from: 8, col: 2, to: 21, sway: 1, phase: 0 },
    { from: 10, col: 5, to: 16, sway: 1, phase: 1.6 },
    { from: 8, col: 9, to: 25, sway: 1, phase: 3.1 },
  ];
  for (const vine of vines) {
    let last = vine.col;
    for (let row = vine.from; row <= vine.to; row++) {
      const t = row - vine.from;
      const col = Math.round(vine.col + Math.sin(t / 3 + vine.phase) * vine.sway);
      last = col;
      set(row, col, '4');
      if (t > 1 && t % 3 === 0) {
        if ((t / 3) % 2 === 0) put(LEAF, row - 1, col + 1);
        else put(LEAF_LEFT, row - 1, col - 3);
      }
    }
    put(LEAF, vine.to - 1, last - 1);
  }
  return rows.map((line) => line.join(''));
})();

// A cherry petal drifting past the glass (Lv.41, in spring).
// prettier-ignore
export const PETAL: Frame = [
  'pp',
  '.P',
];

// A few petals together, for the guide.
// prettier-ignore
export const PETALS_ICON: Frame = [
  '.pp....',
  '..P.pp.',
  '.....P.',
  'pp.....',
  '.P..pp.',
  '.....P.',
];

// A rainbow over the hills after the rain (Lv.53).
// prettier-ignore
export const RAINBOW: Frame = [
  '....uuuuuu....',
  '..uuoooooouu..',
  '.uooyyyyyyoou.',
  'uoyyggggggyyou',
  'uoygaaaaaagyou',
  'uoyga....agyou',
  'uoyg......gyou',
];

// --- Guests at the window ---

// A ladybug climbing the glass (Lv.23), its legs going.
// prettier-ignore
export const LADYBUG: [Frame, Frame] = [[
  '.k...k.',
  '..kkk..',
  '.kuNuk.',
  'kuukuuk',
  'kNukuNk',
  '.kkkkk.',
], [
  'k.....k',
  '..kkk..',
  'kkuNukk',
  'kuukuuk',
  'kNukuNk',
  'kkkkkkk',
]];

// A red dragonfly (Lv.33, in autumn), seen from above as it hovers, its glassy wings flickering.
// prettier-ignore
export const DRAGONFLY: [Frame, Frame] = [[
  '....kkk....',
  '.nnnkQknnn.',
  'nwwwwQwwwwn',
  '.nnnkQknnn.',
  '.nwwwQwwwn.',
  '..nnkQknn..',
  '....kQk....',
  '....kQk....',
  '....kQk....',
  '.....k.....',
], [
  '....kkk....',
  '..nnkQknn..',
  '.nwwwQwwwn.',
  '..nnkQknn..',
  '..nwwQwwn..',
  '...nkQkn...',
  '....kQk....',
  '....kQk....',
  '....kQk....',
  '.....k.....',
]];

// A swallow darting across the sky (Lv.39): forked tail, red throat, wings up and down.
// prettier-ignore
export const SWALLOW: [Frame, Frame] = [[
  '......k.....',
  '.....ksk....',
  '.....kssk...',
  'kk..kssssskk',
  '.skkssssswuk',
  'kk..kwwwwkk.',
  '.....kkkk...',
], [
  '............',
  '............',
  '............',
  'kk..kkkkkkkk',
  '.skkssssswuk',
  'kk..kssswkk.',
  '.....ksskk..',
]];

// An owl at night (Lv.46), rising behind the sill and blinking its round eyes.
// prettier-ignore
export const OWL: [Frame, Frame] = [[
  'k.......k',
  'kk.....kk',
  'khkkkkkhk',
  'khyyhyyhk',
  'khykhkyhk',
  'khhhYhhhk',
  'khiHiHihk',
  'khHiHiHhk',
  '.khhhhhk.',
  '..kYkYk..',
], [
  'k.......k',
  'kk.....kk',
  'khkkkkkhk',
  'khhhhhhhk',
  'khkkhkkhk',
  'khhhYhhhk',
  'khiHiHihk',
  'khHiHiHhk',
  '.khhhhhk.',
  '..kYkYk..',
]];

// A squirrel hopping over the hills (Lv.54), its big tail curled up behind.
// prettier-ignore
export const SQUIRREL: Frame = [
  '..kkk........',
  '.kooOk.......',
  'kooOOk...kk..',
  'koOkk...kook.',
  'kok....kookok',
  'kok...kooooik',
  '.kok.koooOik.',
  '..kkkoOOOkk..',
  '....kkkkk....',
];

// The stray cat, grown friendly (Lv.57): instead of its tail, its face comes up and blinks.
// prettier-ignore
export const CAT_FACE: [Frame, Frame] = [[
  '.kk......kk.',
  'kxxk....kxxk',
  'kxpxkkkkxpxk',
  'kxxxxXxXxxxk',
  'kxxkxxxxkxxk',
  'kxxkxxxxkxxk',
  'kwwxxppxxwwk',
  'kwwwkwwkwwwk',
  'kxxxxxxxxxxk',
], [
  '.kk......kk.',
  'kxxk....kxxk',
  'kxpxkkkkxpxk',
  'kxxxxXxXxxxk',
  'kxxxxxxxxxxk',
  'kxkkxxxxkkxk',
  'kwwxxppxxwwk',
  'kwwwkwwkwwwk',
  'kxxxxxxxxxxk',
]];

// --- On the sill ---

// A little pot of succulents (Lv.26), and in flower (Lv.59).
// prettier-ignore
export const SILL_POT: [Frame, Frame] = [[
  '.......',
  '..k.k..',
  '.kgkgk.',
  'kgGgGgk',
  '.kgGgk.',
  'kkkkkkk',
  'koooOOk',
  '.koOOk.',
  '.kkkkk.',
], [
  '.k.k.k.',
  'kpkykpk',
  '.kgkgk.',
  'kgGgGgk',
  '.kgGgk.',
  'kkkkkkk',
  'koooOOk',
  '.koOOk.',
  '.kkkkk.',
]];

// A little radio (Lv.25): playing, its dial lights and the grille thrums.
const RADIO_TOP = ['..kkkkkkkk..', '..k......k..', 'kkkkkkkkkkkk', 'kVVVVVVVVVVk'];
const RADIO_BOTTOM = ['kttttttttttk', 'kkkkkkkkkkkk', '.kk......kk.'];
// prettier-ignore
export const RADIO: [Frame, Frame, Frame] = [[
  ...RADIO_TOP,
  'kVkkkkkkVnVk',
  'kVkWqWqkVVVk',
  'kVkqWqWkVNVk',
  'kVkWqWqkVNVk',
  'kVkkkkkkVVVk',
  ...RADIO_BOTTOM,
], [
  ...RADIO_TOP,
  'kVkkkkkkVyVk',
  'kVkWqWqkVVVk',
  'kVkqWqWkVNVk',
  'kVkWqWqkVNVk',
  'kVkkkkkkVVVk',
  ...RADIO_BOTTOM,
], [
  ...RADIO_TOP,
  'kVkkkkkkVyVk',
  'kVkqWqWkVVVk',
  'kVkWqWqkVNVk',
  'kVkqWqWkVNVk',
  'kVkkkkkkVVVk',
  ...RADIO_BOTTOM,
]];

// The radio grown into a gramophone (Lv.55): a gold horn over a turning record on a wooden box.
const GRAMOPHONE_HORN = [
  '.kkkk........',
  'kyyyyk.......',
  'kyYYYyk......',
  '.kyYYYyk.....',
  '..kyYYYk.....',
  '...kyYk......',
  '....kYk......',
  '.....kYk.....',
  '..kkkkkYkkk..',
];
const GRAMOPHONE_BOX = [
  'kkkkkkkkkkkkk',
  'kLLLLLLLLLLDk',
  'kLDDDDyDDDDDk',
  'kqqqqqqqqqqqk',
  'kkkkkkkkkkkkk',
];
// prettier-ignore
export const GRAMOPHONE: [Frame, Frame] = [
  [...GRAMOPHONE_HORN, '.kNNNNNkNNNk.', ...GRAMOPHONE_BOX],
  [...GRAMOPHONE_HORN, '.kNnNNNkNNnk.', ...GRAMOPHONE_BOX],
];

// --- The side table, by the lamp ---

// A goldfish bowl (Lv.28) on a little wooden side table; with water plants and a second fish
// (Lv.56). The fish are placed by the tick (fishBowl).
const BOWL = [
  '..kkkkkkk..',
  '.kIcccccdk.',
  'kIcccccccdk',
  'kccccccccdk',
  'kccccccccdk',
  'kdcccccccdk',
  '.kdcccccdk.',
  '..kdddddk..',
  '...kkkkk...',
];
const SIDE_TABLE = [
  'kkkkkkkkkkk',
  'kLLLLLLLLLk',
  'kDDDDDDDDDk',
  'kkkkkkkkkkk',
  '.kqk...kqk.',
  '.kqk...kqk.',
  '.kqk...kqk.',
  '.kqk...kqk.',
  '.kkk...kkk.',
];
// A goldfish, three cells and a fin, facing right or left.
const FISH_RIGHT = ['Ooo', '.O.'];
const FISH_LEFT = ['ooO', '.O.'];

// Where the fish swim, by turns: [row, col, facing right].
const SWIMS: readonly (readonly [number, number, boolean])[] = [
  [3, 2, true],
  [3, 4, true],
  [4, 6, true],
  [3, 6, false],
  [4, 4, false],
  [3, 2, false],
];

export function fishBowl(turn: number, plants: boolean): Frame {
  const cells = BOWL.map((row) => row.split(''));
  const put = (fish: string[], row: number, col: number) =>
    fish.forEach((line, dy) =>
      [...line].forEach((cell, dx) => {
        if (cell !== '.') cells[row + dy][col + dx] = cell;
      }),
    );
  if (plants) {
    // Weeds on the left and pebbles along the bottom.
    for (const [row, col, cell] of [
      [3, 2, 'g'],
      [4, 1, 'G'],
      [4, 2, 'g'],
      [5, 2, 'G'],
      [5, 3, 'g'],
      [6, 3, 'g'],
      [5, 8, 'g'],
      [6, 7, 'G'],
    ] as const) {
      cells[row][col] = cell;
    }
    cells[7] = '..kyDyDyk..'.split('');
  }
  const [row, col, right] = SWIMS[turn % SWIMS.length];
  put(right ? FISH_RIGHT : FISH_LEFT, row, col);
  if (plants) {
    const [row2, col2, right2] = SWIMS[(turn + 3) % SWIMS.length];
    put(right2 ? FISH_RIGHT : FISH_LEFT, Math.min(5, row2 + 1), col2);
  }
  return [...cells.map((line) => line.join('')), ...SIDE_TABLE];
}

// A bubble, rising when the bowl is tapped.
// prettier-ignore
export const BUBBLE: Frame = [
  '.k.',
  'kIk',
  '.k.',
];

// --- In the middle of the floor ---

// A low table (Lv.38) on the rug; in winter a kotatsu, its quilt down to the floor.
// prettier-ignore
export const LOW_TABLE: Frame = [
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLLLLLLLLLLLLLLLk',
  'kDDDDDDDDDDDDDDDDDDDDDDk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  '.kqk................kqk.',
  '.kqk................kqk.',
  '.kkk................kkk.',
];
const quilt = (pattern: string) => 'k' + pattern.repeat(6).slice(0, 21) + 'Ok';
// prettier-ignore
export const KOTATSU: Frame = [
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kLLLLLLLLLLLLLLLLLLLLLLk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  quilt('oWoo'),
  quilt('ooWo'),
  quilt('oWoo'),
  'k' + 'O'.repeat(22) + 'k',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
];

// A teapot and a cup on the table (Lv.44).
// prettier-ignore
export const TEA: Frame = [
  '..kk.......',
  '.kWWk......',
  'kWaaWkk.kkk',
  'kWWWWk..kak',
  '.kkkk...kkk',
];

// Kagami mochi on its little stand, an orange on top (Lv.49, at the New Year).
// prettier-ignore
export const MOCHI: Frame = [
  '....kk....',
  '...kook...',
  '...kOOk...',
  '..kwwwwk..',
  '..keeeek..',
  '.kwwwwwwk.',
  'kwwwwwwwwk',
  'keeeeeeeek',
  'kuuuuuuuuk',
  'kkkkkkkkkk',
];

// Plush friends sitting at either end of the windowsill: a bear (Lv.34) with a red bow, a white
// bunny (Lv.58).
// prettier-ignore
export const BEAR: Frame = [
  '.kk...kk.',
  'kbBkkkBbk',
  'kbbbbbbbk',
  'kbkbbbkbk',
  'kbbeeebbk',
  '.kbekebk.',
  'kkbbubbkk',
  'kbkbbbkbk',
  'kbbkkkbbk',
  '.kk...kk.',
];

// prettier-ignore
export const BUNNY: Frame = [
  '.kk...kk.',
  'kWpk.kpWk',
  'kWpk.kpWk',
  '.kWkkkWk.',
  'kWWWWWWWk',
  'kWkWWWkWk',
  'kpWWkWWpk',
  '.kWWWWWk.',
  'kWkWWWkWk',
  'kWWkkkWWk',
  '.kk...kk.',
];

// Books standing on the shelf between the music box and the radio (Lv.52), one taller than the
// others.
// prettier-ignore
export const BOOKS: Frame = [
  '...kkkk...',
  '...kuuk...',
  'kkkkuuk...',
  'kaakuukkkk',
  'kaakuukTTk',
  'kaakyykTTk',
  'kaakuukWWk',
  'kaakuukTTk',
  'kaakuukTTk',
  'kkkkkkkkkk',
];

// The shelf on the wall at the top right (with the music box, Lv.15): a plank on two brackets, for
// the music box, the books and the radio.
export const SHELF: Frame = [
  'k'.repeat(44),
  'k' + 'L'.repeat(42) + 'k',
  'k' + 'D'.repeat(42) + 'k',
  'k'.repeat(44),
  '....kqk' + '.'.repeat(30) + 'kqk....',
  '.....kk' + '.'.repeat(30) + 'kk.....',
]; // --- On the wall ---

// The wall clock grown into a cuckoo clock (Lv.36), drawn as finely as the clock (CLOCK_FINE): a
// shingled roof with a little arched door and carved leaves hanging from its eaves over the face,
// and below it the pendulum swinging between two pine-cone weights on chains.
export const CUCKOO_ROOF_CELLS = 33;
const ROOF_MIDDLE = 16;
export const CUCKOO_DOOR = { col: ROOF_MIDDLE, row: 7 };

const ROOF_ROWS = 13;
export const CUCKOO_ROOF: Frame = Array.from({ length: ROOF_ROWS + 4 }, (_, row) =>
  Array.from({ length: CUCKOO_ROOF_CELLS }, (_, col) => {
    const dx = Math.abs(col - ROOF_MIDDLE);
    if (row < ROOF_ROWS) {
      // The roof: wider toward the eaves; shingles in rows two cells tall with staggered seams.
      const half = Math.min(ROOF_MIDDLE, Math.round(1 + row * 1.3));
      if (dx > half) return '.';
      if (dx === half || row === 0) return 'k';
      // The door, an arch in the middle.
      if (row >= CUCKOO_DOOR.row - 2 && row <= CUCKOO_DOOR.row + 3 && dx <= 2) {
        if (row === CUCKOO_DOOR.row - 2) return dx <= 1 ? 'L' : '.';
        if (dx === 2) return 'L';
        return row === CUCKOO_DOOR.row + 3 ? 'L' : 'N';
      }
      if (row <= 2) return 'q';
      const seam = (col + (Math.floor(row / 2) % 2) * 2) % 4 === 0;
      if (seam) return 'q';
      return row % 2 === 1 ? 'L' : 'D';
    }
    // The eaves' beam, lit on top, with leaves hanging from both ends.
    const beam = row - ROOF_ROWS;
    const end = col === 0 || col === CUCKOO_ROOF_CELLS - 1;
    if (beam === 0) return 'k';
    if (beam === 1) return end ? 'k' : 'L';
    if (beam === 2) {
      if (col <= 4 || col >= CUCKOO_ROOF_CELLS - 5) return col % 2 === 0 ? 'g' : 'G';
      return end ? 'k' : 'D';
    }
    if (col === 1 || col === 3 || col === CUCKOO_ROOF_CELLS - 2 || col === CUCKOO_ROOF_CELLS - 4)
      return 'G';
    return dx <= ROOF_MIDDLE - 5 ? 'k' : '.';
  }).join(''),
);

// A pine cone on its chain, for the weights.
const CONE = ['.kkk.', 'kDLDk', 'kLDLk', 'kDLDk', 'kLDLk', 'kDLDk', '.kDk.', '..k..'];
// A leaf-shaped bob at the end of the rod.
const BOB = ['.kyk.', 'kyyYk', 'kyYYk', '.kYk.', '..k..'];

function pendulum(swing: number): Frame {
  const width = 25;
  const rows = Array.from({ length: 21 }, () => Array<string>(width).fill('.'));
  const put = (frame: string[], top: number, left: number) =>
    frame.forEach((line, dy) =>
      [...line].forEach((cell, dx) => {
        if (cell !== '.') rows[top + dy][left + dx] = cell;
      }),
    );
  // Chains, link by link, down to the weights.
  for (const col of [6, 18]) {
    for (let row = 0; row < 11; row++) rows[row][col] = row % 2 === 0 ? 'N' : 'n';
    put(CONE, 11, col - 2);
  }
  // The rod from the middle, its end swung to one side.
  const length = 14;
  for (let t = 0; t <= length; t++) {
    rows[t][Math.round(12 + (swing * t) / length)] = 'Y';
  }
  put(BOB, length, 12 + swing - 2);
  return rows.map((line) => line.join(''));
}

export const PENDULUM: [Frame, Frame] = [pendulum(-2), pendulum(2)];

// The cuckoo, out of its door.
// prettier-ignore
export const CUCKOO: Frame = [
  '.kkk..',
  'kykyk.',
  'kyyyuk',
  '.kkkk.',
];

// The standing lamp's shade with dots and a gold fringe (Lv.47).
// prettier-ignore
export const LAMP_SHADE: Frame = [
  '..kkkkk..',
  '.kplllpk.',
  '.kllplljk',
  'kplllllpk',
  'kllpllljk',
  'kkkkkkkkk',
  'kykykykyk',
];
