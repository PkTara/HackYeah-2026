/**
 * Explanations for results the app itself computes on this screen layer:
 * XP and level, reach and home tests. The movement radar is explained in
 * core (explainMovementAxis), next to its rule. Same contract and
 * tone as packages/core/src/evidence.ts: records, the rule in plain words,
 * research only where a published claim is made, then one or two limits.
 */
import {
  COSMETICS,
  XP_PER_LEVEL,
  XP_PER_QUEST,
  findQuest,
  petStatus,
  shortDate,
  type BaselineTest,
  type DecisionExplanation,
  type Reach,
} from '@hackyeah/core';

export function explainXP(completed: readonly string[]): DecisionExplanation {
  const pet = petStatus(completed);
  const unique = [...new Set(completed)];
  const unlocked = COSMETICS.filter(c => pet.cosmetics.includes(c.id));
  return {
    summary: `Level ${pet.level} with ${pet.xp} XP, from ${
      unique.length === 1
        ? '1 completed quest'
        : `${unique.length} completed quests`
    }. XP is a game reward for taking part.`,
    status: 'app_rule',
    rule: [
      `Each completed quest gives ${XP_PER_QUEST} XP, once per quest: ${unique.length} x ${XP_PER_QUEST} = ${pet.xp} XP.`,
      `Every ${XP_PER_LEVEL} XP is a new level: ${pet.xp} divided by ${XP_PER_LEVEL}, rounded down, plus 1 is level ${pet.level}.`,
      `Unlocks: ${COSMETICS.map(c => `${c.name} at level ${c.level}`).join(
        ', ',
      )}. Unlocked now: ${
        unlocked.map(c => c.name).join(', ') || 'nothing yet'
      }.`,
    ].join('\n'),
    evidence:
      unique.length === 0
        ? [
            {
              id: 'completed-none',
              label: 'Completed quests',
              detail: 'No completed quests are stored in this profile.',
            },
          ]
        : unique.map(id => ({
            id,
            label: findQuest(id)?.title ?? 'Completed quest',
            detail: 'Completed. The date it was completed is not recorded.',
            view: {
              icon: 'check',
              title: findQuest(id)?.title ?? 'Completed quest',
              note: 'Date not recorded',
              outcome: { text: 'Done', done: true },
            },
          })),
    sourceIds: [],
    limitations: [
      'XP measures taking part, not climbing ability. Completing a quest does not change your wall or style counts.',
      'In the demo profile, example quests count towards XP.',
    ],
    inputSummary:
      unique.length === 1
        ? '1 completed quest.'
        : `${unique.length} completed quests.`,
    flow: {
      inputs: [
        {
          label: 'Quests done',
          value: `${unique.length}`,
          icon: 'check',
        },
      ],
      nodes: [
        {
          type: 'step',
          label: `${XP_PER_QUEST} XP per quest, once each`,
          detail: `${unique.length} x ${XP_PER_QUEST} = ${pet.xp} XP`,
          team: true,
        },
        {
          type: 'step',
          label: `New level every ${XP_PER_LEVEL} XP`,
          detail: `${pet.xp} XP is level ${pet.level}`,
          team: true,
        },
        {
          type: 'step',
          label: 'Unlock gear at set levels',
          detail: `Unlocked: ${
            unlocked.map(c => c.name).join(', ') || 'nothing yet'
          }`,
          team: true,
        },
      ],
      result: {
        label: 'Level',
        value: `${pet.level}, ${pet.xp} XP`,
        icon: 'banana',
      },
    },
  };
}

export function explainReach(reach: Reach): DecisionExplanation {
  if (reach.decision) {
    return reach.decision;
  }
  const difference = reach.armSpanCm - reach.heightCm;
  return {
    summary:
      difference === 0
        ? 'Your arm span is the same as your height.'
        : `Your arm span is ${Math.abs(difference)} cm ${
            difference > 0 ? 'longer' : 'shorter'
          } than your height.`,
    status: 'app_rule',
    rule: [
      `Arm span minus height: ${reach.armSpanCm} minus ${reach.heightCm} = ${difference} cm.`,
      'Arm span is measured fingertip to fingertip with arms wide, and height without shoes.',
    ].join('\n'),
    evidence: [
      {
        id: `reach-${reach.date}`,
        label: `Saved reach, ${reach.date}`,
        detail: `Arm span ${reach.armSpanCm} cm, height ${reach.heightCm} cm. No original record ID was kept, and when each was measured is not recorded.`,
        view: {
          when: shortDate(reach.date),
          icon: 'ruler',
          title: `Arm span ${reach.armSpanCm} cm, height ${reach.heightCm} cm`,
          note: 'When each was measured is not recorded',
        },
      },
    ],
    inputSummary: 'Your saved arm span and height.',
    flow: {
      inputs: [
        { label: 'Arm span', value: `${reach.armSpanCm} cm`, icon: 'ruler' },
        { label: 'Height', value: `${reach.heightCm} cm`, icon: 'ruler' },
      ],
      nodes: [
        {
          type: 'step',
          label: 'Arm span minus height',
          detail: `${reach.armSpanCm} minus ${reach.heightCm} is ${difference} cm`,
        },
      ],
      result: {
        label: 'Difference',
        value: `${difference > 0 ? '+' : ''}${difference} cm`,
        icon: 'ruler',
      },
    },
    sourceIds: ['mermier2000'],
    limitations: [
      'A body measurement only. It does not change your focus or quests, and it is never scored as a weakness.',
    ],
  };
}

export function explainHomeTest(
  test: BaselineTest,
  result?: Readonly<{
    value: number;
    method: string;
    date?: string;
    unit?: string;
  }>,
): DecisionExplanation {
  const unit = result?.unit ?? test.unit;
  return {
    summary: result
      ? `${test.name}: ${result.value} ${unit}${
          result.date ? `, recorded on ${result.date}` : ', not saved yet'
        }. A home test you run and record yourself.`
      : `${test.name}: a home test you run and record yourself.`,
    status: 'draft',
    rule: [
      ...test.steps,
      `You need: ${test.equipment.replace(/\.$/, '')}.`,
      test.safety,
    ].join('\n'),
    evidence: result
      ? [
          {
            id: `baseline-${test.id}-${result.date ?? 'unsaved'}`,
            label: result.date
              ? `Saved result, ${result.date}`
              : 'Current reading, not saved',
            detail: `${result.value} ${unit}, method: ${result.method}. No original record ID was kept.`,
            view: {
              when: result.date ? shortDate(result.date) : 'Not saved yet',
              icon: 'tests',
              title: `${result.value} ${unit}`,
              note: `${test.name}, ${result.method}`,
            },
          },
        ]
      : [
          {
            id: test.id,
            label: 'No result yet',
            detail: 'Time it, count it or type your result.',
            view: {
              icon: 'tests',
              title: 'No result yet',
              note: 'Time it, count it or type your result',
            },
          },
        ],
    inputSummary: result
      ? result.date
        ? 'One saved result.'
        : 'One reading, not saved yet.'
      : 'No result yet.',
    sourceIds: [],
    limitations: [
      'A draft home test, not a calibrated score or a diagnosis. Technique, equipment and timing change the result.',
      'Home test results do not change your focus or quests.',
    ],
  };
}
