import ReactTestRenderer, { act } from 'react-test-renderer';
import { type AssessmentRecord } from '@hackyeah/core';
import { AssessmentSummary } from '../components/AssessmentSummary';

const previous: AssessmentRecord = {
  id: 'previous',
  metric: 'finger_force',
  value: 390,
  unit: 'N',
  method: 'manual',
  protocol: 'instrument-finger-force-v1',
  occurredAt: '2026-10-03T10:00:00Z',
  side: 'left',
  setup: {
    instrument: 'Load cell',
    grip: 'half_crimp',
    edge_mm: 20,
    arm_position: 'straight',
    effort_seconds: 5,
  },
};
const latest: AssessmentRecord = {
  ...previous,
  id: 'latest',
  occurredAt: '2026-10-04T10:00:00Z',
  value: 400,
};
const text = (screen: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(screen.toJSON());

it('shows the latest comparable reading with its source, date and change', async () => {
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <AssessmentSummary records={[latest, previous]} />,
    );
  });
  expect(text(screen)).toContain('400 newtons');
  expect(text(screen)).toContain('External instrument');
  expect(text(screen)).toContain('2026-10-04');
  expect(text(screen)).toContain('+10 newtons');
  expect(text(screen)).toContain('Load cell');
  await act(async () => screen.unmount());
});

it('uses shoulder-side labels without a hand suffix while retaining finger-force hand labels', async () => {
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <AssessmentSummary
        records={[
          latest,
          {
            id: 'shoulder-left',
            metric: 'shoulder_reach_left',
            value: 165,
            unit: 'degrees',
            side: 'left',
            method: 'camera',
            protocol: 'front-facing-overhead-reach-v1',
            occurredAt: latest.occurredAt,
          },
        ]}
      />,
    );
  });
  expect(text(screen)).toContain('Finger force · left hand');
  expect(text(screen)).toContain('Shoulder reach (left)');
  expect(text(screen)).not.toContain('Shoulder reach (left) · left hand');
  await act(async () => screen.unmount());
});

it('opens dated source history and labels simulated camera measurements', async () => {
  const camera: AssessmentRecord = {
    id: 'camera',
    metric: 'leg_spread',
    value: 140,
    unit: 'degrees',
    method: 'camera',
    protocol: 'front-facing-leg-spread-v1',
    occurredAt: '2026-10-02T12:00:00Z',
    confidence: 0.9,
    simulated: true,
  };
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <AssessmentSummary records={[latest, previous, camera]} />,
    );
  });
  expect(text(screen)).toContain('Simulated · Camera estimate');
  expect(text(screen)).not.toContain('390 newtons');
  await act(async () =>
    screen.root
      .find(
        n =>
          n.props.accessibilityLabel === 'Show measurement history' &&
          typeof n.props.onPress === 'function',
      )
      .props.onPress(),
  );
  expect(text(screen)).toContain('390 newtons');
  expect(text(screen)).toContain('2026-10-03');
  expect(text(screen)).toContain('External instrument');
  await act(async () => screen.unmount());
});
