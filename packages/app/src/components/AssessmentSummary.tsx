import { useState } from 'react';
import { View } from 'react-native';
import {
  comparableAssessments,
  toLocalDate,
  type AssessmentMetric,
  type AssessmentRecord,
  type AssessmentUnit,
} from '@hackyeah/core';
import { AppText, Button, Panel, spacing } from '@hackyeah/ui';
import { DecisionHelp } from './DecisionHelp';
import { DataRow } from './DataRow';

export type AssessmentSummaryProps = {
  records?: readonly AssessmentRecord[];
  metrics?: readonly AssessmentMetric[];
  title?: string;
  compact?: boolean;
  onOpen?: (metric: string) => void;
};
const NAMES: Record<AssessmentMetric, string> = {
  finger_force: 'Finger force',
  leg_spread: 'Leg spread',
  shoulder_reach_left: 'Shoulder reach, left',
  shoulder_reach_right: 'Shoulder reach, right',
  height: 'Height',
  arm_span: 'Arm span',
  pullups: 'Pull-ups',
  hang_duration: 'Dead hang',
};
const UNITS: Record<AssessmentUnit, string> = {
  N: 'newtons (N)',
  kgf: 'kilogram-force (kgf)',
  degrees: 'degrees',
  cm: 'cm',
  seconds: 'seconds',
  repetitions: 'repetitions',
};
const valueText = (value: number, unit: AssessmentUnit) =>
  `${Number(value.toFixed(1))} ${UNITS[unit]}`;
const compactUnits: Record<AssessmentUnit, string> = {
  N: ' N',
  kgf: ' kgf',
  degrees: '°',
  cm: ' cm',
  seconds: ' s',
  repetitions: ' reps',
};
const compactValueText = (record: AssessmentRecord) =>
  `${Number(record.value.toFixed(1))}${compactUnits[record.unit]}`;
const sourceText = (record: AssessmentRecord) =>
  `${record.simulated ? 'Simulated · ' : ''}${
    record.method === 'camera'
      ? 'Camera estimate'
      : record.metric === 'finger_force'
      ? 'External instrument · manual'
      : 'Manual measurement'
  }`;
const dateText = (record: AssessmentRecord) =>
  toLocalDate(new Date(record.occurredAt));

function shoulderText(records: readonly AssessmentRecord[]): string {
  const ordered = [...records].sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );
  const sides = [
    {
      label: 'Left',
      record: ordered.find(record => record.metric === 'shoulder_reach_left'),
    },
    {
      label: 'Right',
      record: ordered.find(record => record.metric === 'shoulder_reach_right'),
    },
  ];
  const first = sides.find(side => side.record)?.record;
  const shared = sides.every(
    ({ record }) =>
      !record ||
      (first &&
        sourceText(record) === sourceText(first) &&
        dateText(record) === dateText(first)),
  );
  const values = sides
    .map(({ label, record }) => {
      if (!record) {
        return `${label} unmeasured`;
      }
      return `${label} ${compactValueText(record)}${
        shared ? '' : ` (${sourceText(record)} · ${dateText(record)})`
      }`;
    })
    .join(' · ');
  return `${values}${
    shared && first ? ` · ${sourceText(first)} · ${dateText(first)}` : ''
  }`;
}

export function AssessmentSummary({
  records = [],
  metrics,
  title = 'Assessment history',
  compact = false,
  onOpen,
}: AssessmentSummaryProps) {
  const [history, setHistory] = useState(false);
  const selected = records.filter(
    record => !metrics || metrics.includes(record.metric),
  );
  const comparisons = comparableAssessments(selected);
  if (compact) {
    const groups = [
      { title: 'Leg spread', metric: 'leg_spread', metrics: ['leg_spread'] },
      {
        title: 'Shoulder reach',
        metric: 'shoulder_reach',
        metrics: ['shoulder_reach_left', 'shoulder_reach_right'],
      },
      {
        title: 'Finger strength',
        metric: 'finger_force',
        metrics: ['finger_force'],
      },
    ];
    return (
      <>
        {groups
          .filter(
            group =>
              !metrics ||
              group.metrics.some(metric =>
                metrics.includes(metric as AssessmentMetric),
              ),
          )
          .map(group => {
            const latest = [...selected]
              .filter(record => group.metrics.includes(record.metric))
              .sort(
                (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
              )[0];
            return (
              <DataRow
                key={group.metric}
                title={group.title}
                subtitle={
                  group.metric === 'shoulder_reach'
                    ? shoulderText(selected)
                    : latest
                    ? `${compactValueText(latest)}${
                        latest.side ? ` · ${latest.side}` : ''
                      } · ${sourceText(latest)} · ${dateText(latest)}`
                    : 'No measurements saved yet.'
                }
                accessibilityLabel={`Open ${group.title.toLowerCase()}`}
                onPress={() => onOpen?.(group.metric)}
              />
            );
          })}
      </>
    );
  }
  return (
    <Panel title={title} variant="quiet">
      {!selected.length ? (
        <AppText muted>No measurements saved yet.</AppText>
      ) : null}
      {comparisons.map(({ latest, previous, change }) => (
        <View key={latest.id} style={{ gap: spacing.xs }}>
          <AppText variant="heading">{`${NAMES[latest.metric]}${
            latest.metric === 'finger_force' && latest.side
              ? ` · ${
                  latest.side === 'both' ? 'both hands' : `${latest.side} hand`
                }`
              : ''
          }`}</AppText>
          <AppText>{valueText(latest.value, latest.unit)}</AppText>
          <AppText variant="caption" muted>{`${sourceText(latest)} · ${dateText(
            latest,
          )}`}</AppText>
          {latest.setup ? (
            <AppText variant="caption" muted>{`${
              latest.setup.instrument
            } · ${latest.setup.grip.replace('_', ' ')} · ${
              latest.setup.edge_mm
            } mm edge · ${latest.setup.arm_position} arm · ${
              latest.setup.effort_seconds
            } seconds`}</AppText>
          ) : null}
          <AppText variant="caption" muted>
            {latest.protocol}
          </AppText>
          {latest.decision ? (
            <DecisionHelp
              label={`${NAMES[latest.metric]} measurement`}
              explanation={latest.decision}
            />
          ) : null}
          {change !== null && previous ? (
            <AppText variant="caption">{`${change > 0 ? '+' : ''}${valueText(
              change,
              latest.unit,
            )} under matching conditions since ${dateText(previous)}`}</AppText>
          ) : (
            <AppText variant="caption" muted>
              No comparable earlier reading.
            </AppText>
          )}
        </View>
      ))}
      {selected.length ? (
        <Button
          title={
            history ? 'Hide measurement history' : 'Show measurement history'
          }
          variant="secondary"
          small
          onPress={() => setHistory(!history)}
        />
      ) : null}
      {history
        ? [...selected]
            .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
            .map(record => (
              <View key={`history-${record.id}`} style={{ gap: spacing.xs }}>
                <AppText>{`${NAMES[record.metric]}${
                  record.metric === 'finger_force' && record.side
                    ? ` · ${record.side}`
                    : ''
                }: ${valueText(record.value, record.unit)}`}</AppText>
                <AppText variant="caption" muted>{`${sourceText(
                  record,
                )} · ${dateText(record)}`}</AppText>
                {record.setup ? (
                  <AppText variant="caption" muted>{`${
                    record.setup.instrument
                  } · ${record.setup.grip.replace('_', ' ')} · ${
                    record.setup.edge_mm
                  } mm edge · ${record.setup.arm_position} arm · ${
                    record.setup.effort_seconds
                  } seconds`}</AppText>
                ) : null}
                <AppText variant="caption" muted>
                  {record.protocol}
                </AppText>
                {record.decision ? (
                  <DecisionHelp
                    label={`saved measurement ${record.id}`}
                    explanation={record.decision}
                  />
                ) : null}
              </View>
            ))
        : null}
    </Panel>
  );
}
