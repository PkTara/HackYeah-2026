import { TextInput } from 'react-native';
import { sampleGame, type AssessmentRecord } from '@hackyeah/core';
import { PixelText } from '@hackyeah/ui';
import { act } from 'react-test-renderer';
import { control, press, render, setup, text } from '../testing/cameraFixture';

it('keeps the Data index compact and opens measurement details before recording', async () => {
  const screen = await render(setup(), 'Data');
  expect(control(screen, 'Save reach')).toBeUndefined();
  expect(control(screen, 'Show measurement history')).toBeUndefined();
  expect(control(screen, 'Open body and reach')).toBeDefined();
  expect(control(screen, 'Open leg spread')).toBeDefined();
  await press(screen, 'Open leg spread');
  expect(control(screen, 'Back to Data')).toBeDefined();
  expect(text(screen)).toContain('not a validated flexibility test');
  await press(screen, 'Leg spread assessment');
  expect(control(screen, 'Record')).toBeDefined();
  await act(async () => screen.unmount());
});

it('edits the displayed body values, derives ape index and persists valid centimetres', async () => {
  const fixture = setup();
  const screen = await render(fixture, 'Data');
  await press(screen, 'Open body and reach');
  const inputs = (label: string) =>
    screen.root
      .findAllByType(TextInput)
      .filter(n => n.props.accessibilityLabel === label);
  expect(inputs('Arm span in cm')).toHaveLength(1);
  expect(inputs('Height in cm')).toHaveLength(1);
  expect(
    screen.root
      .findAllByType(PixelText)
      .filter(n => n.props.text === 'Ape index'),
  ).toHaveLength(1);
  await act(async () => inputs('Arm span in cm')[0].props.onChangeText('183'));
  await act(async () => inputs('Height in cm')[0].props.onChangeText('180'));
  expect(text(screen)).toContain('+3 cm');
  await press(screen, 'Save reach');
  expect((await fixture.backend.load()).reach).toMatchObject({
    armSpanCm: 183,
    heightCm: 180,
  });
  await act(async () => inputs('Height in cm')[0].props.onChangeText('18'));
  await press(screen, 'Save reach');
  expect(text(screen)).toContain('Use a whole number from 100 to 250');
  expect((await fixture.backend.load()).reach?.heightCm).toBe(180);
  await act(async () => screen.unmount());
});

it('keeps demo integration feeds off Profile and Data and opens them on Activity', async () => {
  const screen = await render(setup(), 'Data');
  await press(
    screen,
    'Demo controls',
    'Demo mode, Use a separate demo profile.',
    'Back to Data',
  );
  expect(control(screen, 'Sync demo integrations')).toBeUndefined();
  expect(text(screen)).not.toContain('Strava: Bouldering');
  await press(screen, 'Profile');
  expect(control(screen, 'Show measurement history')).toBeUndefined();
  expect(control(screen, 'Sync demo integrations')).toBeUndefined();
  await press(screen, 'Open activity and integrations');
  expect(control(screen, 'Back to Data')).toBeDefined();
  expect(text(screen)).toContain('Strava: Bouldering');
  await press(screen, 'Sync demo integrations');
  expect(text(screen)).toContain('Demo sync complete');
  await act(async () => screen.unmount());
});

it('shows only a compact recent-climb row on Profile and links to the log', async () => {
  const screen = await render(setup(), 'Profile');
  expect(control(screen, 'Open climbing log')).toBeDefined();
  expect(control(screen, 'Log a climb')).toBeUndefined();
  await press(screen, 'Open climbing log');
  expect(control(screen, 'Save climb')).toBeDefined();
  await act(async () => screen.unmount());
});

it('filters measurement details by metric and keeps legacy leg media off shoulder details', async () => {
  const fixture = setup();
  const screen = await render(fixture, 'Data');
  await press(
    screen,
    'Demo controls',
    'Demo mode, Use a separate demo profile.',
    'Back to Data',
  );
  await fixture.capabilities.storage.setItem(
    'climbing-monkey/demo/v1/media/assessments',
    JSON.stringify([{ date: '2026-10-03', value: 123, simulated: true }]),
  );
  await press(screen, 'Open shoulder reach');
  expect(text(screen)).not.toContain('Leg spread: 123');
  await press(screen, 'Back to Data', 'Open leg spread');
  expect(text(screen)).toContain('Leg spread: 123');
  await act(async () => screen.unmount());
});

it('uses a canonical Data breadcrumb when each new page is opened directly', async () => {
  for (const route of ['BodyReach', 'Activity', 'MeasurementDetail'] as const) {
    const screen = await render(setup(), route);
    expect(control(screen, 'Back to Data')).toBeDefined();
    await press(screen, 'Back to Data');
    expect(control(screen, 'Open body and reach')).toBeDefined();
    await act(async () => screen.unmount());
  }
});

it('opens only the selected metric history and preserves comparable changes', async () => {
  const previous: AssessmentRecord = {
    id: 'leg-before',
    metric: 'leg_spread',
    value: 140,
    unit: 'degrees',
    method: 'camera',
    confidence: 0.9,
    protocol: 'front-facing-leg-spread-v1',
    occurredAt: '2026-10-02T10:00:00Z',
  };
  const latest: AssessmentRecord = {
    ...previous,
    id: 'leg-now',
    value: 150,
    occurredAt: '2026-10-03T10:00:00Z',
  };
  const shoulder: AssessmentRecord = {
    ...latest,
    id: 'shoulder',
    metric: 'shoulder_reach_left',
    value: 175,
    protocol: 'front-facing-overhead-reach-v1',
  };
  const screen = await render(
    setup({
      state: {
        ...sampleGame,
        onboardingSkipped: true,
        assessments: [previous, latest, shoulder],
      },
    }),
    'Data',
  );
  await press(screen, 'Open leg spread');
  expect(text(screen)).toContain('150 degrees');
  expect(text(screen)).toContain('+10 degrees under matching conditions');
  expect(text(screen)).not.toContain('175 degrees');
  expect(text(screen)).not.toContain('140 degrees');
  await press(screen, 'Show measurement history');
  expect(text(screen)).toContain('140 degrees');
  expect(text(screen)).toContain('2026-10-02');
  expect(text(screen)).toContain('Camera estimate');
  await act(async () => screen.unmount());
});
