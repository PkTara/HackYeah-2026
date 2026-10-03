import {
  ageLabel,
  markedSpots,
  type Finger,
  type HandFlag,
  type Movement,
  type Side,
  type Spot,
  type SpotLayer,
  type Terrain,
} from '@hackyeah/core';
import type { IconName } from '@hackyeah/ui';

export const TERRAIN_NAME: Record<Terrain, string> = {
  slab: 'Slab',
  vertical: 'Vertical',
  overhang: 'Overhang',
};

export const TERRAIN_ICON: Record<Terrain, IconName> = {
  slab: 'slab',
  vertical: 'vertical',
  overhang: 'overhang',
};

export const MOVEMENT_NAME: Record<Movement, string> = {
  controlled: 'Controlled',
  dynamic: 'Dynamic',
};

export const SIDE_NAME: Record<Side, string> = { left: 'Left', right: 'Right' };

export const FINGER_NAME: Record<Finger, string> = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  little: 'Little',
};

/** "Right ring finger", or "Left thumb". */
export function fingerLabel(side: Side, finger: Finger): string {
  const name = FINGER_NAME[finger].toLowerCase();
  return `${SIDE_NAME[side]} ${finger === 'thumb' ? name : `${name} finger`}`;
}

export const SPOT_LAYER_NAME: Record<SpotLayer, string> = {
  segments: 'Segments',
  pulleys: 'Pulleys',
  tendon: 'Tendon',
};

/** How a sentence names a spot: "A2 pulley", "middle joint". */
function spotWords(spot: Spot): string {
  // Both tendon spots are called "Flexor tendon"; their place tells them apart.
  const words =
    spot.layer === 'tendon' ? `${spot.name} ${spot.detail}` : spot.name;
  // Lower case inside a sentence, but keep codes like "A2" as they are.
  return /^[A-Z][a-z]/.test(words)
    ? words[0].toLowerCase() + words.slice(1)
    : words;
}

/** "middle joint, A2 pulley", or "not sure where" when no spot is marked. */
export function spotsText(finger: Finger, spots: readonly string[]): string {
  const marked = markedSpots(finger, spots);
  return marked.length > 0
    ? marked.map(spotWords).join(', ')
    : 'not sure where';
}

/** "Right ring finger: middle joint, A2 pulley. Flagged today." */
export function flagText(flag: HandFlag, today: string): string {
  const where = spotsText(flag.finger, flag.spots);
  const when = ageLabel(flag.date, today);
  return `${fingerLabel(flag.side, flag.finger)}: ${where}. Flagged ${when}.`;
}

export const GRADES = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'] as const;
