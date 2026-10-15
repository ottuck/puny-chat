import type { Frame, Palette } from './pixel-sprite';

// The room's things that come with levels (docs/fun-improvements.md, 방 소품): a crate that fills with
// toys, a window whose sky follows the device's clock, a wall clock, a music box, rugs, a standing
// lamp, a gold cushion, and the guests that drop by (a snail on the glass, a sparrow on the sill, a
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

// --- The window (Lv.12) ---

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

// A cream frame with a cross of glazing bars and a sill; through it a cloud, the sun (or the moon
// and stars) and green hills.
// prettier-ignore
export const WINDOW: Frame = [
  '.kkkkkkkkkkkkkkkkkkkk.',
  '.kffffffffffffffffffk.',
  '.kfkkkkkkkkkkkkkkkkFk.',
  '.kfkssssstfftssssskFk.',
  '.kfksccsssffssbbsskFk.',
  '.kfkcccccsffsbbbBskFk.',
  '.kfkssssssffsbbBBskFk.',
  '.kfkssstssffssbBsskFk.',
  '.kfkssssssfftssssskFk.',
  '.kfkffffffffffffffkFk.',
  '.kfkSSSSSSffSSSSSSkFk.',
  '.kfkSSSSggffggSSSSkFk.',
  '.kfkSSggggffgggSSgkFk.',
  '.kfkggggGgffgGggggkFk.',
  '.kfkkkkkkkkkkkkkkkkFk.',
  '.kFFFFFFFFFFFFFFFFFFk.',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kffffffffffffffffffffk',
  'kFFFFFFFFFFFFFFFFFFFFk',
  'kkkkkkkkkkkkkkkkkkkkkk',
];

// The glass, in the window's cells: where the guests at the window show.
export const WINDOW_GLASS = { col: 4, row: 3, cols: 14, rows: 11 };
// The sill's top row, where a sparrow perches.
export const WINDOW_SILL_ROW = 16;

// --- The wall clock (Lv.18) ---

// A round wooden clock; the hands are drawn for the time.
// prettier-ignore
const CLOCK_FACE: Frame = [
  '....kkkkk....',
  '..kkLLLLLkk..',
  '.kLLwwwwwDDk.',
  '.kLwwwwwwwDk.',
  'kLwwwwwwwwwDk',
  'kLwwwwwwwwwDk',
  'kLwwwwwwwwwDk',
  'kLwwwwwwwwwDk',
  'kLwwwwwwwwwDk',
  '.kDwwwwwwwqk.',
  '.kDDwwwwwqqk.',
  '..kkqqqqqkk..',
  '....kkkkk....',
];
const CLOCK_MIDDLE = 6;
const TICKS: readonly (readonly [number, number])[] = [
  [2, 6],
  [6, 10],
  [10, 6],
  [6, 2],
];

// The face at this time: the long hand for the minutes, the short one for the hour.
export function clockAt(hours: number, minutes: number): Frame {
  const cells = CLOCK_FACE.map((row) => row.split(''));
  for (const [row, col] of TICKS) cells[row][col] = 'n';
  const hand = (turns: number, length: number) => {
    const angle = turns * 2 * Math.PI;
    for (let i = 1; i <= length; i++) {
      const row = CLOCK_MIDDLE - Math.round(Math.cos(angle) * i);
      const col = CLOCK_MIDDLE + Math.round(Math.sin(angle) * i);
      cells[row][col] = 'k';
    }
  };
  hand(minutes / 60, 4);
  hand(((hours % 12) + minutes / 60) / 12, 3);
  cells[CLOCK_MIDDLE][CLOCK_MIDDLE] = 'u';
  return cells.map((row) => row.join(''));
}

// --- The left of the floor, until the job's station comes (Lv.6, Lv.9) ---

// prettier-ignore
const CRATE_ROWS: Frame = [
  'kkkkkkkkkkkkkkkk',
  'kqLLLLLLLLLLLLqk',
  'kqDDDDDDDDDDDDqk',
  'kqkkkkkkkkkkkkqk',
  'kqLLLLLLLLLLLLqk',
  'kqDDDDDDDDDDDDqk',
  'kqkkkkkkkkkkkkqk',
  'kqLLLLLLLLLLLLqk',
  'kqDDDDDDDDDDDDqk',
  'kqqqqqqqqqqqqqqk',
  'kkkkkkkkkkkkkkkk',
];

// A wooden crate, empty for now.
export const CRATE: Frame = CRATE_ROWS;

// The same crate full of toys: a ball, a star on a stick, a block.
// prettier-ignore
export const TOY_BOX: Frame = [
  '.........k......',
  '..kkkk..kyk.....',
  '.kuwuukkyyykkkkk',
  '.kwuuuk.kykkaaAk',
  '.kuuuUk..k.kaaAk',
  '.kuuUUk..k.kAAAk',
  ...CRATE_ROWS,
];

// The ball, popping out when the box is tapped.
// prettier-ignore
export const BALL: Frame = [
  '.kkkk.',
  'kuwuuk',
  'kwuuuk',
  'kuuuUk',
  'kuuUUk',
  '.kkkk.',
];

// --- The music box (Lv.20) ---

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

// --- The standing lamp (Lv.36) ---

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
  '..kkkkk..',
  '.knnnnnk.',
  'kNNNNNNNk',
  'kkkkkkkkk',
];

// At night the shade glows.
export const LAMP_LIT: Palette = { ...ROOM_PALETTE, l: '#FFF2BF', j: '#FFD166' };

// --- The gold cushion (Lv.50) ---

// A square floor cushion seen a little from above: stitched across to a tuft in the middle, its
// thick front edge below, tassels at the corners.
// prettier-ignore
export const CUSHION: Frame = [
  'y.kkkkkkkkkkkkkk.y',
  '.kzwwzzzzzzzzzzzk.',
  'kzwzZzzzzzzzzZzzZk',
  'kzzzzZzzzzzzZzzzZk',
  'kzzzzzzzyyzzzzzZZk',
  'kZzzzZzzzzzzZzzZZk',
  '.kZZZZZZZZZZZZZZk.',
  'y.kkkkkkkkkkkkkk.y',
];

// --- Rugs (from the egg on; a new pattern at Lv.16, 24, 31) ---

export type RugTier = 0 | 1 | 2 | 3;

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
