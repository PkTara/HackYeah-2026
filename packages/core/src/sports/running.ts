/**
 * Gazelle mode: running. Easy, tempo and long runs on road, trail or track,
 * distances in kilometres. Quest text is draft content for the prototype;
 * practice quests need a coach to review them before release.
 */
import { GAZELLE_COSMETICS } from '../progress';
import { clock, sampleSessions, type Sport, type SportQuest } from '../sport';

function logQuest(type: string): SportQuest {
  return {
    id: `run-log-${type}`,
    kind: 'log',
    sessionKind: type,
    title: `Scout ${type} runs`,
    task: `Log 3 ${type} runs this week, finished or not.`,
    why: `You have fewer than 3 ${type} runs logged, so there is nothing to compare yet.`,
    minutes: 30,
    equipment: 'Running shoes',
    loadsBody: true,
  };
}

const QUESTS: readonly SportQuest[] = [
  logQuest('easy'),
  logQuest('tempo'),
  logQuest('long'),
  {
    id: 'easy-talk-test',
    kind: 'practice',
    sessionKind: 'easy',
    title: 'Talk test',
    task: 'Run 20 minutes slow enough to say a full sentence the whole way.',
    why: 'Easy is your lowest finish rate. A slower easy run is easier to finish.',
    minutes: 20,
    equipment: 'Running shoes',
    loadsBody: true,
  },
  {
    id: 'easy-loop',
    kind: 'plan',
    sessionKind: 'easy',
    title: 'Plan the loop',
    task: 'Find a flat loop near home of about 3 km with no busy crossings.',
    why: 'A known, flat loop takes the guesswork out of easy days. You can plan it on a rest day.',
    minutes: 5,
    equipment: 'Map app',
    loadsBody: false,
  },
  {
    id: 'tempo-even-splits',
    kind: 'practice',
    sessionKind: 'tempo',
    title: 'Even splits',
    task: 'Warm up 10 minutes, then run 2 x 5 minutes steady-hard with 2 minutes walking between.',
    why: 'Tempo is your lowest finish rate. Short blocks are easier to finish as planned.',
    minutes: 25,
    equipment: 'Running shoes, watch',
    loadsBody: true,
  },
  {
    id: 'tempo-marker',
    kind: 'plan',
    sessionKind: 'tempo',
    title: 'Pick a marker',
    task: 'Choose a landmark about 1 km from home to turn around at on tempo days.',
    why: 'A fixed turn-around point stops tempo runs growing longer than planned.',
    minutes: 5,
    equipment: 'None',
    loadsBody: false,
  },
  {
    id: 'long-walk-breaks',
    kind: 'practice',
    sessionKind: 'long',
    title: 'Walk breaks',
    task: 'On your next long run, walk for 1 minute every 10 minutes from the start.',
    why: 'Long is your lowest finish rate. Planned walk breaks make the distance easier to finish.',
    minutes: 50,
    equipment: 'Running shoes, water',
    loadsBody: true,
  },
  {
    id: 'long-water',
    kind: 'plan',
    sessionKind: 'long',
    title: 'Water stop',
    task: 'Plan your next long route so it passes a water fountain or home halfway.',
    why: 'Running out of water is a common reason to cut a long run short.',
    minutes: 5,
    equipment: 'Map app',
    loadsBody: false,
  },
  {
    id: 'leg-checkin',
    kind: 'checkin',
    title: 'Leg check-in',
    task: 'Rate how your flagged spot feels from 0 to 10 when walking and write one line about it.',
    why: 'A quick note now makes it easier to see if it is getting better.',
    minutes: 2,
    equipment: 'None',
    loadsBody: false,
    needsFlag: true,
  },
];

// Demo data: two weeks of made-up running.
const rows: (readonly [string, string, string, number, number, boolean])[] = [
  ['2026-09-20', 'easy', 'road', 5, 31, true],
  ['2026-09-21', 'tempo', 'track', 6, 32, false],
  ['2026-09-22', 'long', 'trail', 12, 78, true],
  ['2026-09-24', 'easy', 'road', 4.5, 28, true],
  ['2026-09-25', 'tempo', 'road', 6, 31, true],
  ['2026-09-27', 'long', 'road', 14, 92, false],
  ['2026-09-28', 'easy', 'trail', 6, 40, false],
  ['2026-09-29', 'tempo', 'track', 7, 37, false],
  ['2026-09-30', 'easy', 'road', 5, 30, true],
  ['2026-10-01', 'tempo', 'road', 6.5, 34, true],
  ['2026-10-02', 'long', 'trail', 15, 101, true],
  ['2026-10-02', 'easy', 'road', 3, 19, true],
];

export const RUNNING: Sport = {
  id: 'run',
  pet: 'gazelle',
  kinds: ['easy', 'tempo', 'long'],
  places: ['road', 'trail', 'track'],
  bodyParts: ['hip', 'knee', 'shin', 'calf', 'ankle', 'foot'],
  unit: 'km',
  quests: QUESTS,
  unlocks: GAZELLE_COSMETICS,
  // 20 XP to start, three quests from level 2.
  sample: {
    version: 1,
    logs: sampleSessions('sample-run', rows),
    flags: [],
    completed: ['sample-run-first-log', 'sample-run-shoes'],
    skipped: [],
  },
  pace: (km, minutes) =>
    km > 0 && minutes > 0 ? `${clock((minutes * 60) / km)} /km` : null,
};
