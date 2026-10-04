import {
  fromDecisionDto,
  fromQuestDto,
  reachFromAssessments,
  type AssessmentDto,
} from '../wire';

const dto = {
  id: 'server-quest',
  status: 'assigned' as const,
  kind: 'reflect_climb',
  title: 'Reflect',
  instructions: 'Review',
  reason: 'Recorded outcomes',
  estimated_minutes: 2,
  evidence_ids: ['climb-1'],
};

it('preserves the authoritative server rule and dated evidence snapshot', () => {
  const decision = {
    summary: 'One completed climb',
    status: 'app_rule' as const,
    rule: 'server-reflection-v1: at least 3 climbs',
    evidence: [
      {
        id: 'climb-1',
        label: '2026-10-03T10:00:00Z',
        detail: 'vertical; completed=false; grade=V3',
      },
    ],
    source_ids: ['orth2018'],
    limitations: ['Product threshold'],
  };
  expect(fromQuestDto({ ...dto, decision }).decision).toEqual({
    ...decision,
    source_ids: undefined,
    sourceIds: ['orth2018'],
  });
});

it('labels legacy server provenance unavailable while keeping known linked IDs', () => {
  const result = fromQuestDto(dto);
  expect(result.decision?.rule).toMatch(/unavailable/i);
  expect(result.decision?.sourceIds).toEqual([]);
  expect(result.decision?.evidence).toEqual([
    {
      id: 'climb-1',
      label: 'Linked server record',
      detail:
        'Snapshot unavailable; this record ID was supplied by the server.',
    },
  ]);
});

it('treats malformed optional decision metadata as unavailable', () => {
  const result = fromQuestDto({
    ...dto,
    decision: { summary: 'Incomplete' } as never,
  });
  expect(result.decision?.rule).toMatch(/unavailable/i);
  expect(result.decision?.sourceIds).toEqual([]);
});

it('maps camera input snapshots without changing coordinates or formula versions', () => {
  const camera = {
    summary: '90 degree estimate',
    status: 'estimate' as const,
    rule: 'camera-leg-spread-v1',
    evidence: [
      {
        id: 'landmark-23',
        label: 'Left hip',
        detail: '{"x":0.45,"y":0.25,"visibility":0.9}',
      },
    ],
    source_ids: ['stenum2021'],
    limitations: ['model/version unavailable'],
  };
  expect(fromDecisionDto(camera)).toEqual({
    summary: camera.summary,
    status: camera.status,
    rule: camera.rule,
    evidence: camera.evidence,
    sourceIds: camera.source_ids,
    limitations: camera.limitations,
  });
});

it('shows unknown server kinds with unavailable provenance rather than a local plan rationale', () => {
  const quest = fromQuestDto({ ...dto, kind: 'future-kind' });
  expect(quest.kind).toBe('plan');
  expect(quest.decision?.rule).toMatch(/unavailable/i);
  expect(quest.decision?.sourceIds).toEqual([]);
});

it('preserves distinct height and arm-span measurement dates, IDs and methods in derived reach', () => {
  const height: AssessmentDto = {
    id: 'height-1',
    metric: 'height',
    value: 178,
    unit: 'cm',
    method: 'manual',
    protocol: 'height-tape-v1',
    occurred_at: '2026-10-01T08:00:00Z',
  };
  const span: AssessmentDto = {
    id: 'span-2',
    metric: 'arm_span',
    value: 181,
    unit: 'cm',
    method: 'camera',
    protocol: 'span-calibrated-v2',
    occurred_at: '2026-10-03T10:00:00Z',
  };
  const reach = reachFromAssessments([height, span]);
  expect(reach).toMatchObject({ heightCm: 178, armSpanCm: 181 });
  expect(reach?.decision?.evidence).toEqual([
    {
      id: 'height-1',
      label: 'Height · 2026-10-01T08:00:00Z',
      detail: 'value=178 cm; method=manual; protocol=height-tape-v1',
    },
    {
      id: 'span-2',
      label: 'Arm span · 2026-10-03T10:00:00Z',
      detail: 'value=181 cm; method=camera; protocol=span-calibrated-v2',
    },
  ]);
  expect(reach?.decision?.rule).toContain('arm span minus height');
  expect(reach?.decision?.summary).toContain('3 cm');
  expect(reach?.decision?.sourceIds).toEqual([]);
  expect(reach?.decision?.limitations.join(' ')).toContain('grade prediction');
});
