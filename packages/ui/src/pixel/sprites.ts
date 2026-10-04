/**
 * Sprite sheet. Every picture is drawn as text: one character per pixel,
 * '.' is transparent and the other keys map to SPRITE_COLORS.
 */
import { art, mirror, overlay } from './raster';

export const SPRITE_COLORS: Readonly<Record<string, string>> = {
  O: '#22180F', // outline
  B: '#9A5F2E', // fur
  b: '#74431D', // fur shade
  L: '#C4834A', // fur light
  T: '#F5CF9F', // face, belly
  E: '#1B1B1B', // eye
  X: '#FFFFFF', // eye shine
  P: '#F59C9C', // cheeks
  R: '#E2463F', // harness
  G: '#4FBF73', // hold
  g: '#2F8A4F', // hold shade
  H: '#A8F5BF', // hold shine
  C: '#F4F4F4', // chalk dust
  Y: '#FFD23F', // banana
  y: '#D9A300', // banana shade
  V: '#3E8E4A', // leaf
  l: '#7BC255', // leaf light
  S: '#F2C29B', // skin
  s: '#D99C72', // skin crease
  W: '#FFF4DC', // cream
  K: '#C93A27', // sore finger
  k: '#FFB4A2', // sore finger light
  M: '#9AA5A8', // metal, rock
  D: '#D9954A', // gazelle coat
  d: '#B0703A', // gazelle far legs
  F: '#F0B870', // gazelle highlight
  N: '#3A2A20', // gazelle stripe, hooves
  J: '#A88A6C', // horn
  j: '#6E5642', // horn ring
  r: '#A82E2A', // sweatband tail
  Q: '#9FD4FF', // speed lines
  Z: '#123320', // ground shadow
  A: '#5E9FD8', // dolphin skin
  a: '#3F78B0', // dolphin fins
  i: '#E3F2FC', // dolphin belly
};

// The companion. 32 x 28, hanging one-handed from a hold.

const MONKEY_IDLE = art(`
  ..................C..OOOOOOO....
  ....................OGGGGGGGO.C.
  ...................OGHHGGGGGgO..
  ...................OGHOOOOOOgO.C
  ...................OGGOLBLBOgO..
  ....................OgOBBBBOO...
  .........OOOOOOO.....OOBBBBO....
  .......OOBBBBBBBOO.....OBbO.....
  ......OBBLLBBBBBBBO....OBbO.....
  ...OOOBBLBBBBBBBBBBO.OOOBbO.....
  ..OTTOBBTTTTBTTTTBBOTTOOBbO.....
  ..OTPOBTTTTTTTTTTTBOPTOOBbO.....
  ..OTTOBTTEXTTTEXTTBOTTOOBbO.....
  ...OOOBPTEETTTEETPBO.OOOBbO.....
  .....OBTTTTOTOTTTTBO...OBbO.....
  .....OBTTTOTTTOTTTBO...OBbO.....
  ......OBTTTOOOTTTBO...OBbO......
  .......OOTTTTTTTOO..OOBbO.......
  .......OOOOOOOOOBBBOBBbO.O......
  ......OBOBBTTTTTBBBBO...OBO.....
  .....OBbOBTTTTTTTBOO...OBOBO....
  ....OBbOOBTTTTTTTBO...OBOOBO....
  ...OTTO.ORRRRRRRRRO..OBOObO.....
  ..OTTO..OBRTTTTTRBOOOBO..O......
  ...OO...OBBRBOBRBBOBBO..........
  ........OBBBOOOBBBOOO...........
  .......OTTTTO.OTTTTO............
  .......OOOOO...OOOOO............
`);

const MONKEY_BLINK = art(`
  ..................C..OOOOOOO....
  ....................OGGGGGGGO.C.
  ...................OGHHGGGGGgO..
  ...................OGHOOOOOOgO.C
  ...................OGGOLBLBOgO..
  ....................OgOBBBBOO...
  .........OOOOOOO.....OOBBBBO....
  .......OOBBBBBBBOO.....OBbO.....
  ......OBBLLBBBBBBBO....OBbO.....
  ...OOOBBLBBBBBBBBBBO.OOOBbO.....
  ..OTTOBBTTTTBTTTTBBOTTOOBbO.....
  ..OTPOBTTTTTTTTTTTBOPTOOBbO.....
  ..OTTOBTTTTTTTTTTTBOTTOOBbO.....
  ...OOOBPTEETTTEETPBO.OOOBbO.....
  .....OBTTTTOTOTTTTBO...OBbO.....
  .....OBTTTOTTTOTTTBO...OBbO.....
  ......OBTTTOOOTTTBO...OBbO......
  .......OOTTTTTTTOO..OOBbO.......
  .......OOOOOOOOOBBBOBBbO.O......
  ......OBOBBTTTTTBBBBO...OBO.....
  .....OBbOBTTTTTTTBOO...OBOBO....
  ....OBbOOBTTTTTTTBO...OBOOBO....
  ...OTTO.ORRRRRRRRRO..OBOObO.....
  ..OTTO..OBRTTTTTRBOOOBO..O......
  ...OO...OBBRBOBRBBOBBO..........
  ........OBBBOOOBBBOOO...........
  .......OTTTTO.OTTTTO............
  .......OOOOO...OOOOO............
`);

const MONKEY_CHEER = art(`
  ..................C..OOOOOOO....
  ....................OGGGGGGGO.C.
  ...................OGHHGGGGGgO..
  ...................OGHOOOOOOgO.C
  ...................OGGOLBLBOgO..
  ....................OgOBBBBOO...
  .........OOOOOOO.....OOBBBBO....
  .......OOBBBBBBBOO.....OBbO.....
  ......OBBLLBBBBBBBO....OBbO.....
  ...OOOBBLBBBBBBBBBBO.OOOBbO.....
  ..OTTOBBTTTTBTTTTBBOTTOOBbO.....
  ..OTPOBTTTTTTTTTTTBOPTOOBbO.....
  ..OTTOBTTOTTTTTOTTBOTTOOBbO.....
  ...OOOBPOTOTTTOTOPBO.OOOBbO.....
  ..OTTOBTTTTOTOTTTTBO...OBbO.....
  ..OTTOBTTTOOOOOTTTBO...OBbO.....
  ...OBbOBTTOPPPOTTBO...OBbO......
  ....OBbOOTTOOOTTOO..OOBbO.......
  .....OBbOOOOOOOOBBBOBBbO.O......
  ......OBOBBTTTTTBBBBO...OBO.....
  .......OOBTTTTTTTBOO...OBOBO....
  ........OBTTTTTTTBO...OBOOBO....
  ........ORRRRRRRRRO..OBOObO.....
  ........OBRTTTTTRBOOOBO..O......
  ........OBBRBOBRBBOBBO..........
  ........OBBBOOOBBBOOO...........
  .......OTTTTO.OTTTTO............
  .......OOOOO...OOOOO............
`);

// Cosmetics are drawn over the base frame at a fixed offset.
const HEADBAND = art(`
  .............OYO
  ............OOYO
  .OYYYYYYYYYYYOO.
  OyyyyyyyyyyyyyO.
`);

const LEAF_CROWN = art(`
  .O.O.O.O.
  OlOlOlOlO
  OVlVlVlVO
  OVVVVVVVO
`);

export type MonkeyPose = 'idle' | 'blink' | 'cheer';

/*
 * Props: small things the monkey holds or wears, e.g. one per onboarding
 * step. Like cosmetics they are patches over the frame, so they stay put
 * while the monkey blinks, cheers and hops.
 *
 * The free arm (left in the picture) lives in rows 14 to 24, columns 0 to 7.
 * Nothing else is drawn there, so a prop can swap the whole arm:
 * - 'rest': the arm hangs as usual (hats, bands, feet).
 * - 'wave': the raised arm from the cheer frame, with any face.
 * - 'hold': the arm bends across the tummy, the item sits in PROP_SLOT and
 *   HOLD_HAND is drawn on top, so the fingers wrap round it on every frame.
 */
const ARM_Y = 14;
const ARM_W = 8;

function armOf(rows: readonly string[]): string[] {
  return rows.slice(ARM_Y, ARM_Y + 11).map(row => row.slice(0, ARM_W));
}

const ARM_WAVE = armOf(MONKEY_CHEER);

// The idle head edge on top, then the upper arm down to the elbow.
const ARM_HOLD = art(`
  .....OBT
  .....OBT
  ......OB
  .......O
  .......O
  ......OB
  .....OBb
  .....OBb
  .....OBb
  ......OB
  .......O
`);

/** A picture placed at (x, y) in sprite pixels. */
export type SpritePatch = Readonly<{ rows: readonly string[]; x: number; y: number }>;

/** The forearm's end and the fist, drawn over a held prop. */
export const HOLD_HAND: SpritePatch = {
  x: 6,
  y: 21,
  rows: art(`
    BOTTO
    bOTTO
    O.OO.
  `),
};

type Region = Readonly<{ x0: number; x1: number; y0: number; y1: number }>;

/** Where a held prop may draw: in front of the tummy, below the chin. */
export const PROP_SLOT: Region = { x0: 7, x1: 18, y0: 18, y1: 26 };

/** The arm and fist that hold the vine or the hold. Props never touch it. */
export const VINE_ARM: Region = { x0: 19, x1: 31, y0: 0, y1: 18 };

export type MonkeyProp =
  | 'wave'
  | 'map'
  | 'alarm-clock'
  | 'grade-sign'
  | 'trophy'
  | 'tape-measure'
  | 'phone'
  | 'clipboard'
  | 'stopwatch'
  | 'tally-counter'
  | 'ruler'
  | 'hourglass'
  | 'one-foot-up'
  | 'sweatband'
  | 'party-hat';

export type PropArt = Readonly<{
  arm: 'rest' | 'wave' | 'hold';
  /** Drawn in order. '.' keeps the monkey underneath and '_' erases it. */
  patches: readonly SpritePatch[];
}>;

/** A held item, top left at (x, y). */
const held = (x: number, y: number, picture: string): PropArt => ({
  arm: 'hold',
  patches: [{ x, y, rows: art(picture) }],
});

export const MONKEY_PROPS: Readonly<Record<MonkeyProp, PropArt>> = {
  // Two little motion marks beside the raised hand.
  wave: {
    arm: 'wave',
    patches: [
      {
        x: 0,
        y: 12,
        rows: art(`
          .W
          W.
          ..
          W.
          .W
        `),
      },
    ],
  },
  // Paper map: forest corners, a river and a red X.
  map: held(
    9,
    18,
    `
    OOOOOOOOOO
    OVVWQWRWRO
    OVWWQWWRWO
    OWWQWWRWRO
    OWWQWWWWVO
    OWQWWWWVVO
    OOOOOOOOOO
  `,
  ),
  // Red alarm clock with two bells and little feet.
  'alarm-clock': held(
    9,
    18,
    `
    OO...OO
    ORO.ORO
    .ORRRO.
    ORWOWRO
    ORWOWRO
    ORWWORO
    ORWWWRO
    .ORRRO.
    OO...OO
  `,
  ),
  // Yellow grade tag with a V on it.
  'grade-sign': held(
    10,
    18,
    `
    OOOOOOOOO
    OYYYYYYYO
    OYEYYYEYO
    OYEYYYEYO
    OYYEYEYYO
    OYYYEYYYO
    OyyyyyyyO
    OOOOOOOOO
  `,
  ),
  // Gold cup with two handles.
  trophy: held(
    9,
    18,
    `
    .OOOOOOO.
    OOWYYYyOO
    O.OYYyO.O
    .OOYYyOO.
    ...OyO...
    ...OyO...
    ..OOOOO..
    ..OYYyO..
    ..OOOOO..
  `,
  ),
  // Yellow case in the fist, the tape pulled out a little.
  'tape-measure': held(
    9,
    19,
    `
    .OOOO.....
    OYYYYOOOOO
    OYOOYYEYEO
    OYOOYOOOOO
    OYYYYO....
    .OOOO.....
  `,
  ),
  // Phone with a few apps on the screen.
  phone: held(
    9,
    18,
    `
    OOOOOO
    OMMMMO
    OQQQQO
    OQGQRO
    OQQQQO
    OQYQQO
    OQQQQO
    OMMMMO
    OOOOOO
  `,
  ),
  // Clipboard with a checklist, for the home tests.
  clipboard: held(
    9,
    18,
    `
    ..OOO..
    OOOMOOO
    ODWWWDO
    ODWEEDO
    ODWWWDO
    ODWEEDO
    ODWWWDO
    ODDDDDO
    OOOOOOO
  `,
  ),
  // Silver stopwatch with the button on top.
  stopwatch: held(
    9,
    18,
    `
    ...M...
    ..OOO..
    .OMMMO.
    OMWOWMO
    OMWOWMO
    OMWWOMO
    OMWWWMO
    .OMMMO.
    ..OOO..
  `,
  ),
  // Tally counter: a red button to click for each rep.
  'tally-counter': held(
    9,
    18,
    `
    ..ORO..
    .OOOOO.
    OMMMMMO
    OMWWWMO
    OMWEWMO
    OMWEWMO
    OMWWWMO
    OMMMMMO
    .OOOOO.
  `,
  ),
  // Ruler held across the tummy, long ticks every fourth.
  ruler: held(
    8,
    19,
    `
    OOOOOOOOOOO
    OWOWOWOWOWO
    OWOWWWOWWWO
    OWWWWWWWWWO
    OOOOOOOOOOO
  `,
  ),
  // Hourglass: a timer that looks nothing like the stopwatch.
  hourglass: held(
    9,
    18,
    `
    OOOOOOO
    ODDDDDO
    OOQQQOO
    .OQYQO.
    ..OYO..
    .OQYQO.
    OOYYYOO
    ODDDDDO
    OOOOOOO
  `,
  ),
  // The balance test: eyes shut, an arm out and the left foot off the ground.
  'one-foot-up': {
    arm: 'wave',
    patches: [
      {
        x: 8,
        y: 12,
        rows: art(`
          .TT...TT.
          TOO...OOT
        `),
      },
      {
        x: 7,
        y: 24,
        rows: art(`
          OTTTTO
          OOOOOO
          ______
          _____.
        `),
      },
    ],
  },
  // Red sweatband with its ends flying out behind.
  sweatband: {
    arm: 'rest',
    patches: [
      {
        x: 3,
        y: 6,
        rows: art(`
          .r..............
          r.r.............
          .rrORRRRRRRRRRRO
          ...RRRRRRRRRRRRR
        `),
      },
    ],
  },
  // Party hat and confetti, for the end.
  'party-hat': {
    arm: 'rest',
    patches: [
      {
        x: 10,
        y: 3,
        rows: art(`
          ..Y..
          .ORO.
          .OQO.
          ORQRO
          OQRQO
        `),
      },
      {
        x: 0,
        y: 3,
        rows: art(`
          .Y.......
          .......R.
          ..Q......
          .........
          R........
        `),
      },
      {
        x: 28,
        y: 20,
        rows: art(`
          .Y..
          ....
          ...Q
          R...
        `),
      },
    ],
  },
};

function withProp(rows: readonly string[], prop: MonkeyProp): string[] {
  const { arm, patches } = MONKEY_PROPS[prop];
  // The arm patch replaces the whole arm area: '.' there erases.
  const erase = (picture: readonly string[]) =>
    picture.map(row => row.replace(/\./g, '_'));
  let out =
    arm === 'rest'
      ? [...rows]
      : overlay(rows, erase(arm === 'wave' ? ARM_WAVE : ARM_HOLD), 0, ARM_Y);
  patches.forEach(patch => {
    out = overlay(out, patch.rows, patch.x, patch.y);
  });
  if (arm === 'hold') {
    out = overlay(out, HOLD_HAND.rows, HOLD_HAND.x, HOLD_HAND.y);
  }
  return out;
}

export function monkeyRows(
  pose: MonkeyPose,
  cosmetics: readonly string[] = [],
  prop?: MonkeyProp,
): string[] {
  let rows =
    pose === 'cheer' ? MONKEY_CHEER : pose === 'blink' ? MONKEY_BLINK : MONKEY_IDLE;
  if (cosmetics.includes('headband')) {
    rows = overlay(rows, HEADBAND, 5, 6);
  }
  if (cosmetics.includes('leaf-crown')) {
    rows = overlay(rows, LEAF_CROWN, 8, 3);
  }
  return prop ? withProp(rows, prop) : rows;
}


// Icons, 12 x 12. '#' is drawn in the caller's ink colour.
export const ICONS = {
  slab: art(`
    ...........#
    ..........##
    .........#M#
    ........#MM#
    ......Y#MMM#
    ......#MMMM#
    .....#MMMMM#
    ....#MMMMMM#
    ..Y#MMMMMMM#
    ..#MMMMMMMM#
    .#MMMMMMMMM#
    ############
  `),
  vertical: art(`
    .....#######
    .....#MMMMM#
    ....Y#MMMMM#
    .....#MMMMM#
    .....#MMMMM#
    .....#MMMMM#
    ....Y#MMMMM#
    .....#MMMMM#
    .....#MMMMM#
    ....Y#MMMMM#
    .....#MMMMM#
    ############
  `),
  overhang: art(`
    ############
    .#MMMMMMMMM#
    ..#MMMMMMMM#
    ...#MMMMMMM#
    ...Y#MMMMMM#
    .....#MMMMM#
    ......#MMMM#
    .......#MMM#
    .......Y#MM#
    .........#M#
    ..........##
    ############
  `),
  profile: art(`
    .....##.....
    .....##.....
    ....#..#....
    ....#YY#....
    ...#YYYY#...
    ...#YYYY#...
    ..#YYYYYY#..
    ..#YYYYYY#..
    .#YYYYYYYY#.
    .#YYYYYYYY#.
    ############
    ............
  `),
  log: art(`
    .#.#.#.#....
    ##########..
    #WWWWWWWW#..
    #W######W#.#
    #WWWWWWWW##Y
    #W######W#Y#
    #WWWWWWW#Y#.
    #W####W#Y#..
    #WWWWWW##...
    #WWWWWWWW#..
    ##########..
    ............
  `),
  hands: art(`
    ....#.#.....
    ...#Y#Y#.#..
    ...#Y#Y##Y#.
    .#.#Y#Y#Y#..
    #Y##Y#Y#Y#..
    #YY#YYYYY#..
    .#YYYYYYY#..
    .#YYYYYYY#..
    ..#YYYYY#...
    ..#YYYYY#...
    ..#######...
    ............
  `),
  tests: art(`
    ....####....
    .....##..#..
    ...######...
    ..#WWWWWW#..
    .#WWW#WWWW#.
    .#WWW#WWWW#.
    .#WWW###WW#.
    .#WWWWWWWW#.
    .#WWWWWWWW#.
    ..#WWWWWW#..
    ...######...
    ............
  `),
  banana: art(`
    .........##.
    ........#YY#
    ........#Y#.
    .......#YY#.
    ......#YY#..
    .....#YYy#..
    ...##YYYy#..
    .##YYYYy#...
    #YYYYYy#....
    #yyyyy#.....
    .#####......
    ............
  `),
  clock: art(`
    ............
    ...######...
    ..#WWWWWW#..
    .#WWWW#WWW#.
    .#WWWW#WWW#.
    .#WWWW#WWW#.
    .#WWWW###W#.
    .#WWWWWWWW#.
    .#WWWWWWWW#.
    ..#WWWWWW#..
    ...######...
    ............
  `),
  flag: art(`
    .....##.....
    ....#KK#....
    ....#KK#....
    ...#KWWK#...
    ...#KWWK#...
    ..#KKWWKK#..
    ..#KKWWKK#..
    .#KKKKKKKK#.
    .#KKKWWKKK#.
    #KKKKKKKKKK#
    ############
    ............
  `),
  check: art(`
    ............
    ..........##
    .........##.
    ........##..
    .......##...
    ##....##....
    .##..##.....
    ..####......
    ...##.......
    ............
    ............
    ............
  `),
  // A camera body with its lens, for the camera assessments.
  camera: art(`
    ............
    ...####.....
    .##########.
    .#WWWWWWWW#.
    .#WW####WW#.
    .#W#WWWW#W#.
    .#W#W##W#W#.
    .#W#WWWW#W#.
    .#WW####WW#.
    .#WWWWWWWW#.
    .##########.
    ............
  `),
  lock: art(`
    ............
    ...######...
    ..#......#..
    ..#......#..
    .##########.
    .#YYYYYYYY#.
    .#YYY##YYY#.
    .#YYY##YYY#.
    .#YYYYYYYY#.
    .#yyyyyyyy#.
    .##########.
    ............
  `),
  leaf: art(`
    ........###.
    ......##lll#
    ....##llVl#.
    ...#llVll#..
    ..#lVll##...
    ..#Vll#.....
    .#V###......
    .#..........
    #...........
    ............
    ............
    ............
  `),
  // Rubbish bin with a handle on the lid, for deleting.
  bin: art(`
    ....####....
    ....#..#....
    ############
    .#WWWWWWWW#.
    .#WW#WW#WW#.
    .#WW#WW#WW#.
    .#WW#WW#WW#.
    .#WW#WW#WW#.
    .#WW#WW#WW#.
    ..#WWWWWW#..
    ..########..
    ............
  `),
  // Speaker with sound waves: music is playing.
  speaker: art(`
    ......#.....
    .....##...#.
    ....#W#....#
    .###WW#.#..#
    .#WWWW#..#.#
    .#WWWW#..#.#
    .#WWWW#..#.#
    .###WW#.#..#
    ....#W#....#
    .....##...#.
    ......#.....
    ............
  `),
  // Speaker with a cross: music is off.
  speakerOff: art(`
    ......#.....
    .....##.....
    ....#W#.....
    .###WW#.....
    .#WWWW#.#..#
    .#WWWW#..##.
    .#WWWW#..##.
    .###WW#.#..#
    ....#W#.....
    .....##.....
    ......#.....
    ............
  `),
  // Hold types, same 12 x 12 grid.
  jug: art(`
    ............
    ...######...
    ..#YYYYYY#..
    .#YYYYYYYY#.
    .#YYYYYYYY#.
    .#YY####YY#.
    .#Y#....#Y#.
    .#Y#....#Y#.
    .#yy####yy#.
    ..########..
    ............
    ............
  `),
  crimp: art(`
    ............
    ............
    ............
    ............
    ............
    .##########.
    #RRRRRRRRRR#
    #rrrrrrrrrr#
    .##########.
    ............
    ............
    ............
  `),
  sloper: art(`
    ............
    ............
    ............
    ....####....
    ..##GGGG##..
    .#GGGGGGGG#.
    #GGGGGGGGGG#
    #GGGGGGGGgg#
    #gggggggggg#
    ############
    ............
    ............
  `),
  pinch: art(`
    ....####....
    ...#PPPP#...
    ...#PPPP#...
    ...#PPPP#...
    ...#PPPP#...
    ...#PPPP#...
    ...#PPPP#...
    ...#PPPP#...
    ...#PPPP#...
    ....####....
    ............
    ............
  `),
  pocket: art(`
    ............
    ..########..
    .#MMMMMMMM#.
    #MMMMMMMMMM#
    #MMM####MMM#
    #MM######MM#
    #MMM####MMM#
    #MMMMMMMMMM#
    .#MMMMMMMM#.
    ..########..
    ............
    ............
  `),
  volume: art(`
    ............
    ............
    .....##.....
    ....#DD#....
    ...#DDDD#...
    ..#DDDDdd#..
    .#DDDDdddd#.
    #DDDDdddddd#
    ############
    ............
    ............
    ............
  `),
  // Gazelle mode. Run types: easy is a gentle rolling path under the sun,
  // tempo a lightning bolt, long a road running to the horizon.
  easy: art(`
    ........###.
    .......#YYY#
    .......#YYY#
    ........###.
    ............
    ............
    ..###.......
    .#GGG#...##.
    #GGGGG#.#GG#
    GGGGGGG#GGGG
    ############
    ............
  `),
  tempo: art(`
    ......####..
    .....#YYY#..
    ....#YYY#...
    ...#YYY#....
    ..#YYYY####.
    .#YYYYYYYY#.
    .####YYYY#..
    ....#YYY#...
    ...#YY##....
    ...#Y#......
    ...##.......
    ............
  `),
  long: art(`
    ............
    ..........Y.
    .....##.....
    ....#MM#....
    ....#WW#....
    ...#MMMM#...
    ...#MMMM#...
    ..#MMWWMM#..
    ..#MMWWMM#..
    .#MMMMMMMM#.
    .#MMMMMMMM#.
    ############
  `),
  // Running shoe, for the Legs tab.
  shoe: art(`
    ............
    ............
    ...####.....
    ...#WW#.....
    ...#WW##....
    ...#WWWW#...
    ..#RWWWWW##.
    ..#RRWWWWWW#
    .#RRRRRRRRR#
    .#RRRRRRRRR#
    ############
    .#.#.#.#.#..
  `),
  // Surfaces.
  road: art(`
    ............
    ............
    ............
    ############
    #MMMMMMMMMM#
    #MMMMMMMMMM#
    #WW.WW.WW.W#
    #MMMMMMMMMM#
    #MMMMMMMMMM#
    ############
    ............
    ............
  `),
  trail: art(`
    ..........#.
    .........#l#
    ........#lVl
    ...#.....#V#
    ..#l#.....#.
    ..#V#.......
    ...#DDD.....
    ....DDDD....
    ......DDD...
    ....DDDD....
    ..DDDD......
    ############
  `),
  track: art(`
    ............
    ............
    ############
    #RRRRRRRRRR#
    #WWWWWWWWWW#
    #RRRRRRRRRR#
    #WWWWWWWWWW#
    #RRRRRRRRRR#
    ############
    ............
    ............
    ............
  `),
  // Dolphin mode. Strokes: freestyle reaches one arm over the water,
  // breaststroke sweeps both arms out, backstroke reaches back.
  free: art(`
    ............
    ......###...
    .....#...#..
    ....#.....#.
    .##.......#.
    #YY#......#.
    #YY#.....#..
    .##QQQQQQQQ.
    QQQQQQQQQQQQ
    .QQ..QQ..QQ.
    ............
    ............
  `),
  breast: art(`
    ............
    ............
    .....##.....
    ....#YY#....
    #...#YY#...#
    .#...##...#.
    ..##....##..
    ....####....
    QQQQQQQQQQQQ
    .QQ..QQ..QQ.
    ............
    ............
  `),
  back: art(`
    ............
    ...###......
    ..#...#.....
    .#.....#....
    .#......##..
    #......#YY#.
    .......#YY#.
    QQQQQQQQ##QQ
    QQQQQQQQQQQQ
    .QQ..QQ..QQ.
    ............
    ............
  `),
  // Waters.
  pool: art(`
    ############
    #QQQQQQQQQQ#
    #RWRWRWRWRW#
    #QQQQQQQQQQ#
    #QQQQQQQQQQ#
    #RWRWRWRWRW#
    #QQQQQQQQQQ#
    #QQQQQQQQQQ#
    #RWRWRWRWRW#
    #QQQQQQQQQQ#
    ############
    ............
  `),
  lake: art(`
    ......#.....
    .....#l#....
    ....#lVl#...
    ...#lVVVl#..
    ..#VVVVVVV#.
    ...###N###..
    ......N.....
    QQQQQQQQQQQQ
    ............
    ..QQQQQQQQ..
    ............
    ....QQQQ....
  `),
  sea: art(`
    ............
    .....####...
    ...##QQQQ#..
    ..#QQQ##QQ#.
    .#QQ#...#Q#.
    .#Q#.....#..
    #QQ#........
    #QQQ#....##.
    #QQQQ####QQ#
    #QQQQQQQQQQ#
    ############
    ............
  `),
  // Swim goggles, for the dolphin's quests.
  goggles: art(`
    ............
    ............
    ............
    .####..####.
    #QQQQ##QQQQ#
    #QWQQ##QWQQ#
    #QQQQ#.#QQQ#
    .####...###.
    ............
    ............
    ............
    ............
  `),
} as const;

export type IconName = keyof typeof ICONS;

// Left hand, palms up. The right hand is the mirror image.
const LEFT_HAND = art(`
  .........OOO........
  ........OSSSOOOO....
  .....OOOOSSSOSSSO...
  ....OSSSOSSSOSSSO...
  ....OSSSOsssOSSSO...
  ....OSSSOSSSOsssOOO.
  ....OsssOSSSOSSSOSSO
  ....OSSSOSSSOSSSOSSO
  ....OSSSOsssOSSSOssO
  ....OsssOSSSOsssOSSO
  .OO.OSSSOSSSOSSSOSSO
  OSSOOSSSOSSSOSSSOSSO
  OSSOOssssssssssssssO
  .OSSSSSSSSSSSSSSSSSO
  ..OSsSSSSSSSSSSSSSSO
  ...OSSSSSSSSSSSSSSSO
  ....OSSSSSSSSSSSSSSO
  ....OSSSSSSSSSSSSSSO
  ....OSSSSSSSSSSSSSSO
  .....OSSSSSSSSSSSSO.
  ......OSSSSSSSSSSO..
  ......OSSSSSSSSSSO..
  ......OOOOOOOOOOOO..
`);

/** Finger areas on the left hand, in art pixels (inclusive). */
export const LEFT_HAND_FINGERS: Readonly<Record<string, Region>> = {
  thumb: { x0: 0, x1: 3, y0: 10, y1: 13 },
  index: { x0: 5, x1: 7, y0: 2, y1: 11 },
  middle: { x0: 9, x1: 11, y0: 0, y1: 11 },
  ring: { x0: 13, x1: 15, y0: 1, y1: 11 },
  little: { x0: 17, x1: 18, y0: 5, y1: 11 },
};

export const HAND_WIDTH = LEFT_HAND[0].length;
export const HAND_HEIGHT = LEFT_HAND.length;

/** Hand picture with sore fingers painted red. */
export function handRows(
  side: 'left' | 'right',
  sore: readonly string[],
): string[] {
  const rows = LEFT_HAND.map(row => row.split(''));
  sore.forEach(finger => {
    const r = LEFT_HAND_FINGERS[finger];
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        if (rows[y][x] === 'S' || rows[y][x] === 's') {
          rows[y][x] = rows[y][x] === 'S' ? 'K' : 'k';
        }
      }
    }
  });
  const left = rows.map(row => row.join(''));
  return side === 'left' ? left : mirror(left);
}

// Running mode pet, 31 x 29. Two gallop frames.
const GAZELLE_RUN_A = art(`
  ..................OO.OO........
  .................OJOOJO........
  .................OjOOjO........
  ..................OJOOJO.......
  ..................OjOOjO.......
  ...................OJOOJO......
  ...................OjOOjO......
  .............OOOO..OOOOOOO.....
  ............OPPPDOODDDDDDDOO...
  .............OOOORRRRRRRRRRRO..
  ...........OOOOOODDDDDDDEXDDO..
  ..QQQQ....ORRRRRODDDDDDDEEDDDDO
  .........OrrOOOOODDDDDPDEEWWWWO
  .........OO.....ODDDDDDWWWWWWNO
  QQQQQQ...........ODDDWWWWWOWWO.
  ................ODDOOOOOOOOO...
  ...QQQ.........ODDDDO..........
  .OO..OOOOOOOOOODDDDDO..........
  ONNOOFFFFFFFFDDDDDDDO..........
  ONODDDDDDDDDDDDDDDDDO..........
  .OONNNNNNNNNNNNNNNNNO..........
  ..OWWWWWWWWWWWWWWWWWO..........
  ...OWWWWWWWWWWWWWWWO...........
  ....OODDOddOOddODDO............
  ....ODDOOddOOddOODDO...........
  ...ODDOOddO..OddOODDO..........
  ..ODDO.ONNO..ONNO.ODDO.........
  .ONNO...OO....OO...ONNO........
  ..OO................OO.........
`);

const GAZELLE_RUN_B = art(`
  ..................OO.OO........
  .................OJOOJO........
  .................OjOOjO........
  ..................OJOOJO.......
  ..................OjOOjO.......
  ...................OJOOJO......
  ...................OjOOjO......
  .............OOOO..OOOOOOO.....
  ............OPPPDOODDDDDDDOO...
  .............OOOORRRRRRRRRRRO..
  ...........OOOOOODDDDDDDEXDDO..
  ...QQQ....ORRRRRODDDDDDDEEDDDDO
  .........OrrOOOOODDDDDPDEEWWWWO
  .........OO.....ODDDDDDWWWWWWNO
  QQQQQ............ODDDWWWWWOWWO.
  ................ODDOOOOOOOOO...
  ...QQQ.........ODDDDO..........
  .OO..OOOOOOOOOODDDDDO..........
  ONNOOFFFFFFFFDDDDDDDO..........
  ONODDDDDDDDDDDDDDDDDO..........
  .OONNNNNNNNNNNNNNNNNO..........
  ..OWWWWWWWWWWWWWWWWWO..........
  ...OWWWWWWWWWWWWWWWO...........
  ....OODDOddOOddODDO............
  ......ODDdO..OdDDO.............
  ......OdDDO..ODDdO.............
  .....ONNODDOODDONNO............
  ......OOONNONNO.OO.............
  .........OO.OO.................
`);

export const GAZELLE_FRAMES: readonly string[][] = [GAZELLE_RUN_A, GAZELLE_RUN_B];

// Gazelle cosmetics, drawn over either gallop frame (the body does not move).
const RACE_BIB = art(`
  WWNWW
  WWNWW
`);

const MEDAL = art(`
  .RR.
  .RR.
  .YY.
  .Yy.
`);

/** One gallop frame (0 or 1) with the unlocked cosmetics on. */
export function gazelleRows(
  frame: number,
  cosmetics: readonly string[] = [],
): string[] {
  let rows = GAZELLE_FRAMES[frame % GAZELLE_FRAMES.length];
  if (cosmetics.includes('race-bib')) {
    rows = overlay(rows, RACE_BIB, 8, 18);
  }
  if (cosmetics.includes('medal')) {
    rows = overlay(rows, MEDAL, 16, 15);
  }
  return rows;
}

// Swimming mode pet, 38 x 20. Two frames: tail up, tail down.
const DOLPHIN_SWIM_A = art(`
  .............O........................
  ..OO........OaOO......................
  .OaaO.......OaaaO.......OOOOO.........
  ..OaaO......OaaaaOOO..OOAAAAAOO.......
  ...OaaOOO...OaaaaaAAOOAAAAAAAAAO......
  ....OaaAAOOOOaaaaaaAOAAAAAAAAAAAO.....
  ...OaaAAAAAAAaaAAAAAAAAAAAAAAAAAAO....
  ....OaOAAAAAAAAAAAAAAAAAAAAEXAAAAAO...
  ...OaaOAAAAAAAAAAAAAAAAAAAAEEAAAAAO...
  ..OaaO.OAAAAAAAAAAAAAAAAAAAAAAAAAAAOO.
  .OaaO...OAAAAAAAAAAAAAAAAAPPAAAOAAAAAO
  ..OO.....OAAiiiiiiiiiiiiiiiiiiiAOOOOO.
  ..........OiiiiiiiiiiiiiiiiiiiiiiOOO..
  ..........OiiiiiiiiiiiiiiiiiiiiiO.....
  ...........OOOiiiiiaaaiiiiiiiiiO......
  ..............OOOOaaaOOOiiiiiOO.......
  ................OaaaO...OOOOO.........
  ...............OaaaO..................
  ...............OaaO...................
  ................OO....................
`);

const DOLPHIN_SWIM_B = art(`
  .............O........................
  ............OaOO......................
  ............OaaaO.......OOOOO.........
  ............OaaaaOOO..OOAAAAAOO.......
  ............OaaaaaAAOOAAAAAAAAAO......
  ............OaaaaaaAOAAAAAAAAAAAO.....
  ...........OAaaAAAAAAAAAAAAAAAAAAO....
  ..........OAAAAAAAAAAAAAAAAEXAAAAAO...
  ..........OAAAAAAAAAAAAAAAAEEAAAAAO...
  ..OO.....OAAAAAAAAAAAAAAAAAAAAAAAAAOO.
  .OaaO....OAAAAAAAAAAAAAAAAPPAAAOAAAAAO
  ..OaaO..OAAAiiiiiiiiiiiiiiiiiiiAOOOOO.
  ...OaaOOiiiiiiiiiiiiiiiiiiiiiiiiiOOO..
  ....OaaOiiiiiiiiiiiiiiiiiiiiiiiiO.....
  ...OaaOAiiiOOOiiiiiaaaiiiiiiiiiO......
  ....OaOAiOO...OOOOaaaOOOiiiiiOO.......
  ...OaaOOO.......OaaaO...OOOOO.........
  ..OaaO.........OaaaO..................
  .OaaO..........OaaO...................
  ..OO............OO....................
`);

export const DOLPHIN_FRAMES: readonly string[][] = [DOLPHIN_SWIM_A, DOLPHIN_SWIM_B];

// Dolphin cosmetics, drawn over either frame (only the tail moves).
const SWIM_CAP = art(`
  ...OOOOO...
  ..ORRRRRO..
  .ORRWWRRRO.
  ORRRRRRRRRO
`);

const GOGGLES = art(`
  ....YYYY
  OOOOY..Y
  ....Y..Y
  ....YYYY
`);

/** One swim frame (0 or 1) with the unlocked cosmetics on. */
export function dolphinRows(
  frame: number,
  cosmetics: readonly string[] = [],
): string[] {
  let rows = DOLPHIN_FRAMES[frame % DOLPHIN_FRAMES.length];
  if (cosmetics.includes('swim-cap')) {
    rows = overlay(rows, SWIM_CAP, 21, 0);
  }
  if (cosmetics.includes('goggles')) {
    rows = overlay(rows, GOGGLES, 22, 6);
  }
  return rows;
}

// Warning sign for safety notes, 17 x 16 (bottom row is its shadow).
export const WARNING_SIGN = art(`
  ........O........
  .......OYO.......
  .......OYO.......
  ......OYYYO......
  ......OYYYO......
  .....OYYOYYO.....
  .....OYYOYYO.....
  ....OYYYOYYYO....
  ....OYYYOYYYO....
  ...OYYYYYYYYYO...
  ...OYYYYOYYYYO...
  ..OYYYYYYYYYYYO..
  ..OyyyyyyyyyyyO..
  .OyyyyyyyyyyyyyO.
  OOOOOOOOOOOOOOOOO
  .ZZZZZZZZZZZZZZZ.
`);
