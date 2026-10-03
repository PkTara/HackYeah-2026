import type { Finger, Movement, Side, Terrain } from '@hackyeah/core';
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

export const GRADES = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'] as const;
