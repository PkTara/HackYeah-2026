import {
  COSMETICS,
  XP_PER_LEVEL,
  XP_PER_QUEST,
  petStatus,
  type DecisionExplanation,
} from '@hackyeah/core';

export function explainXP(completed: readonly string[]): DecisionExplanation {
  const pet = petStatus(completed);
  return {
    summary: `${pet.xp} XP, level ${pet.level}: game progress`,
    status: 'app_rule',
    rule: `Each unique completed quest gives ${XP_PER_QUEST} XP. Level = floor(XP / ${XP_PER_LEVEL}) + 1; ${XP_PER_LEVEL} XP per level. The meter uses XP modulo ${XP_PER_LEVEL}. Quests to the next level = (${XP_PER_LEVEL} minus XP in this level) / ${XP_PER_QUEST}. Cosmetics: ${COSMETICS.map(
      c => `${c.name} (${c.id}): level ${c.level}`,
    ).join('; ')}. Currently unlocked: ${pet.cosmetics.join(', ') || 'none'}.`,
    evidence:
      completed.length === 0
        ? [
            {
              id: 'completed-none',
              label: 'Stored completion list',
              detail: 'No completed quests are stored in this profile.',
            },
          ]
        : [...new Set(completed)].map(id => ({
            id,
            label: 'Completed quest',
            detail:
              'Completion ID stored in your profile; completion date is not recorded.',
          })),
    sourceIds: [],
    limitations: [
      'XP is a game reward, not a measure of climbing ability. Completing a quest does not change terrain or style tallies.',
      'Example completion IDs can contribute XP in the demo profile.',
    ],
  };
}
export function explainReach(
  reach: import('@hackyeah/core').Reach,
): DecisionExplanation {
  if (reach.decision) {
    return reach.decision;
  }
  return {
    summary: `Ape index: ${reach.armSpanCm - reach.heightCm} cm`,
    status: 'app_rule',
    rule: 'The displayed difference is arm span minus height, in centimetres.',
    evidence: [
      {
        id: 'reach',
        label: `App display reference (generated) · Stored reach dated ${reach.date}`,
        detail: `Original record ID unavailable. This reference was generated for display. Arm span ${reach.armSpanCm} cm; height ${reach.heightCm} cm. Measure fingertip to fingertip with arms wide, and height without shoes.`,
      },
    ],
    sourceIds: [],
    limitations: [
      'This is a body measurement, not a strength, weakness or grade prediction. It does not influence the local terrain focus.',
      'Individual measurement record IDs, timestamps and methods are unavailable in this stored reach. The stored date does not establish that height and arm span were measured together. Measurement technique can change the result.',
    ],
  };
}
export function explainHomeTest(
  test: import('@hackyeah/core').BaselineTest,
  result?: Readonly<{
    value: number;
    method: string;
    date?: string;
    unit?: string;
  }>,
): DecisionExplanation {
  return {
    summary: `${test.name}: self-reported home test`,
    status: 'draft',
    rule: `Prototype protocol ${test.id} (setup version 1): ${test.steps.join(
      ' ',
    )} Equipment: ${test.equipment}. ${test.safety}`,
    evidence: result
      ? [
          {
            id: `baseline-${test.id}-${result.date ?? 'unsaved'}`,
            label: result.date
              ? `App display reference (generated) · Recorded on ${result.date}`
              : 'App display reference (generated) · Current unsaved reading',
            detail: `Original record ID unavailable. This reference was generated for display. ${
              result.value
            } ${result.unit ?? test.unit}; method: ${result.method}.`,
          },
        ]
      : [
          {
            id: test.id,
            label: 'Home-test protocol',
            detail:
              'No result supplied. Time, count or type your own observation.',
          },
        ],
    sourceIds: [],
    limitations: [
      'These prototype protocols and profile labels are not calibrated climbing ability scores or validated diagnostic tests.',
      'Results depend on technique, equipment and timing. These measurements do not influence the local terrain focus or local quest selection.',
    ],
  };
}
export function explainExampleRadar(
  axes: readonly Readonly<{ label: string; value: number | null }>[],
): DecisionExplanation {
  return {
    summary: 'Movement radar: example values',
    status: 'example',
    rule: 'The axes show fixed demonstration values from 0 to 1. No movement scoring algorithm is implemented.',
    evidence: axes.map(axis => ({
      id: `example-${axis.label}`,
      label: axis.label,
      detail: `${axis.value} on a 0–1 axis; fixed example.`,
    })),
    sourceIds: [],
    limitations: [
      'These values are not calculated from your records and say nothing about your ability.',
    ],
  };
}
