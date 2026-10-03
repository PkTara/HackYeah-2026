/**
 * Hand anatomy for the anatomy viewer: the bones, muscles and tendons of
 * one hand seen from the palm side, in plain words.
 *
 * This is general anatomy for learning. Each part says what it is and why
 * it matters for climbing. It never says what is wrong with anyone's hand.
 *
 * Ids are stable. A part that the finger close-up also shows (spots.ts)
 * carries that spot id, and its own id is `${finger}-${spot}`: 'ring-a2'
 * is spot 'a2' on the ring finger. The flexor tendon in the finger is one
 * spot there but two tendons here (FDP and FDS), so both carry its spot.
 *
 * Sources: Gray's Anatomy (42nd ed., 2020), wrist and hand chapters;
 * Netter, Atlas of Human Anatomy; Moore, Clinically Oriented Anatomy.
 * Pulleys: Doyle 1988 (finger sheath and pulleys, J Hand Surg Am) and
 * Doyle and Blythe 1977 (thumb pulleys). Climbing relevance: Schweizer 2001
 * (crimp grip biomechanics), Vigouroux et al. 2006 (tendon and pulley
 * forces in climbing grips), Schoeffl et al. 2003 (pulley injuries in rock
 * climbers), Schweizer 2003 (lumbricals in climbers).
 */
import type { Finger } from './game';
import type { FingerPart } from './spots';

/** The three views of the anatomy viewer, from the inside out. */
export type AnatomyLayer = 'skeleton' | 'muscle' | 'tendon';
export const ANATOMY_LAYERS: readonly AnatomyLayer[] = [
  'skeleton',
  'muscle',
  'tendon',
];

export const ANATOMY_LAYER_INFO: Readonly<
  Record<AnatomyLayer, Readonly<{ name: string; intro: string }>>
> = {
  skeleton: {
    name: 'Skeleton',
    intro:
      'Each hand has 27 bones: 8 in the wrist, 5 in the palm and 14 in the fingers. A finger has three phalanges and the thumb has two.',
  },
  muscle: {
    name: 'Muscle',
    intro:
      'Small muscles in the palm steer the thumb and fingers. The strong muscles that bend the fingers sit in the forearm.',
  },
  tendon: {
    name: 'Tendon',
    intro:
      'Two flexor tendons run into each finger. Ring-shaped pulleys, A1 to A5, hold them close to the bone.',
  },
};

/** How the list of parts is grouped: by finger, then the palm and wrist. */
export type AnatomyGroup = Finger | 'palm' | 'wrist';
export const ANATOMY_GROUPS: readonly AnatomyGroup[] = [
  'thumb',
  'index',
  'middle',
  'ring',
  'little',
  'palm',
  'wrist',
];
export const ANATOMY_GROUP_NAME: Readonly<Record<AnatomyGroup, string>> = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  little: 'Little',
  palm: 'Palm',
  wrist: 'Wrist',
};

export type AnatomyStructure = Readonly<{
  id: string;
  layer: AnatomyLayer;
  /** Anatomical name: "Proximal phalanx", "A2 pulley". */
  name: string;
  /** Everyday words for it: "Base segment". */
  plain: string;
  /** What it is, in one or two sentences. */
  what: string;
  /** Why it matters for climbing, in one general sentence. */
  climbing: string;
  /** Which list it is shown in. */
  group: AnatomyGroup;
  /** The finger it belongs to, if any. */
  finger?: Finger;
  /** Where it lies along its finger, as in spots.ts. */
  part?: FingerPart;
  /** The finger close-up's spot id for the same place, if it has one. */
  spot?: string;
}>;

type LongFinger = Exclude<Finger, 'thumb'>;
const LONG_FINGERS: readonly LongFinger[] = [
  'index',
  'middle',
  'ring',
  'little',
];

/** The fields each entry of a group of parts fills in itself. */
type Entry = Pick<AnatomyStructure, 'id' | 'name' | 'what' | 'climbing'> &
  Partial<Pick<AnatomyStructure, 'part' | 'spot' | 'plain'>>;

/** Adds the fields a group of parts shares to each of its entries. */
function withShared(
  shared: Pick<AnatomyStructure, 'layer' | 'group'> &
    Partial<Pick<AnatomyStructure, 'finger' | 'plain'>>,
  entries: readonly Entry[],
): AnatomyStructure[] {
  return entries.map(entry => ({ plain: '', ...shared, ...entry }));
}

/** "index finger", or "thumb". */
function fingerWords(finger: Finger): string {
  return finger === 'thumb' ? 'thumb' : `${finger} finger`;
}

// Skeleton ------------------------------------------------------------------

/** The parts of a finger's skeleton that are the same on all four fingers. */
function fingerBones(finger: LongFinger): AnatomyStructure[] {
  const on = { layer: 'skeleton', group: finger, finger } as const;
  return [
    {
      ...on,
      id: `${finger}-distal`,
      spot: 'distal',
      part: 'tip',
      name: 'Distal phalanx',
      plain: 'Fingertip',
      what: 'The small bone at the tip of the finger. Its flat end supports the fingertip pad and the nail.',
      climbing:
        'The deep flexor tendon (FDP) attaches to its base and pulls on it whenever you bend the fingertip onto a hold.',
    },
    {
      ...on,
      id: `${finger}-dip`,
      spot: 'dip',
      part: 'endJoint',
      name: 'DIP joint',
      plain: 'End joint',
      what: 'The joint between the middle and distal phalanges. It is a hinge that bends the fingertip.',
      climbing:
        'In a full crimp it is pushed back past straight, while in an open hand grip it bends and does more of the holding.',
    },
    {
      ...on,
      id: `${finger}-middle`,
      spot: 'middle',
      part: 'middle',
      name: 'Middle phalanx',
      plain: 'Middle segment',
      what: 'The middle of the three finger bones. The shallow flexor tendon (FDS) attaches to its sides, and the deep one (FDP) runs over it to the tip.',
      climbing:
        'The A4 pulley sits on it, one of the two pulleys that work hardest in a crimp.',
    },
    {
      ...on,
      id: `${finger}-pip`,
      spot: 'pip',
      part: 'middleJoint',
      name: 'PIP joint',
      plain: 'Middle joint',
      what: 'The joint between the proximal and middle phalanges. It is a hinge held by strong side ligaments and a thick plate on the palm side.',
      climbing:
        'Crimping bends it sharply under load, so it is one of the busiest joints in climbing.',
    },
    {
      ...on,
      id: `${finger}-proximal`,
      spot: 'proximal',
      part: 'base',
      name: 'Proximal phalanx',
      plain: 'Base segment',
      what: 'The longest finger bone, between the knuckle and the middle joint.',
      climbing:
        'The A2 pulley sits on it, and with A4 it takes the highest pulley forces when you crimp.',
    },
    {
      ...on,
      id: `${finger}-mcp`,
      spot: 'mcp',
      part: 'knuckle',
      name: 'MCP joint',
      plain: 'Knuckle',
      what: 'The joint where the finger meets the palm, between the metacarpal and the proximal phalanx. It bends and also lets the finger move sideways.',
      climbing:
        'It lets the whole finger wrap around a jug, and the A1 pulley lies over its palm side.',
    },
    { ...on, part: 'palm', ...METACARPALS[finger] },
  ];
}

const METACARPALS: Readonly<
  Record<
    LongFinger,
    Pick<AnatomyStructure, 'id' | 'name' | 'plain' | 'what' | 'climbing'>
  >
> = {
  index: {
    id: 'index-metacarpal',
    name: 'Second metacarpal',
    plain: 'Palm bone',
    what: 'The long bone in the palm behind the index finger, and the longest metacarpal. Its base is locked firmly to the wrist bones.',
    climbing:
      'With the third metacarpal it forms the stiff centre of the hand, a firm base to grip from.',
  },
  middle: {
    id: 'middle-metacarpal',
    name: 'Third metacarpal',
    plain: 'Palm bone',
    what: 'The long bone in the palm behind the middle finger. It sits on the capitate, the largest wrist bone.',
    climbing:
      "The thumb's adductor muscle starts on it, so it anchors the squeeze of a pinch.",
  },
  ring: {
    id: 'ring-metacarpal',
    name: 'Fourth metacarpal',
    plain: 'Palm bone',
    what: 'The long bone in the palm behind the ring finger. It can move a little at its base, more than the middle two.',
    climbing:
      'That small movement helps the palm cup around round holds and slopers.',
  },
  little: {
    id: 'little-metacarpal',
    name: 'Fifth metacarpal',
    plain: 'Palm bone',
    what: 'The long bone on the outer edge of the palm, behind the little finger. It moves the most of the four finger metacarpals.',
    climbing: 'It lets the outer palm curl in on slopers and wide pinches.',
  },
};

const THUMB_BONES: readonly AnatomyStructure[] = [
  {
    id: 'thumb-distal',
    layer: 'skeleton',
    group: 'thumb',
    finger: 'thumb',
    spot: 'distal',
    part: 'tip',
    name: 'Distal phalanx',
    plain: 'Thumb tip',
    what: "The bone at the tip of the thumb. The thumb's long flexor tendon (FPL) attaches to its base.",
    climbing: 'That tendon bends the thumb tip when you press it into a pinch.',
  },
  {
    id: 'thumb-ip',
    layer: 'skeleton',
    group: 'thumb',
    finger: 'thumb',
    spot: 'ip',
    part: 'endJoint',
    name: 'IP joint',
    plain: 'End joint',
    what: 'The joint between the two thumb bones. The thumb has one joint fewer than a finger because it has two phalanges, not three.',
    climbing: 'It lets the thumb tip curl over the edge of a hold.',
  },
  {
    id: 'thumb-proximal',
    layer: 'skeleton',
    group: 'thumb',
    finger: 'thumb',
    spot: 'proximal',
    part: 'base',
    name: 'Proximal phalanx',
    plain: 'Base segment',
    what: "The thumb's base bone, between its knuckle and its end joint.",
    climbing:
      'The short thumb muscles attach to its base, so the squeeze of a pinch passes through it.',
  },
  {
    id: 'thumb-mcp',
    layer: 'skeleton',
    group: 'thumb',
    finger: 'thumb',
    spot: 'mcp',
    part: 'knuckle',
    name: 'MCP joint',
    plain: 'Knuckle',
    what: "The thumb's knuckle, between the first metacarpal and the proximal phalanx.",
    climbing:
      'Strong ligaments on each side keep it steady when a pinch pushes the thumb sideways.',
  },
  {
    id: 'thumb-metacarpal',
    layer: 'skeleton',
    group: 'thumb',
    finger: 'thumb',
    part: 'palm',
    name: 'First metacarpal',
    plain: 'Palm bone of the thumb',
    what: "The thumb's metacarpal, shorter and thicker than the others. Its base sits in a saddle-shaped joint on the trapezium.",
    climbing:
      'That saddle joint lets the thumb swing across the palm to meet the fingers, which is what makes a pinch possible.',
  },
];

const WRIST_BONES = withShared(
  { layer: 'skeleton', group: 'wrist', plain: 'Wrist bone' },
  [
    {
      id: 'scaphoid',
      name: 'Scaphoid',
      what: 'A boat-shaped bone on the thumb side of the wrist. It bridges the two rows of wrist bones.',
      climbing:
        'It passes a large share of the load from the hand to the radius, for example on mantles and other moves where you push down.',
    },
    {
      id: 'lunate',
      name: 'Lunate',
      what: 'A half-moon-shaped bone in the middle of the first row. It sits in a hollow at the end of the radius.',
      climbing:
        'With the scaphoid it carries the load of the hand into the forearm when you push down on a hold.',
    },
    {
      id: 'triquetrum',
      name: 'Triquetrum',
      what: 'A pyramid-shaped bone on the little finger side of the first row.',
      climbing:
        'It sits next to the TFCC, the cartilage cushion that takes load on the little finger side of the wrist.',
    },
    {
      id: 'pisiform',
      name: 'Pisiform',
      what: 'A small pea-shaped bone on the palm side of the triquetrum. It sits inside the tendon of a wrist flexor muscle.',
      climbing:
        'It is the bump at the heel of the hand on the little finger side, where you press down when palming or mantling.',
    },
    {
      id: 'trapezium',
      name: 'Trapezium',
      what: 'The wrist bone at the base of the thumb. It forms a saddle-shaped joint with the first metacarpal.',
      climbing: 'The force of every pinch passes through this joint.',
    },
    {
      id: 'trapezoid',
      name: 'Trapezoid',
      what: "A small wedge-shaped bone between the trapezium and the capitate. The index finger's metacarpal sits on it.",
      climbing:
        'It locks the index metacarpal in place, part of the stiff centre of the hand.',
    },
    {
      id: 'capitate',
      name: 'Capitate',
      what: 'The largest wrist bone, in the middle of the second row. The third metacarpal sits on it.',
      climbing:
        'It sits at the centre of the wrist, so grip forces from the middle of the hand pass through it.',
    },
    {
      id: 'hamate',
      name: 'Hamate',
      what: 'A wedge-shaped bone on the little finger side of the second row, with a hook that points into the palm. The fourth and fifth metacarpals sit on it.',
      climbing:
        'Its hook forms one wall of the carpal tunnel and anchors the small muscles of the little finger.',
    },
  ],
);

const FOREARM_BONES: readonly AnatomyStructure[] = [
  {
    id: 'radius',
    layer: 'skeleton',
    group: 'wrist',
    name: 'Radius',
    plain: 'Forearm bone, thumb side',
    what: 'The forearm bone on the thumb side. Its wide lower end makes most of the wrist joint.',
    climbing:
      'It carries most of the load that passes from the hand into the arm.',
  },
  {
    id: 'ulna',
    layer: 'skeleton',
    group: 'wrist',
    name: 'Ulna',
    plain: 'Forearm bone, little finger side',
    what: 'The forearm bone on the little finger side. At the wrist it stops a little short of the hand, and a cartilage cushion (the TFCC) fills the gap.',
    climbing:
      'Bending the wrist towards the little finger, as on slopers and underclings, loads the cushion at its end.',
  },
];

// Muscles -------------------------------------------------------------------

const THUMB_MUSCLES = withShared(
  { layer: 'muscle', group: 'thumb', finger: 'thumb', plain: 'Thumb muscle' },
  [
    {
      id: 'abductor-pollicis-brevis',
      name: 'Abductor pollicis brevis',
      what: 'A thin muscle on the outer side of the thumb pad. It lifts the thumb away from the palm.',
      climbing:
        'It holds the thumb out wide so you can get it around big pinches.',
    },
    {
      id: 'flexor-pollicis-brevis',
      name: 'Flexor pollicis brevis',
      what: 'A short muscle in the thumb pad, beside the abductor. It bends the thumb at the knuckle.',
      climbing:
        'It adds squeeze to a pinch, working with the long thumb flexor from the forearm.',
    },
    {
      id: 'opponens-pollicis',
      part: 'palm',
      name: 'Opponens pollicis',
      what: 'A muscle under the other two in the thumb pad, attached along the first metacarpal. It turns the thumb across the palm to face the fingers.',
      climbing:
        'This turn, called opposition, is what lets the thumb press against the fingers in a pinch.',
    },
    {
      id: 'adductor-pollicis',
      name: 'Adductor pollicis',
      what: 'A fan-shaped muscle deep in the web between the thumb and the index finger. It pulls the thumb in towards the palm.',
      climbing: 'It gives much of the squeezing force in a pinch.',
    },
  ],
);

const LITTLE_FINGER_MUSCLES = withShared(
  {
    layer: 'muscle',
    group: 'little',
    finger: 'little',
    plain: 'Little finger muscle',
  },
  [
    {
      id: 'abductor-digiti-minimi',
      name: 'Abductor digiti minimi',
      what: 'The muscle along the outer edge of the palm. It spreads the little finger away from the others.',
      climbing:
        'It steadies the little finger and the edge of the hand on wide slopers and pinches.',
    },
    {
      id: 'flexor-digiti-minimi-brevis',
      name: 'Flexor digiti minimi brevis',
      what: 'A short muscle beside the abductor. It bends the little finger at the knuckle.',
      climbing:
        'It helps the little finger keep its share of the load on a hold.',
    },
    {
      id: 'opponens-digiti-minimi',
      part: 'palm',
      name: 'Opponens digiti minimi',
      what: 'A deep muscle along the fifth metacarpal. It rolls that bone towards the thumb, which cups the palm.',
      climbing:
        'Cupping the palm gives more contact on slopers and big pinches.',
    },
  ],
);

/** Where each lumbrical starts: on one deep flexor tendon, or between two. */
const LUMBRICALS: Readonly<
  Record<LongFinger, Readonly<{ name: string; from: string }>>
> = {
  index: {
    name: 'First lumbrical',
    from: "the index finger's deep flexor tendon (FDP)",
  },
  middle: {
    name: 'Second lumbrical',
    from: "the middle finger's deep flexor tendon (FDP)",
  },
  ring: {
    name: 'Third lumbrical',
    from: 'the deep flexor tendons (FDP) of the middle and ring fingers',
  },
  little: {
    name: 'Fourth lumbrical',
    from: 'the deep flexor tendons (FDP) of the ring and little fingers',
  },
};

const PALM_MUSCLES: readonly AnatomyStructure[] = [
  ...LONG_FINGERS.map(
    (finger): AnatomyStructure => ({
      id: `${finger}-lumbrical`,
      layer: 'muscle',
      group: 'palm',
      finger,
      part: 'palm',
      name: LUMBRICALS[finger].name,
      plain: `Small palm muscle, ${fingerWords(finger)}`,
      what: `A slim muscle that starts on ${LUMBRICALS[finger].from} in the palm, passes the thumb side of the knuckle and joins the tendon on the back of the finger. It bends the knuckle while it straightens the two finger joints.`,
      climbing:
        'Because it starts on the FDP tendon, it gets stretched when neighbouring fingers do very different things, as in a two-finger pocket.',
    }),
  ),
  {
    id: 'interossei',
    layer: 'muscle',
    group: 'palm',
    name: 'Interossei',
    plain: 'Small palm muscles',
    what: 'Seven small muscles that sit between the metacarpals, three on the palm side and four on the back. They spread the fingers apart, pull them together and help bend the knuckles.',
    climbing:
      'They keep each finger lined up and steady on small edges and in pockets.',
  },
];

const FOREARM_MUSCLES: readonly AnatomyStructure[] = [
  {
    id: 'forearm-flexors',
    layer: 'muscle',
    group: 'wrist',
    name: 'Forearm flexors',
    plain: 'Finger flexor muscles',
    what: 'The strong muscles that bend the fingers and thumb (FDS, FDP and FPL) sit in the forearm, not in the hand. Only their tendons cross the wrist and the palm.',
    climbing:
      'That is why hard gripping pumps your forearms rather than your hands.',
  },
];

// Tendons and pulleys -------------------------------------------------------

/** Pulleys first, so a bone's counterpart on this layer is its pulley. */
function fingerTendons(finger: LongFinger): AnatomyStructure[] {
  const on = { layer: 'tendon', group: finger, finger } as const;
  return [
    {
      ...on,
      id: `${finger}-a1`,
      spot: 'a1',
      part: 'knuckle',
      name: 'A1 pulley',
      plain: 'Ring at the knuckle',
      what: 'A ring of tough tissue over the palm side of the knuckle that holds both flexor tendons against the bone. It is the first of the five ring pulleys.',
      climbing:
        'It keeps the tendons from lifting away from the knuckle when you grip.',
    },
    {
      ...on,
      id: `${finger}-a2`,
      spot: 'a2',
      part: 'base',
      name: 'A2 pulley',
      plain: 'Ring on the base segment',
      what: 'The longest and strongest pulley, a band around the proximal phalanx that keeps both flexor tendons close to the bone.',
      climbing:
        'With A4 it takes the highest pulley forces in a crimp, which is why climbers hear the most about it.',
    },
    {
      ...on,
      id: `${finger}-a3`,
      spot: 'a3',
      part: 'middleJoint',
      name: 'A3 pulley',
      plain: 'Ring at the middle joint',
      what: 'A short, thin pulley over the palm side of the middle joint (PIP).',
      climbing:
        'It keeps the tendons close to the joint as it bends, which matters most in crimps.',
    },
    {
      ...on,
      id: `${finger}-a4`,
      spot: 'a4',
      part: 'middle',
      name: 'A4 pulley',
      plain: 'Ring on the middle segment',
      what: 'A band around the middle phalanx that keeps the deep flexor tendon (FDP) close to the bone.',
      climbing:
        'It is the other main pulley in a crimp next to A2, and it takes high forces when the fingertip pulls hard.',
    },
    {
      ...on,
      id: `${finger}-a5`,
      spot: 'a5',
      part: 'endJoint',
      name: 'A5 pulley',
      plain: 'Ring at the end joint',
      what: 'A small, thin pulley over the palm side of the end joint (DIP).',
      climbing:
        'It guides the deep flexor tendon (FDP) on the last stretch to the fingertip.',
    },
    {
      ...on,
      id: `${finger}-fdp`,
      spot: 'flexor-finger',
      part: 'tip',
      name: 'Flexor digitorum profundus (FDP)',
      plain: 'Deep flexor tendon',
      what: 'The deep flexor tendon. It runs from a forearm muscle through the palm, passes through a split in the FDS tendon and attaches to the base of the distal phalanx.',
      climbing:
        'It is the only tendon that bends the fingertip, so it works hard in every grip and most of all in open hand grips.',
    },
    {
      ...on,
      id: `${finger}-fds`,
      spot: 'flexor-finger',
      part: 'middle',
      name: 'Flexor digitorum superficialis (FDS)',
      plain: 'Shallow flexor tendon',
      what: 'The shallow flexor tendon. It runs on top of the FDP, splits in two on the proximal phalanx to let the FDP through, and attaches to both sides of the middle phalanx.',
      climbing:
        'It bends the middle joint, so it does much of the work in half crimps and full crimps.',
    },
    {
      ...on,
      id: `${finger}-flexor-palm`,
      spot: 'flexor-palm',
      part: 'palm',
      name: 'Flexor tendons in the palm',
      plain: 'Both flexor tendons',
      what: 'Here both tendons, FDS on top and FDP below, run from the carpal tunnel to the knuckle. The lumbrical muscle starts from the FDP tendon on this stretch.',
      climbing:
        'They carry the full pull of the forearm muscles to the finger on every hold.',
    },
  ];
}

const THUMB_TENDONS = withShared(
  { layer: 'tendon', group: 'thumb', finger: 'thumb' },
  [
    {
      id: 'thumb-a1',
      spot: 'a1',
      part: 'knuckle',
      name: 'A1 pulley',
      plain: 'Ring at the knuckle',
      what: "A ring of tough tissue over the palm side of the thumb's knuckle. It holds the FPL tendon against the bone.",
      climbing: 'It keeps the tendon in line as the thumb bends to grip.',
    },
    {
      id: 'thumb-oblique',
      spot: 'oblique',
      part: 'base',
      name: 'Oblique pulley',
      plain: 'Slanted band on the base segment',
      what: "The thumb's main pulley, a band that crosses the proximal phalanx at a slant.",
      climbing:
        'It does most of the work of holding the FPL tendon close to the bone in a pinch.',
    },
    {
      id: 'thumb-a2',
      spot: 'a2',
      part: 'endJoint',
      name: 'A2 pulley',
      plain: 'Ring at the end joint',
      what: "A thin pulley over the palm side of the thumb's end joint (IP).",
      climbing:
        'It guides the FPL tendon on the last stretch to the thumb tip.',
    },
    {
      id: 'thumb-fpl',
      spot: 'fpl',
      part: 'tip',
      name: 'Flexor pollicis longus (FPL)',
      plain: 'Long thumb flexor tendon',
      what: "The thumb's long flexor tendon. It runs from a forearm muscle through the carpal tunnel and along the thumb to the base of the distal phalanx.",
      climbing:
        'It bends the thumb tip, so it works hard when you pinch or press the thumb onto a hold.',
    },
  ],
);

const WRIST_TENDONS: readonly AnatomyStructure[] = [
  {
    id: 'carpal-tunnel',
    layer: 'tendon',
    group: 'wrist',
    name: 'Carpal tunnel',
    plain: 'Tunnel at the wrist',
    what: 'A tunnel at the wrist with the carpal bones as its floor and walls and a tough band, the flexor retinaculum, as its roof. Nine flexor tendons and the median nerve pass through it.',
    climbing:
      'Its roof works like a pulley for the wrist, keeping the flexor tendons close to the bones when the wrist bends.',
  },
];

/** Every part of the hand, layer by layer, in the order lists show them. */
export const ANATOMY: readonly AnatomyStructure[] = [
  ...THUMB_BONES,
  ...LONG_FINGERS.flatMap(fingerBones),
  ...WRIST_BONES,
  ...FOREARM_BONES,
  ...THUMB_MUSCLES,
  ...PALM_MUSCLES,
  ...LITTLE_FINGER_MUSCLES,
  ...FOREARM_MUSCLES,
  ...THUMB_TENDONS,
  ...LONG_FINGERS.flatMap(fingerTendons),
  ...WRIST_TENDONS,
];

const BY_ID = new Map(ANATOMY.map(s => [s.id, s]));

export function anatomyById(id: string): AnatomyStructure | undefined {
  return BY_ID.get(id);
}

/** The parts drawn on one layer, in list order. */
export function anatomyIn(layer: AnatomyLayer): AnatomyStructure[] {
  return ANATOMY.filter(s => s.layer === layer);
}

/** The groups a layer has parts in, in ANATOMY_GROUPS order. */
export function anatomyGroups(layer: AnatomyLayer): AnatomyGroup[] {
  const used = new Set(anatomyIn(layer).map(s => s.group));
  return ANATOMY_GROUPS.filter(g => used.has(g));
}

/**
 * The anatomy part for a spot of the finger close-up, e.g. ('ring', 'a2')
 * gives 'ring-a2'. The tendon spot in the finger gives the deep tendon.
 */
export function anatomyIdForSpot(
  finger: Finger,
  spot: string,
): string | undefined {
  return ANATOMY.find(s => s.finger === finger && s.spot === spot)?.id;
}

/**
 * The part on another layer at the same place of the same finger, so a
 * selection can follow the slider: the ring finger's proximal phalanx
 * becomes its A2 pulley on the tendon layer. Null when there is none.
 */
export function counterpartIn(
  layer: AnatomyLayer,
  id: string | null,
): string | null {
  const from = id === null ? undefined : anatomyById(id);
  if (!from) {
    return null;
  }
  if (from.layer === layer) {
    return from.id;
  }
  if (!from.finger || !from.part) {
    return null;
  }
  const match = ANATOMY.find(
    s => s.layer === layer && s.finger === from.finger && s.part === from.part,
  );
  return match?.id ?? null;
}
