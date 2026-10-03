/**
 * Where a finger hurts, for the finger close-up on the Hands tab.
 *
 * Spots name places on the palm side of a finger. They record where it
 * hurts, never what is wrong: the app does not diagnose. Ids are saved and
 * sent to the server, so keep them stable.
 */
import type { Finger } from './game';

/** The three views of the finger close-up. */
export type SpotLayer = 'segments' | 'pulleys' | 'tendon';
export const SPOT_LAYERS: readonly SpotLayer[] = [
  'segments',
  'pulleys',
  'tendon',
];

/**
 * Parts of a finger from the tip down into the palm. Each spot lies on one
 * part or a run of parts, which is how the close-up drawing places it. A
 * thumb has one segment fewer, so it has no 'middle' or 'middleJoint'.
 */
export type FingerPart =
  | 'tip'
  | 'endJoint'
  | 'middle'
  | 'middleJoint'
  | 'base'
  | 'knuckle'
  | 'palm';

export type Spot = Readonly<{
  id: string;
  layer: SpotLayer;
  /** Short name, the title of its row: "A2 pulley". */
  name: string;
  /** Plain words under the name: "base segment". */
  detail: string;
  /** The part it lies on, or the first part of a longer spot. */
  at: FingerPart;
  /** The last part, for spots longer than one part. */
  to?: FingerPart;
}>;

// One spot per line reads as a table, so prettier leaves these two alone.
// prettier-ignore
const FINGER_SPOTS: readonly Spot[] = [
  // The bones and the joints between them, from the tip down.
  { id: 'distal', layer: 'segments', name: 'Fingertip', detail: 'distal phalanx', at: 'tip' },
  { id: 'dip', layer: 'segments', name: 'End joint', detail: 'DIP joint', at: 'endJoint' },
  { id: 'middle', layer: 'segments', name: 'Middle segment', detail: 'middle phalanx', at: 'middle' },
  { id: 'pip', layer: 'segments', name: 'Middle joint', detail: 'PIP joint', at: 'middleJoint' },
  { id: 'proximal', layer: 'segments', name: 'Base segment', detail: 'proximal phalanx', at: 'base' },
  { id: 'mcp', layer: 'segments', name: 'Knuckle', detail: 'MCP joint', at: 'knuckle' },
  // The rings that hold the tendon against the bone.
  { id: 'a1', layer: 'pulleys', name: 'A1 pulley', detail: 'at the knuckle', at: 'knuckle' },
  { id: 'a2', layer: 'pulleys', name: 'A2 pulley', detail: 'base segment', at: 'base' },
  { id: 'a3', layer: 'pulleys', name: 'A3 pulley', detail: 'at the middle joint', at: 'middleJoint' },
  { id: 'a4', layer: 'pulleys', name: 'A4 pulley', detail: 'middle segment', at: 'middle' },
  { id: 'a5', layer: 'pulleys', name: 'A5 pulley', detail: 'at the end joint', at: 'endJoint' },
  // The tendon that bends the finger.
  { id: 'flexor-finger', layer: 'tendon', name: 'Flexor tendon', detail: 'in the finger', at: 'tip', to: 'knuckle' },
  { id: 'flexor-palm', layer: 'tendon', name: 'Flexor tendon', detail: 'in the palm', at: 'palm' },
];

// prettier-ignore
const THUMB_SPOTS: readonly Spot[] = [
  { id: 'distal', layer: 'segments', name: 'Tip', detail: 'distal phalanx', at: 'tip' },
  { id: 'ip', layer: 'segments', name: 'End joint', detail: 'IP joint', at: 'endJoint' },
  { id: 'proximal', layer: 'segments', name: 'Base segment', detail: 'proximal phalanx', at: 'base' },
  { id: 'mcp', layer: 'segments', name: 'Knuckle', detail: 'MCP joint', at: 'knuckle' },
  { id: 'a1', layer: 'pulleys', name: 'A1 pulley', detail: 'at the knuckle', at: 'knuckle' },
  { id: 'oblique', layer: 'pulleys', name: 'Oblique pulley', detail: 'base segment', at: 'base' },
  { id: 'a2', layer: 'pulleys', name: 'A2 pulley', detail: 'at the end joint', at: 'endJoint' },
  { id: 'fpl', layer: 'tendon', name: 'Flexor tendon', detail: 'along the thumb (FPL)', at: 'tip', to: 'palm' },
];

/** Every spot on this finger, layer by layer, in the order text lists them. */
export function spotsFor(finger: Finger): readonly Spot[] {
  return finger === 'thumb' ? THUMB_SPOTS : FINGER_SPOTS;
}

/** The spots with these ids, in list order. Unknown ids and repeats drop out. */
export function markedSpots(finger: Finger, ids: readonly string[]): Spot[] {
  return spotsFor(finger).filter(spot => ids.includes(spot.id));
}
