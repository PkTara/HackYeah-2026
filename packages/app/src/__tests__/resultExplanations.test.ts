import { BASELINE_TESTS, isDecisionFlow } from '@hackyeah/core';
import {
  explainXP,
  explainReach,
  explainHomeTest,
} from '../components/resultExplanations';

it('explains XP from unique completion records with the actual product arithmetic', () => {
  const result = explainXP(['quiet-feet', 'preview', 'quiet-feet']);
  expect(result.rule).toContain('2 x 10 = 20 XP');
  expect(result.rule).toContain('Every 50 XP is a new level');
  expect(result.evidence.map(r => r.id)).toEqual(['quiet-feet', 'preview']);
  expect(result.evidence[0].detail).toContain(
    'date it was completed is not recorded',
  );
  expect(result.summary).toContain('20 XP');
  expect(result.sourceIds).toEqual([]);
  expect(result.limitations.join(' ')).toContain('climbing ability');
});

it('draws XP as a flow from completed quests to the level', () => {
  const result = explainXP(['quiet-feet', 'preview', 'quiet-feet']);
  expect(isDecisionFlow(result.flow)).toBe(true);
  expect(result.inputSummary).toBe('2 completed quests.');
  expect(result.flow?.inputs).toEqual([
    { label: 'Quests done', value: '2', icon: 'check' },
  ]);
  expect(result.flow?.nodes[0]).toMatchObject({
    label: '10 XP per quest, once each',
    detail: '2 x 10 = 20 XP',
    team: true,
  });
  expect(result.flow?.result).toEqual({
    label: 'Level',
    value: '1, 20 XP',
    icon: 'banana',
  });
  expect(explainXP([]).inputSummary).toBe('0 completed quests.');
});

it('explains the reach difference using both measured values and their date', () => {
  const result = explainReach({
    armSpanCm: 182,
    heightCm: 178,
    date: '2026-10-03',
  });
  expect(result.summary).toContain('4 cm longer');
  expect(result.evidence[0].detail).toContain('182 cm');
  expect(result.evidence[0].detail).toContain('178 cm');
  expect(result.evidence[0].label).toContain('2026-10-03');
  expect(result.rule).toContain('182 minus 178 = 4 cm');
  expect(result.limitations.join(' ')).toContain('never scored as a weakness');
});

it('shows the actual home-test protocol, manual method, value and recorded date', () => {
  const test = BASELINE_TESTS.find(t => t.id === 'pull-ups')!;
  const result = explainHomeTest(test, {
    value: 7,
    method: 'counter',
    date: '2026-10-03',
    unit: 'reps',
  });
  expect(result.rule).toContain(test.steps[2]);
  expect(result.rule).not.toContain(test.id);
  expect(result.evidence[0].detail).toContain('7 reps');
  expect(result.evidence[0].detail).toContain('counter');
  expect(result.evidence[0].label).toContain('2026-10-03');
  expect(result.limitations.join(' ')).toContain('not a calibrated score');
});

it('explains an empty known completion list without presenting missing provenance', () => {
  const result = explainXP([]);
  expect(result.evidence[0]?.detail).toBe(
    'No completed quests are stored in this profile.',
  );
});

it('shows the configured cosmetic thresholds and current unlock decisions', () => {
  const result = explainXP(['a', 'b', 'c', 'd', 'e']);
  expect(result.summary).toContain('Level 2');
  expect(result.rule).toContain('Banana headband at level 2');
  expect(result.rule).toContain('Chalk bag at level 3');
  expect(result.rule).toContain('Unlocked now: Banana headband.');
});

it('preserves authoritative reach inputs measured on different dates', () => {
  const decision = {
    summary: 'Reach difference from two stored measurements',
    status: 'app_rule' as const,
    rule: '182 minus 178 = 4 cm',
    evidence: [
      {
        id: 'height-1',
        label: 'Height at 2026-10-01T10:00:00Z',
        detail: '178 cm; typed',
      },
      {
        id: 'span-2',
        label: 'Arm span at 2026-10-03T10:00:00Z',
        detail: '182 cm; typed',
      },
    ],
    sourceIds: [],
    limitations: ['Different measurement dates'],
  };
  const reach = { armSpanCm: 182, heightCm: 178, date: '2026-10-03', decision };
  expect(explainReach(reach)).toEqual(decision);
});
