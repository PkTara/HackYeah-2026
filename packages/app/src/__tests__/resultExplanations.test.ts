import { BASELINE_TESTS } from '@hackyeah/core';
import {
  explainXP,
  explainReach,
  explainHomeTest,
  explainExampleRadar,
} from '../components/resultExplanations';

it('explains XP from unique completion records with the actual product arithmetic', () => {
  const result = explainXP(['quiet-feet', 'preview', 'quiet-feet']);
  expect(result.rule).toContain('10 XP');
  expect(result.rule).toContain('50 XP');
  expect(result.evidence.map(r => r.id)).toEqual(['quiet-feet', 'preview']);
  expect(result.summary).toContain('20 XP');
  expect(result.limitations.join(' ')).toContain('climbing ability');
});

it('explains the reach difference using both measured values and their date', () => {
  const result = explainReach({
    armSpanCm: 182,
    heightCm: 178,
    date: '2026-10-03',
  });
  expect(result.summary).toContain('4 cm');
  expect(result.evidence[0].detail).toContain('182 cm');
  expect(result.evidence[0].detail).toContain('178 cm');
  expect(result.evidence[0].label).toContain('2026-10-03');
  expect(result.rule).toContain('arm span minus height');
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
  expect(result.evidence[0].detail).toContain('7 reps');
  expect(result.evidence[0].detail).toContain('counter');
  expect(result.evidence[0].label).toContain('2026-10-03');
  expect(result.limitations.join(' ')).toContain('not calibrated');
});

it('reports radar values as fixed examples without claiming a personal score', () => {
  const result = explainExampleRadar([{ label: 'Footwork', value: 0.45 }]);
  expect(result.status).toBe('example');
  expect(result.evidence[0].detail).toContain('0.45');
  expect(result.rule).toContain('fixed demonstration');
  expect(result.limitations.join(' ')).toContain(
    'not calculated from your records',
  );
});

it('explains an empty known completion list without presenting missing provenance', () => {
  const result = explainXP([]);
  expect(result.evidence[0]?.detail).toBe(
    'No completed quests are stored in this profile.',
  );
});

it('shows the configured cosmetic thresholds and current unlock decisions', () => {
  const result = explainXP(['a', 'b', 'c', 'd', 'e']);
  expect(result.summary).toContain('level 2');
  expect(result.rule).toContain('Banana headband (headband): level 2');
  expect(result.rule).toContain('Chalk bag (chalk-bag): level 3');
  expect(result.rule).toContain('unlocked: headband');
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
