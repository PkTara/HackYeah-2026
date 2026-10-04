/**
 * The gazelle's quest library and the rule for picking one. Mirrors
 * quests.ts: one quest at a time, for the current focus, paused while a leg
 * is flagged if it means running.
 *
 * Quest text is draft content for the prototype. Practice quests need a coach
 * to review them before release.
 */
import type { RunFocus, RunType } from './running';

export type RunQuestKind = 'log' | 'practice' | 'plan' | 'checkin';

export type RunQuest = Readonly<{
  id: string;
  kind: RunQuestKind;
  /** Which focus run type it serves. Undefined means any. */
  runType?: RunType;
  title: string;
  /** What to do, in one or two sentences. */
  task: string;
  /** Why it fits the current focus. */
  why: string;
  minutes: number;
  equipment: string;
  /** Means running. Paused while a leg is flagged. */
  loadsLegs: boolean;
  /** Only offered while a leg is flagged. */
  needsFlag?: boolean;
}>;

function logQuest(type: RunType): RunQuest {
  return {
    id: `run-log-${type}`,
    kind: 'log',
    runType: type,
    title: `Scout ${type} runs`,
    task: `Log 3 ${type} runs this week, finished or not.`,
    why: `You have fewer than 3 ${type} runs logged, so there is nothing to compare yet.`,
    minutes: 30,
    equipment: 'Running shoes',
    loadsLegs: true,
  };
}

export const RUN_QUESTS: readonly RunQuest[] = [
  logQuest('easy'),
  logQuest('tempo'),
  logQuest('long'),
  {
    id: 'easy-talk-test',
    kind: 'practice',
    runType: 'easy',
    title: 'Talk test',
    task: 'Run 20 minutes slow enough to say a full sentence the whole way.',
    why: 'Easy is your lowest finish rate. A slower easy run is easier to finish.',
    minutes: 20,
    equipment: 'Running shoes',
    loadsLegs: true,
  },
  {
    id: 'easy-loop',
    kind: 'plan',
    runType: 'easy',
    title: 'Plan the loop',
    task: 'Find a flat loop near home of about 3 km with no busy crossings.',
    why: 'A known, flat loop takes the guesswork out of easy days. You can plan it on a rest day.',
    minutes: 5,
    equipment: 'Map app',
    loadsLegs: false,
  },
  {
    id: 'tempo-even-splits',
    kind: 'practice',
    runType: 'tempo',
    title: 'Even splits',
    task: 'Warm up 10 minutes, then run 2 x 5 minutes steady-hard with 2 minutes walking between.',
    why: 'Tempo is your lowest finish rate. Short blocks are easier to finish as planned.',
    minutes: 25,
    equipment: 'Running shoes, watch',
    loadsLegs: true,
  },
  {
    id: 'tempo-marker',
    kind: 'plan',
    runType: 'tempo',
    title: 'Pick a marker',
    task: 'Choose a landmark about 1 km from home to turn around at on tempo days.',
    why: 'A fixed turn-around point stops tempo runs growing longer than planned.',
    minutes: 5,
    equipment: 'None',
    loadsLegs: false,
  },
  {
    id: 'long-walk-breaks',
    kind: 'practice',
    runType: 'long',
    title: 'Walk breaks',
    task: 'On your next long run, walk for 1 minute every 10 minutes from the start.',
    why: 'Long is your lowest finish rate. Planned walk breaks make the distance easier to finish.',
    minutes: 50,
    equipment: 'Running shoes, water',
    loadsLegs: true,
  },
  {
    id: 'long-water',
    kind: 'plan',
    runType: 'long',
    title: 'Water stop',
    task: 'Plan your next long route so it passes a water fountain or home halfway.',
    why: 'Running out of water is a common reason to cut a long run short.',
    minutes: 5,
    equipment: 'Map app',
    loadsLegs: false,
  },
  {
    id: 'leg-checkin',
    kind: 'checkin',
    title: 'Leg check-in',
    task: 'Rate how your flagged spot feels from 0 to 10 when walking and write one line about it.',
    why: 'A quick note now makes it easier to see if it is getting better.',
    minutes: 2,
    equipment: 'None',
    loadsLegs: false,
    needsFlag: true,
  },
];

export type RunQuestPick = Readonly<{
  /** The quest to show, or null when nothing is left to do. */
  quest: RunQuest | null;
  /** Quests that fit the focus but wait until the flagged leg is cleared. */
  paused: readonly RunQuest[];
  /** Every quest that could be offered right now, in order. */
  options: readonly RunQuest[];
}>;

/**
 * Picks the quest the gazelle offers. Completed quests are left out, skipped
 * ones go to the back, and running quests are paused while a leg is flagged.
 */
export function pickRunQuest(
  focus: RunFocus,
  opts: Readonly<{
    hasFlag: boolean;
    completed: readonly string[];
    skipped: readonly string[];
  }>,
): RunQuestPick {
  const fitsFocus = (q: RunQuest) =>
    focus.kind === 'explore'
      ? q.kind === 'log' && q.runType === focus.type
      : q.kind !== 'log' &&
        (q.runType === undefined || q.runType === focus.type);

  const candidates = RUN_QUESTS.filter(
    q =>
      fitsFocus(q) &&
      !opts.completed.includes(q.id) &&
      (!q.needsFlag || opts.hasFlag),
  );
  const paused = opts.hasFlag ? candidates.filter(q => q.loadsLegs) : [];
  const eligible = candidates.filter(q => !paused.includes(q));
  const skipRank = (q: RunQuest) => opts.skipped.indexOf(q.id);
  const options = [...eligible]
    .sort((a, b) => Number(Boolean(b.needsFlag)) - Number(Boolean(a.needsFlag)))
    .sort((a, b) => skipRank(a) - skipRank(b));

  return { quest: options[0] ?? null, paused, options };
}
