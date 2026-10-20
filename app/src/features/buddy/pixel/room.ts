import type { Frame, Palette } from './pixel-sprite';

// The room's things that come with levels (docs/fun-improvements.md, 방 소품): a table that gets
// toys, a window whose sky follows the device's clock, a wall clock, a music box, rugs, a standing
// lamp, and the guests that drop by (a snail on the glass, a sparrow on the sill, a
// cat's tail, a toy train across the floor). And the bundle a buddy carries when it moves out.

export const ROOM_PALETTE: Palette = {
  k: '#3A2E2A', // outline
  w: '#FFFFFF',
  L: '#C99A68', // wood, lit
  D: '#9C6B43', // wood
  q: '#74502F', // wood, dark
  f: '#FBF4EA', // window frame
  F: '#DCCFBE', // window frame, shaded
  I: '#D7ECF7', // the music box's mirror
  y: '#FFD166', // gold, the star toy
  Y: '#E0A93A', // gold, shaded
  u: '#FF7A7A', // red: the ball, the engine
  U: '#D9505A', // red, shaded
  a: '#7FB3D5', // blue: the block, the carriage
  A: '#4F86B8', // blue, shaded
  N: '#5B5562', // dark grey: wheels, the lamp's stand
  n: '#99A2AD', // grey
  o: '#F4A261', // the snail's shell
  O: '#C9763A', // the shell's spiral
  e: '#EFE3C4', // the snail
  E: '#CDB98E', // the snail, shaded
  h: '#9C6A45', // sparrow
  H: '#D7AE84', // sparrow, light
  i: '#FFF4E0', // sparrow's breast
  x: '#F2A65A', // the cat's tail
  X: '#C46F2C', // its stripes
  z: '#F7CC55', // the cushion
  Z: '#C9961E', // the cushion, shaded
  // Rugs.
  m: '#F4B8A8', // pink
  W: '#FFF1E6', // cream
  T: '#BFE3CF', // mint
  v: '#D9C8F0', // lavender
  p: '#FF9EB5', // flower pink, the bundle
  P: '#E77E9C', // flower pink, shaded
  // The lamp's shade, by default off (LAMP_LIT turns it on).
  l: '#F5EBDD',
  j: '#DCCDB8',
  // Tatami, for the guide's picture of it.
  r: '#DCDDB0', // straw
  R: '#BFC28C', // its weave
  K: '#5E6B4A', // the cloth edge
};

// --- The window (Lv.9) ---

// Its sky follows the device's clock: day, dusk, night. One grid, three palettes: the sun and the
// moon share a disc (`B` is lit by day and sky at night, which bites the crescent out of it), the
// clouds go into the sky at night and the stars come out of it.
export type SkyTime = 'day' | 'dusk' | 'night';

export function skyAt(hour: number): SkyTime {
  if (hour >= 6 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

const SKIES: Record<SkyTime, Palette> = {
  day: {
    s: '#9FD4F2', // sky
    S: '#CBEAF9', // sky, low
    b: '#FFD166', // sun
    B: '#FFD166',
    c: '#FFFFFF', // cloud
    t: '#9FD4F2', // no stars
    g: '#A8D58F', // hills
    G: '#86BE70',
  },
  dusk: {
    s: '#EE9E7E',
    S: '#FFD3A1',
    b: '#FFF1C1',
    B: '#FFF1C1',
    c: '#FFE2E6',
    t: '#EE9E7E',
    g: '#B58A72',
    G: '#97705C',
  },
  night: {
    s: '#27345C',
    S: '#34467A',
    b: '#FFE9A8', // moon
    B: '#27345C',
    c: '#27345C', // no clouds
    t: '#FFE9A8', // stars
    g: '#22382F',
    G: '#1A2C25',
  },
};

export const SKY_PALETTES: Record<SkyTime, Palette> = {
  day: { ...ROOM_PALETTE, ...SKIES.day },
  dusk: { ...ROOM_PALETTE, ...SKIES.dusk },
  night: { ...ROOM_PALETTE, ...SKIES.night },
};

// A long cream frame of three panes with a sill, wide so the sky shows past what stands on the
// sill; through it clouds, the sun (or the moon and stars) and green hills. The glazing bars are not
// in the grid: they are drawn thinner than a cell over the glass (WINDOW_BARS), so more of the
// outside shows.
// prettier-ignore
export const WINDOW: Frame = [
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kfffffffffffffffffffffffffffffffffffk.',
  '.kfkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkFk.',
  '.kfkssssssstsssssssssstssssssssstsskFk.',
  '.kfksccssssssssssssssssssssssssbbsskFk.',
  '.kfkcccccsstsssssssssstsssssssbbbBskFk.',
  '.kfksssssssssssssssssssssstsssbbBBskFk.',
  '.kfkssstsssssssssstssssssssssssbBsskFk.',
  '.kfksssssssssssssssssssssssstsssssskFk.',
  '.kfksssssssssssssssssssssssssssssssskFk.',
  '.kfkSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSkFk.',
  '.kfkSSSSSSgggggSSSSSSgggggggSSSSSSSkFk.',
  '.kfkSSSggggggggSSSgggggggggggSSSSggkFk.',
  '.kfkggggggGggggggggggGgggggGgggggGgkFk.',
  '.kfkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkFk.',
  '.kFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFk.',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kfffffffffffffffffffffffffffffffffffffk',
  'kFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
];

// The glass, in the window's cells: where the guests at the window show.
export const WINDOW_GLASS = { col: 4, row: 3, cols: 31, rows: 11 };
// The glazing bars' middles in the glass, in cells: two down between the panes, one across.
export const WINDOW_BARS = { cols: [10, 21], row: 6.5 };
// The sill's top row, where a sparrow perches.
export const WINDOW_SILL_ROW = 16;

// --- The wall clock (Lv.11) ---

// A round clock in a slim wooden rim lit from the top left, a dark inner ring, a white face with long
// ticks at 12, 3, 6 and 9 and dots between, a brown hour hand, a black minute hand and a gold pin.
// Drawn a little finer than the room's other things (CLOCK_FINE), not so much that it stands apart.
export const CLOCK_CELLS = 19;
// Its cells against the room's: the clock is as wide as 13 of those.
export const CLOCK_FINE = 13 / CLOCK_CELLS;
const CLOCK_MIDDLE = 9;

const CLOCK_FACE: Frame = Array.from({ length: CLOCK_CELLS }, (_, row) =>
  Array.from({ length: CLOCK_CELLS }, (_, col) => {
    const dy = row - CLOCK_MIDDLE;
    const dx = col - CLOCK_MIDDLE;
    const d = Math.hypot(dx, dy);
    if (d > 9.4) return '.';
    if (d > 8.5) return 'k';
    // How much this point faces the light at the top left.
    const lit = d === 0 ? 0 : -(dx + dy) / (d * Math.SQRT2);
    if (d > 7.5) return lit > 0.35 ? 'L' : lit < -0.35 ? 'q' : 'D';
    if (d > 6.9) return 'q';
    return d > 5.8 && lit < -0.6 ? 'e' : 'w';
  }).join(''),
);

// The face at this time: the long hand for the minutes, the short one for the hour.
export function clockAt(hours: number, minutes: number): Frame {
  const cells = CLOCK_FACE.map((row) => row.split(''));
  const at = (turns: number, radius: number) => {
    const angle = turns * 2 * Math.PI;
    return [
      Math.round(CLOCK_MIDDLE - Math.cos(angle) * radius),
      Math.round(CLOCK_MIDDLE + Math.sin(angle) * radius),
    ] as const;
  };
  for (let i = 0; i < 12; i++) {
    const radii = i % 3 === 0 ? [5.2, 6.1] : [6];
    for (const radius of radii) {
      const [row, col] = at(i / 12, radius);
      cells[row][col] = i % 3 === 0 ? 'k' : 'n';
    }
  }
  const hand = (turns: number, length: number, color: string) => {
    for (let t = 1; t <= length; t += 0.25) {
      const [row, col] = at(turns, t);
      cells[row][col] = color;
    }
  };
  hand(((hours % 12) + minutes / 60) / 12, 3.6, 'q');
  hand(minutes / 60, 5.5, 'k');
  cells[CLOCK_MIDDLE][CLOCK_MIDDLE] = 'Y';
  return cells.map((row) => row.join(''));
}

// --- The left of the floor, until the job's station comes (Lv.4, Lv.8) ---

// prettier-ignore
const TABLE_ROWS: Frame = [
  'kkkkkkkkkkkkkkkk',
  'kLLLLLLLLLLLLLLk',
  'kDDDDDDDDDDDDDDk',
  'kkkkkkkkkkkkkkkk',
  '.kqqqqqqqqqqqqk.',
  '.kkkkkkkkkkkkkk.',
  '.kDk........kDk.',
  '.kDk........kDk.',
  '.kDk........kDk.',
  '.kqk........kqk.',
  '.kkk........kkk.',
];

// A wooden table, bare for now.
export const TABLE: Frame = TABLE_ROWS;

// The same table with toys on it: a ball, a star on a stick, a block.
// prettier-ignore
export const TABLE_TOYS: Frame = [
  '.........k......',
  '..kkkk..kyk.....',
  '.kuwuukkyyykkkkk',
  '.kwuuuk.kykkaaAk',
  '.kuuuUk..k.kaaAk',
  '.kuuUUk..k.kAAAk',
  ...TABLE_ROWS,
];

// The ball, bouncing off the table when the toys are tapped.
// prettier-ignore
export const BALL: Frame = [
  '.kkkk.',
  'kuwuuk',
  'kwuuuk',
  'kuuuUk',
  'kuuUUk',
  '.kkkk.',
];

// --- The music box (Lv.15) ---

// The lid up with its mirror, the comb's drum in gold, a heart inlaid in front and the crank at the
// side. Playing, the drum's pins turn and the crank goes round.
// prettier-ignore
export const MUSIC_BOX: [Frame, Frame] = [[
  '..kkkkkkkkk....',
  '..kLLLLLLLk....',
  '..kLIIIIILk....',
  '..kLIwIIILk....',
  '..kLIIIIILk....',
  '..kLLLLLLLk....',
  '.kkkkkkkkkkk...',
  '.kyYyYyYyYyk...',
  'kkkkkkkkkkkkk..',
  'kLLLLLLLLLLDk.k',
  'kLDDpDpDDDDDkkk',
  'kLDDpppDDDDDk..',
  'kLDDDpDDDDDDk..',
  'kqqqqqqqqqqqk..',
  'kkkkkkkkkkkkk..',
], [
  '..kkkkkkkkk....',
  '..kLLLLLLLk....',
  '..kLIIIIILk....',
  '..kLIwIIILk....',
  '..kLIIIIILk....',
  '..kLLLLLLLk....',
  '.kkkkkkkkkkk...',
  '.kYyYyYyYyYk...',
  'kkkkkkkkkkkkk..',
  'kLLLLLLLLLLDk..',
  'kLDDpDpDDDDDkkk',
  'kLDDpppDDDDDk.k',
  'kLDDDpDDDDDDk..',
  'kqqqqqqqqqqqk..',
  'kkkkkkkkkkkkk..',
]];

// --- The standing lamp (Lv.42): a tall floor lamp ---

// prettier-ignore
export const LAMP: Frame = [
  '..kkkkk..',
  '.klllllk.',
  '.kllllljk',
  'klllllljk',
  'kllllljjk',
  'kkkkkkkkk',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '...kNk...',
  '..kkkkk..',
  '.knnnnnk.',
  'kNNNNNNNk',
  'kkkkkkkkk',
];

// At night the shade glows.
export const LAMP_LIT: Palette = { ...ROOM_PALETTE, l: '#FFF2BF', j: '#FFD166' };

// --- Rugs (from the egg on; a new pattern at Lv.7, 16, 29, and the last at 51) ---

export type RugTier = 0 | 1 | 2 | 3 | 4;

// prettier-ignore
export const RUGS: Record<RugTier, Frame> = {
  // Pink with cream flecks.
  0: [
    '..' + 'm'.repeat(26) + '..',
    '.' + 'mmW'.repeat(9) + 'm.',
    '.' + 'Wmm'.repeat(9) + 'm.',
    '..' + 'm'.repeat(26) + '..',
  ],
  // Cream with pink and mint spots, a pink edge.
  1: [
    '..' + 'm'.repeat(26) + '..',
    '.m' + 'WpWWWTWW'.repeat(3) + 'Wp' + 'm.',
    '.m' + 'WWWTWWWp'.repeat(3) + 'WW' + 'm.',
    '..' + 'm'.repeat(26) + '..',
  ],
  // Stripes across in pastels.
  2: [
    '..' + 'mmWWTTWWvv'.repeat(2) + 'mmWWTT' + '..',
    '.m' + 'mmWWTTWWvv'.repeat(2) + 'mmWWTT' + 'W.',
    '.m' + 'mmWWTTWWvv'.repeat(2) + 'mmWWTT' + 'W.',
    '..' + 'mmWWTTWWvv'.repeat(2) + 'mmWWTT' + '..',
  ],
  // A big round one in mint with a flower in the middle.
  3: [
    '.....' + 'T'.repeat(25) + '.....',
    '..' + 'TWTTTTTTTTT' + 'TTppTppTT' + 'TTTTTTTTTWT' + '..',
    '.' + 'TTTWTTTTTTTT' + 'TppyyyppT' + 'TTTTTTTTWTTT' + '.',
    '.' + 'TWTTTTTTTTTT' + 'TppyyyppT' + 'TTTTTTTTTTWT' + '.',
    '..' + 'TTTTWTTTTTT' + 'TTppTppTT' + 'TTTTTTWTTTT' + '..',
    '.....' + 'T'.repeat(25) + '.....',
  ],
  // The last one: a big cream oval with a gold border and lavender and pink flowers.
  4: [
    '......' + 'y'.repeat(32) + '......',
    '...yY' + 'W'.repeat(34) + 'Yy...',
    '.yYW' + 'vWWpWW'.repeat(6) + 'WYy.',
    '.yYW' + 'WpWWvW'.repeat(6) + 'WYy.',
    '...yY' + 'W'.repeat(34) + 'Yy...',
    '......' + 'y'.repeat(32) + '......',
  ],
};

// --- Guests (they come and go and take no place) ---

// A snail crawling across the window glass, stretching and drawing in.
// prettier-ignore
export const SNAIL: [Frame, Frame] = [[
  'k..k.......',
  '.k.k.kkkk..',
  '.kkk.koooOk',
  'keekkoOkoOk',
  'keeekoOOOok',
  '.keeekkkkk.',
  '..kkkkk....',
], [
  '.k..k......',
  '..k.k.kkkk.',
  '..kkkkoooOk',
  '.keekoOkoOk',
  '.keeeoOOOok',
  'keeeeekkkkk',
  '.kkkkkkk...',
]];

// A sparrow on the sill, pecking; and in flight, wings up.
// prettier-ignore
export const SPARROW: [Frame, Frame, Frame] = [[
  '..kkk....',
  '.khhhk...',
  'NkhkHhk..',
  '.kiiHhhk.',
  '.kiiihhhk',
  '..kiihhkk',
  '...kkkk.k',
  '...k.k...',
], [
  '.........',
  '..kkk....',
  '.khhhk...',
  'NkhkHhk..',
  '.kiiHhhkk',
  '..kiihhhk',
  '...kkkkkk',
  '...k.k...',
], [
  'k.....k..',
  'kk...khk.',
  'khkkkhhk.',
  '.khhhhk..',
  'NkhkHhhk.',
  '.kiiihhhk',
  '..kkkkkk.',
  '.........',
]];

// A cat's tail rising behind the sill and swaying, striped, its tip curling one way then the other.
// prettier-ignore
export const CAT_TAIL: [Frame, Frame] = [[
  '.kkk..',
  'kxxXk.',
  'kXkkxk',
  '.k.kXk',
  '...kxk',
  '..kxxk',
  '..kXk.',
  '..kxk.',
  '..kxk.',
  '..kXk.',
  '..kxk.',
  '..kxk.',
], [
  '..kkk.',
  '.kXxxk',
  'kxkkXk',
  'kXk.k.',
  'kxk...',
  'kxxk..',
  '.kXk..',
  '.kxk..',
  '.kxk..',
  '.kXk..',
  '.kxk..',
  '.kxk..',
]];

// A toy train: a carriage and a little red engine with a chimney and a lamp. The wheels turn.
// prettier-ignore
export const TRAIN: [Frame, Frame] = [[
  '................kkkk..',
  '.........kkkkkk..kuk..',
  '.........kuIIuk..kuk..',
  'kkkkkkkk.kuIIukkkkkkk.',
  'kaaaaaak.kuuuuuuuuuuuk',
  'kaIaaIak.kuuuuuuuuuyuk',
  'kAAAAAAkkkUUUUUUUUUUUk',
  '.kNk.kNk..kNk.kNk.kNk.',
  '..k...k....k...k...k..',
], [
  '................kkkk..',
  '.........kkkkkk..kuk..',
  '.........kuIIuk..kuk..',
  'kkkkkkkk.kuIIukkkkkkk.',
  'kaaaaaak.kuuuuuuuuuuuk',
  'kaIaaIak.kuuuuuuuuuyuk',
  'kAAAAAAkkkUUUUUUUUUUUk',
  '.knk.knk..knk.knk.knk.',
  '..k...k....k...k...k..',
]];

// A wind-up tin robot (Lv.30): an antenna, square eyes and a red mouth, a blue body with a gold
// panel; it toddles along on stiff legs while the key on its back turns.
// prettier-ignore
export const TIN_ROBOT: [Frame, Frame] = [[
  '.....kyk.....',
  '......k......',
  '...kkkkkkk...',
  '...knnnnnk...',
  '...knkwkwk...',
  '...knnuunk...',
  '...kkkkkkk...',
  '..kaaaaaaak.Y',
  '.kkayyyyyakkY',
  'kNkaaaaaaakYY',
  '..kAAAAAAAk..',
  '..kkkkkkkkk..',
  '...kNk.kNk...',
  '...kkk..kk...',
], [
  '.....kyk.....',
  '......k......',
  '...kkkkkkk...',
  '...knnnnnk...',
  '...knkwkwk...',
  '...knnuunk...',
  '...kkkkkkk...',
  '..kaaaaaaakYY',
  '.kkayyyyyakkY',
  '..kaaaaaaakNY',
  '..kAAAAAAAk..',
  '..kkkkkkkkk..',
  '...kNk.kNk...',
  '....kk.kkk...',
]];

// A kitten (Lv.40), ginger with stripes and a white muzzle, chasing a pink ball of yarn that rolls
// ahead of it.
// prettier-ignore
export const KITTEN: [Frame, Frame] = [[
  '..........k...k..........',
  '.k.......kxk.kxk.........',
  'kXk......kxxxxxk.........',
  '.kXk...kkkxkxkxk....kkk..',
  '..kxkkkxxxxxwwxk...kpPpk.',
  '...kxXxxXxxXxkk...kPpPpPk',
  '...kxxxxxxxxxk....kpPpPpk',
  '...kwk.kwk.kwk.....kPpPk.',
  '...kk...kk..kk......kkk..',
], [
  '..........k...k..........',
  '.k.......kxk.kxk.........',
  'kXk......kxxxxxk.........',
  '.kXk...kkkxkxkxk....kkk..',
  '..kxkkkxxxxxwwxk...kPpPk.',
  '...kxXxxXxxXxkk...kpPpPpk',
  '...kxxxxxxxxxk....kPpPpPk',
  '....kwk.kwkkwk.....kpPpk.',
  '.....kk..kkkk.......kkk..',
]];

// A robot vacuum (Lv.50): a low grey disc with a shine on its lid and a blinking light; the floor
// sparkles where it has been.
// prettier-ignore
export const VACUUM: [Frame, Frame] = [[
  '....kkkkkkkk....',
  '..kknnnnnnnnkk..',
  '.knnwwnnnnnnnuk.',
  'kNNNNNNNNNNNNNNk',
  'kNnNNNNNNNNNNnNk',
  '.kkkkkkkkkkkkkk.',
], [
  '....kkkkkkkk....',
  '..kknnnnnnnnkk..',
  '.knnwwnnnnnnnyk.',
  'kNNNNNNNNNNNNNNk',
  'kNNnNNNNNNNNnNNk',
  '.kkkkkkkkkkkkkk.',
]];

// A firefly, for the guide: in the room they are only their glow.
// prettier-ignore
export const FIREFLY: Frame = [
  '..k.k..',
  '.kwkwk.',
  'kwwNwwk',
  '.kkNkk.',
  '..kyk..',
  '..kyk..',
  '...k...',
];

// The floors, for the guide (the stage draws them across its floor, room-props.tsx).
// prettier-ignore
export const WOOD_SWATCH: Frame = [
  'kkkkkkkkkkkk',
  'kLLLLkLLLLLk',
  'kDDDDkDDDDDk',
  'kkkkkkkkkkkk',
  'kLLkLLLLLkLk',
  'kDDkDDDDDkDk',
  'kkkkkkkkkkkk',
];

// prettier-ignore
export const TATAMI_SWATCH: Frame = [
  'kkkkkkkkkkkk',
  'kKKKKKKKKKKk',
  'krRrRrRrRrRk',
  'krRrRrRrRrRk',
  'krRrRrRrRrRk',
  'krRrRrRrRrRk',
  'kkkkkkkkkkkk',
];

// --- Moving out ---

// The bundle a buddy carries on its back when it goes its own way: its things, wrapped in a pink
// cloth with white spots, knotted on top.
// prettier-ignore
export const BUNDLE: Frame = [
  '..k...k..',
  '.kpk.kpk.',
  '..kpkpk..',
  '.kkkpkkk.',
  'kpwpppppk',
  'kppppwppk',
  'kpwppppPk',
  '.kpppPPk.',
  '..kkkkk..',
];
