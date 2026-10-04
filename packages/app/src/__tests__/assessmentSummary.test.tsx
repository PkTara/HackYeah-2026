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
  expect(text(screen)).toContain('Shoulder reach, left');
  expect(text(screen)).not.toContain('Shoulder reach, left · left hand');
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

it('keeps compact latest readings concise and source-labelled while linking to metric details', async () => {
  const open = jest.fn();
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <AssessmentSummary
        compact
        records={[previous, { ...latest, simulated: true }]}
        metrics={['finger_force']}
        onOpen={open}
      />,
    );
  });
  expect(text(screen)).toContain('400 N');
  expect(text(screen)).toContain('Simulated · External instrument · manual');
  expect(text(screen)).toContain('2026-10-04');
  expect(text(screen)).not.toContain('Load cell');
  expect(text(screen)).not.toContain('Show measurement history');
  await act(async () =>
    screen.root
      .find(
        n =>
          n.props.accessibilityLabel === 'Open finger strength' &&
          typeof n.props.onPress === 'function',
      )
      .props.onPress(),
  );
  expect(open).toHaveBeenCalledWith('finger_force');
  await act(async () => screen.unmount());
});

it('shows the latest compact shoulder value for each side with shared provenance once', async () => {
  const left: AssessmentRecord = {
    id: 'left',
    metric: 'shoulder_reach_left',
    value: 165,
    unit: 'degrees',
    method: 'camera',
    protocol: 'front-facing-overhead-reach-v1',
    occurredAt: latest.occurredAt,
    confidence: 0.9,
  };
  const right: AssessmentRecord = {
    ...left,
    id: 'right',
    metric: 'shoulder_reach_right',
    value: 172,
  };
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <AssessmentSummary
        compact
        records={[
          {
            ...left,
            id: 'older-left',
            value: 150,
            occurredAt: previous.occurredAt,
          },
          right,
          left,
        ]}
        metrics={['shoulder_reach_left', 'shoulder_reach_right']}
      />,
    );
  });
  expect(text(screen)).toContain(
    'Left 165° · Right 172° · Camera estimate · 2026-10-04',
  );
  expect(text(screen)).not.toContain('150°');
  await act(async () => screen.unmount());
});

it('marks an unmeasured shoulder side rather than hiding it', async () => {
  const left: AssessmentRecord = {
    id: 'left-only',
    metric: 'shoulder_reach_left',
    value: 165,
    unit: 'degrees',
    method: 'camera',
    protocol: 'front-facing-overhead-reach-v1',
    occurredAt: latest.occurredAt,
    confidence: 0.9,
    simulated: true,
  };
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <AssessmentSummary
        compact
        records={[left]}
        metrics={['shoulder_reach_left', 'shoulder_reach_right']}
      />,
    );
  });
  expect(text(screen)).toContain(
    'Left 165° · Right unmeasured · Simulated · Camera estimate · 2026-10-04',
  );
  await act(async () =>
    screen.update(
      <AssessmentSummary
        compact
        metrics={['shoulder_reach_left', 'shoulder_reach_right']}
      />,
    ),
  );
  expect(text(screen)).toContain('Left unmeasured · Right unmeasured');
  await act(async () => screen.unmount());
});

it('keeps differing shoulder sources and dates attached to their own side', async () => {
  const left: AssessmentRecord = {
    id: 'left-real',
    metric: 'shoulder_reach_left',
    value: 165,
    unit: 'degrees',
    method: 'camera',
    protocol: 'front-facing-overhead-reach-v1',
    occurredAt: previous.occurredAt,
    confidence: 0.9,
  };
  const right: AssessmentRecord = {
    ...left,
    id: 'right-demo',
    metric: 'shoulder_reach_right',
    value: 172,
    occurredAt: latest.occurredAt,
    simulated: true,
  };
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <AssessmentSummary
        compact
        records={[right, left]}
        metrics={['shoulder_reach_left', 'shoulder_reach_right']}
      />,
    );
  });
  expect(text(screen)).toContain(
    'Left 165° (Camera estimate · 2026-10-03) · Right 172° (Simulated · Camera estimate · 2026-10-04)',
  );
  await act(async () => screen.unmount());
});
