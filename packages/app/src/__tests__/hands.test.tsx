import { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { FINGERS } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import { Chip, HandAnatomy } from '@hackyeah/ui';
import { HandDiagram } from '../components/HandDiagram';
import { fingerLabel } from '../labels';
import { control, press, render, setup, text } from '../testing/cameraFixture';

it('uses only accessible diagram buttons to open all ten side-specific fingers', async () => {
  const screen = await render(setup(), 'Hands');
  expect(
    screen.root
      .findAllByType(Chip)
      .filter(n =>
        FINGERS.some(finger => n.props.label.toLowerCase() === finger),
      ),
  ).toHaveLength(0);
  for (const side of ['left', 'right'] as const) {
    for (const finger of FINGERS) {
      const label = fingerLabel(side, finger);
      const button = control(screen, label);
      expect(button).toBeDefined();
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessible).toBe(true);
      expect(button.props.focusable).toBe(true);
      let ancestor = button.parent;
      while (ancestor) {
        expect(ancestor.props['aria-hidden']).not.toBe(true);
        expect(ancestor.props.importantForAccessibility).not.toBe(
          'no-hide-descendants',
        );
        ancestor = ancestor.parent;
      }
      const area = StyleSheet.flatten(button.props.style({ pressed: false }));
      expect(area.width).toBeGreaterThanOrEqual(44);
      expect(area.height).toBeGreaterThanOrEqual(44);
      await press(screen, label);
      expect(text(screen)).toContain('Tap where it hurts.');
      await press(screen, 'Back to Hands');
    }
  }
  expect(screen.root.findAllByType(HandDiagram).map(n => n.props.side)).toEqual(
    ['left', 'right'],
  );
  await act(async () => screen.unmount());
});

it('keeps anatomy help out of the whole-hand input page', async () => {
  const screen = await render(setup(), 'Hands');
  expect(screen.root.findAllByType(HandAnatomy)).toHaveLength(0);
  expect(
    control(screen, 'What is each part: open the hand anatomy'),
  ).toBeUndefined();
  await act(async () => screen.unmount());
});

it('opens contextual anatomy on the selected sore spot and returns to the same finger', async () => {
  const fixture = setup();
  const screen = await render(fixture, 'Hands');
  await press(screen, 'Left ring finger', 'Pulleys', 'A2 pulley, base segment');
  expect(text(screen)).toContain('Your spots save immediately');
  await press(screen, 'Help identify a part of your left ring finger');
  const anatomy = screen.root.findByType(HandAnatomy);
  expect(anatomy.props.side).toBe('left');
  expect(anatomy.props.initialLayer).toBe('tendon');
  expect(anatomy.props.selected).toBe('ring-a2');
  await press(screen, 'Back to Left ring finger');
  expect(control(screen, 'A2 pulley, base segment').props['aria-checked']).toBe(
    true,
  );
  await press(screen, 'Back to Hands');
  expect(control(screen, 'Left ring finger').props.accessibilityState).toEqual({
    selected: true,
  });
  expect(control(screen, 'Right ring finger').props.accessibilityState).toEqual(
    { selected: false },
  );
  expect((await fixture.backend.load()).flags).toEqual([
    { side: 'left', finger: 'ring', date: '2026-10-03', spots: ['a2'] },
  ]);
  await act(async () => screen.unmount());
});

it('keeps immediate finger/spot saves through a reload and clears only the chosen side', async () => {
  const fixture = setup();
  let screen = await render(fixture, 'Hands');
  await press(screen, 'Left thumb', 'End joint, IP joint', 'Back to Hands');
  await press(
    screen,
    'Right thumb',
    'Sore, not sure where, instead of picking spots',
    'Back to Hands',
  );
  await act(async () => screen.unmount());
  fixture.backend = createLocalBackend(fixture.capabilities.storage);
  screen = await render(fixture, 'Hands');
  expect(control(screen, 'Left thumb').props.accessibilityState.selected).toBe(
    true,
  );
  expect(control(screen, 'Right thumb').props.accessibilityState.selected).toBe(
    true,
  );
  await press(screen, 'Left thumb');
  expect(control(screen, 'End joint, IP joint').props['aria-checked']).toBe(
    true,
  );
  await press(screen, 'Back to Hands', 'Clear right thumb');
  expect((await fixture.backend.load()).flags).toEqual([
    { side: 'left', finger: 'thumb', date: '2026-10-03', spots: ['ip'] },
  ]);
  expect(control(screen, 'Right thumb').props.accessibilityState.selected).toBe(
    false,
  );
  await act(async () => screen.unmount());
});

it('keeps the finger photo context visible before capture, with a breadcrumb return', async () => {
  const screen = await render(setup(), 'Hands');
  await press(
    screen,
    'Left middle finger',
    'Add a photo of your left middle finger',
  );
  expect(text(screen)).toContain('Photo for your left middle finger.');
  expect(text(screen)).toContain(
    'Review the photo, then describe how it feels before saving.',
  );
  await press(screen, 'Back to Left middle finger');
  expect(control(screen, 'Fingertip, distal phalanx')).toBeDefined();
  await act(async () => screen.unmount());
});

it('shows a visible keyboard focus state on a diagram hotspot', async () => {
  const screen = await render(setup(), 'Hands');
  const style = () =>
    StyleSheet.flatten(
      control(screen, 'Right index finger').props.style({ pressed: false }),
    );
  const idle = style();
  await act(async () => control(screen, 'Right index finger').props.onFocus());
  expect(style().borderWidth).toBeGreaterThan(idle.borderWidth);
  expect(style().borderStyle).toBe('solid');
  await act(async () => control(screen, 'Right index finger').props.onBlur());
  expect(style()).toEqual(idle);
  await act(async () => screen.unmount());
});

it('announces flagged status through a web-compatible diagram label', async () => {
  const screen = await render(setup(), 'Hands');
  expect(control(screen, 'Left index finger').props['aria-label']).toBe(
    'Left index finger, not flagged',
  );
  await press(
    screen,
    'Left index finger',
    'Fingertip, distal phalanx',
    'Back to Hands',
  );
  expect(control(screen, 'Left index finger').props['aria-label']).toBe(
    'Left index finger, flagged',
  );
  await act(async () => screen.unmount());
});

it('returns from contextual help to the active layer when multiple layers have saved spots', async () => {
  const screen = await render(setup(), 'Hands');
  await press(
    screen,
    'Left ring finger',
    'Fingertip, distal phalanx',
    'Pulleys',
    'A2 pulley, base segment',
  );
  await press(
    screen,
    'Help identify a part of your left ring finger',
    'Open the left ring finger close-up',
  );
  expect(control(screen, 'A2 pulley, base segment').props['aria-checked']).toBe(
    true,
  );
  await act(async () => screen.unmount());
});
