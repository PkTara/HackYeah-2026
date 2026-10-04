/**
 * The words after a save: what was saved and what it changed. Pure, so the
 * screens stay thin and each message is tested on its own. The rules that
 * produce the numbers live in core; this only says them plainly.
 */
import {
  BASELINE_TESTS,
  MIN_LOGS,
  MIN_SESSIONS,
  ageLabel,
  formatResult,
  terrainTallies,
  type BaselineResult,
  type BaselineTest,
  type ClimbLog,
  type Focus,
  type SessionTally,
  type SportFocus,
} from '@hackyeah/core';
import { TERRAIN_NAME } from './labels';

export type SaveMessage = Readonly<{ title: string; lines: readonly string[] }>;

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * After logging a climb: the wall's new tally and whether the focus moved.
 * `logs` already include the new climb.
 */
export function climbSaved(
  log: Pick<ClimbLog, 'terrain' | 'grade' | 'sent'>,
  logs: readonly ClimbLog[],
  before: Focus,
  after: Focus,
): SaveMessage {
  const wall = TERRAIN_NAME[log.terrain];
  const t = terrainTallies(logs)[log.terrain];
  const tally =
    t.logged < MIN_LOGS
      ? `${wall}: ${t.sent} of ${t.logged} sent. ${plural(
          MIN_LOGS - t.logged,
          'more climb',
          'more climbs',
        )} here and the monkey can compare it.`
      : `${wall}: ${t.sent} of ${t.logged} sent.`;
  const focus =
    before.terrain === after.terrain
      ? `Your focus stays ${TERRAIN_NAME[after.terrain].toLowerCase()}.`
      : `Your focus moved to ${TERRAIN_NAME[after.terrain].toLowerCase()}.`;
  return {
    title: `Saved ${log.grade} ${wall.toLowerCase()}, ${
      log.sent ? 'sent' : 'not yet'
    }`,
    lines: [tally, focus],
  };
}

/** After a home test: the result, against the last one when there is one. */
export function homeTestSaved(
  test: Pick<BaselineTest, 'name' | 'unit'>,
  result: Pick<BaselineResult, 'value'>,
  previous: Pick<BaselineResult, 'value' | 'date'> | undefined,
  today: string,
): SaveMessage {
  const value = formatResult(test.unit, result.value);
  return {
    title: `Saved ${value}`,
    lines: [
      previous
        ? `Last time ${formatResult(test.unit, previous.value)}, ${ageLabel(
            previous.date,
            today,
          )}. Shown on Data.`
        : `Your first ${test.name.toLowerCase()} result. Redo it in a few weeks to compare.`,
    ],
  };
}

/**
 * The next home test to suggest after a save: the first one in setup order
 * with no result yet, other than the one just done. Undefined when all six
 * have a result.
 */
export function nextHomeTest(
  results: readonly Pick<BaselineResult, 'testId'>[],
  current?: string,
): BaselineTest | undefined {
  return BASELINE_TESTS.find(
    t => t.id !== current && !results.some(r => r.testId === t.id),
  );
}

/** After saving reach: the ape index, said without judging it. */
export function reachSaved(armSpanCm: number, heightCm: number): SaveMessage {
  const ape = armSpanCm - heightCm;
  return {
    title: 'Saved reach',
    lines: [
      `Ape index ${ape > 0 ? '+' : ''}${ape} cm. It describes your reach and is never scored as a weakness.`,
    ],
  };
}

/**
 * After logging a run or a swim: the kind's new tally and whether the
 * focus moved. `kindTally` already counts the new session.
 */
export function sessionSaved(
  name: string,
  finished: boolean,
  kindName: string,
  kindTally: SessionTally,
  before: SportFocus,
  after: SportFocus,
  names: Readonly<Record<string, string>>,
  pet: string,
): SaveMessage {
  const tally =
    kindTally.logged < MIN_SESSIONS
      ? `${kindName}: ${kindTally.finished} of ${
          kindTally.logged
        } finished. ${
          MIN_SESSIONS - kindTally.logged
        } more and the ${pet} can compare it.`
      : `${kindName}: ${kindTally.finished} of ${kindTally.logged} finished.`;
  const focus =
    before.sessionKind === after.sessionKind
      ? `Your focus stays ${names[after.sessionKind].toLowerCase()}.`
      : `Your focus moved to ${names[after.sessionKind].toLowerCase()}.`;
  return {
    title: `Saved ${name}, ${finished ? 'finished' : 'cut short'}`,
    lines: [tally, focus],
  };
}
