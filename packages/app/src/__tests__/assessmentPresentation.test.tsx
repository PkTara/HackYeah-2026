import { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { Panel } from '@hackyeah/ui';
import { control, press, render, setup, text } from '../testing/cameraFixture';

test('an assessment without an analysis service still has its Camera tray and a useful fixed placeholder', async () => {
  const f = setup({ media: false });
  const screen = await render(f, 'Assessment');
  expect(
    screen.root.findAllByType(Panel).map(node => node.props.title),
  ).toContain('Camera');
  const box = screen.root.findByProps({ testID: 'assessment-camera-box' });
  expect(StyleSheet.flatten(box.props.style).height).toBe(280);
  expect(text(screen)).toContain('Camera off');
  expect(text(screen)).toContain('Connect the analysis service');
  expect(control(screen, 'Record').props.accessibilityState.disabled).toBe(
    true,
  );
  expect(f.preview.active).toBe(false);
  expect(f.requests).toEqual([]);
  await act(async () => screen.unmount());
});

test('camera permission denial keeps the Camera box and guidance without starting uploads', async () => {
  const f = setup({ denied: 'Camera permission was denied.' });
  const screen = await render(f, 'Tests');
  await press(
    screen,
    'Open shoulder reach',
    'Shoulder reach assessment',
    'Record',
  );
  const box = screen.root.findByProps({ testID: 'assessment-camera-box' });
  expect(StyleSheet.flatten(box.props.style).height).toBe(280);
  expect(text(screen)).toContain(
    'Camera permission was denied. Check camera access',
  );
  expect(text(screen)).toContain('Camera off');
  expect(control(screen, 'Record')).toBeDefined();
  expect(f.preview.active).toBe(false);
  expect(f.requests).toEqual([]);
  await act(async () => screen.unmount());
});

test('a device without a camera retains the same box and disables recording', async () => {
  const f = setup();
  const screen = await render(
    { ...f, capabilities: { ...f.capabilities, camera: undefined } },
    'Assessment',
  );
  expect(
    StyleSheet.flatten(
      screen.root.findByProps({ testID: 'assessment-camera-box' }).props.style,
    ).height,
  ).toBe(280);
  expect(text(screen)).toContain('There is no camera on this device');
  expect(control(screen, 'Record').props.accessibilityState.disabled).toBe(
    true,
  );
  await press(screen, 'Record');
  expect(f.requests).toEqual([]);
  await act(async () => screen.unmount());
});
