/**
 * How each sport mode looks and talks: names, icons and copy for the generic
 * sport screens in screens/sport/. The rules live in core's sports/; this
 * file is only words and pictures, so adding a sport means one entry here
 * and one definition there.
 */
import {
  ageLabel,
  type BodyFlag,
  type Side,
  type SportId,
} from '@hackyeah/core';
import type { IconName } from '@hackyeah/ui';
import { SIDE_NAME } from './labels';

export type SportView = Readonly<{
  /** Hero and rail title. */
  title: string;
  /** Lower case pet name for sentences: "the gazelle". */
  pet: string;
  /** The hero's world, which also picks the app palette. */
  world: 'savanna' | 'ocean';
  /** One session, lower case: "run", "swim". */
  session: string;
  /** Several sessions: "runs", "swims". */
  sessions: string;
  /** Pets panel caption: "Running". */
  activity: string;
  /** Names of the sport's three kinds, used on the triangle and chips. */
  kindName: Readonly<Record<string, string>>;
  kindIcon: Readonly<Record<string, IconName>>;
  /** One line on what each kind means, for the log form. */
  kindHint: Readonly<Record<string, string>>;
  /** "Run type", "Stroke". */
  kindLabel: string;
  /** "run types", "strokes": for "the lowest of the three ...". */
  kindPlural: string;
  placeName: Readonly<Record<string, string>>;
  placeIcon: Readonly<Record<string, IconName>>;
  /** "Ground", "Water". */
  placeLabel: string;
  bodyPartName: Readonly<Record<string, string>>;
  /** Tab and page title for sore spots: "Legs", "Body". */
  bodyTab: string;
  bodyIcon: IconName;
  /** Distances offered on the log form, in the sport's unit. */
  distances: readonly number[];
  minutes: readonly number[];
  /** "km", "m". */
  unit: string;
  questIcon: IconName;
  /** Under the focus: what the profile is not. */
  notA: string;
  logSubtitle: string;
  /** The level-up banner when nothing new was unlocked. */
  levelUp: string;
  /** What loads the flagged spot: "Running loads your legs." */
  loadNote: string;
}>;

export const SPORT_VIEWS: Readonly<Record<SportId, SportView>> = {
  run: {
    title: 'Running\nGazelle',
    pet: 'gazelle',
    world: 'savanna',
    session: 'run',
    sessions: 'runs',
    activity: 'Running',
    kindName: { easy: 'Easy', tempo: 'Tempo', long: 'Long' },
    kindIcon: { easy: 'easy', tempo: 'tempo', long: 'long' },
    kindHint: {
      easy: 'Relaxed, you could chat the whole way.',
      tempo: 'Steady-hard, a few words at a time.',
      long: 'Your longest run of the week, at an easy pace.',
    },
    kindLabel: 'Run type',
    kindPlural: 'run types',
    placeName: { road: 'Road', trail: 'Trail', track: 'Track' },
    placeIcon: { road: 'road', trail: 'trail', track: 'track' },
    placeLabel: 'Ground',
    bodyPartName: {
      hip: 'Hip',
      knee: 'Knee',
      shin: 'Shin',
      calf: 'Calf',
      ankle: 'Ankle',
      foot: 'Foot',
    },
    bodyTab: 'Legs',
    bodyIcon: 'shoe',
    distances: [3, 5, 8, 10, 12, 15, 18, 21.1, 25],
    minutes: [15, 20, 30, 40, 50, 60, 75, 90, 120],
    unit: 'km',
    questIcon: 'shoe',
    notA: 'Not a race time prediction.',
    logSubtitle: 'Tap it in while you cool down.',
    levelUp:
      'Your gazelle crossed the finish line onto a new stretch of savanna.',
    loadNote: 'Running loads your legs.',
  },
  swim: {
    title: 'Swimming\nDolphin',
    pet: 'dolphin',
    world: 'ocean',
    session: 'swim',
    sessions: 'swims',
    activity: 'Swimming',
    kindName: { free: 'Free', breast: 'Breast', back: 'Back' },
    kindIcon: { free: 'free', breast: 'breast', back: 'back' },
    kindHint: {
      free: 'Freestyle, also called front crawl.',
      breast: 'Breaststroke, head up or down.',
      back: 'Backstroke, on your back.',
    },
    kindLabel: 'Stroke',
    kindPlural: 'strokes',
    placeName: { pool: 'Pool', lake: 'Lake', sea: 'Sea' },
    placeIcon: { pool: 'pool', lake: 'lake', sea: 'sea' },
    placeLabel: 'Water',
    bodyPartName: {
      shoulder: 'Shoulder',
      elbow: 'Elbow',
      wrist: 'Wrist',
      hip: 'Hip',
      knee: 'Knee',
      ankle: 'Ankle',
    },
    bodyTab: 'Body',
    bodyIcon: 'flag',
    distances: [200, 400, 600, 800, 1000, 1500, 2000, 3000, 4000],
    minutes: [10, 15, 20, 25, 30, 40, 50, 60, 90],
    unit: 'm',
    questIcon: 'goggles',
    notA: 'Not a race time prediction.',
    logSubtitle: 'Tap it in before you dry off.',
    levelUp: 'Your dolphin reached the island and swam out into open water.',
    loadNote: 'Swimming loads your shoulders and knees.',
  },
};

/** "5 km easy", "1000 m back" */
export function sessionName(
  view: SportView,
  log: Readonly<{ distance: number; kind: string }>,
): string {
  return `${log.distance} ${view.unit} ${view.kindName[
    log.kind
  ].toLowerCase()}`;
}

/** "Left knee" */
export function flagLabel(view: SportView, side: Side, part: string): string {
  return `${SIDE_NAME[side]} ${view.bodyPartName[part].toLowerCase()}`;
}

/** "Left knee. Flagged yesterday." */
export function bodyFlagText(
  view: SportView,
  flag: BodyFlag,
  today: string,
): string {
  return `${flagLabel(view, flag.side, flag.part)}. Flagged ${ageLabel(
    flag.date,
    today,
  )}.`;
}
