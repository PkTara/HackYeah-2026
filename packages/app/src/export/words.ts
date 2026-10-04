/**
 * The words each mode's export uses. Climbing words come from labels.ts;
 * running and swimming words come from the sport's view in sports.ts, so a
 * new sport needs no change here.
 */
import { FINGERS, type AudienceId, type ModeWords } from '@hackyeah/core';
import type { IconName } from '@hackyeah/ui';
import { SIDE_NAME, TERRAIN_NAME, fingerLabel } from '../labels';
import type { SportView } from '../sports';

export function climbingWords(): ModeWords {
  return {
    modeName: 'Climbing',
    pet: 'monkey',
    session: 'climb',
    sessions: 'climbs',
    unit: '',
    doneWord: 'sent',
    notDoneWord: 'not sent',
    kindLabel: 'Wall',
    placeLabel: 'Place',
    kindName: TERRAIN_NAME,
    kindPlural: 'walls',
    placeName: {},
    bodyPartName: {},
    bodyTab: 'Hands',
    pausedWhat: 'quests that load the fingers',
    logHow:
      'I tapped in the wall, style, holds, grade and whether I sent it after each climb.',
    flagWhere: (side, finger) =>
      fingerLabel(
        side === 'left' ? 'left' : 'right',
        FINGERS.find(f => f === finger) ?? 'index',
      ),
  };
}

export function sportWords(view: SportView): ModeWords {
  return {
    modeName: view.activity,
    pet: view.pet,
    session: view.session,
    sessions: view.sessions,
    unit: view.unit,
    doneWord: 'finished',
    notDoneWord: 'cut short',
    kindLabel: view.kindLabel,
    kindName: view.kindName,
    kindPlural: view.kindPlural,
    placeLabel: view.placeLabel,
    placeName: view.placeName,
    bodyPartName: view.bodyPartName,
    bodyTab: view.bodyTab,
    pausedWhat: `quests that mean ${view.activity.toLowerCase()}`,
    logHow: `I tapped in the ${view.kindLabel.toLowerCase()}, ${view.placeLabel.toLowerCase()}, distance and time after each ${view.session}.`,
    flagWhere: (side, part) =>
      `${SIDE_NAME[side === 'left' ? 'left' : 'right']} ${(
        view.bodyPartName[part] ?? part
      ).toLowerCase()}`,
  };
}

/** A pixel icon for each reader. */
export const AUDIENCE_ICON: Readonly<Record<AudienceId, IconName>> = {
  doctor: 'doctor',
  physio: 'plaster',
  coach: 'whistle',
  nutrition: 'apple',
  family: 'house',
  you: 'profile',
  data: 'disk',
};
