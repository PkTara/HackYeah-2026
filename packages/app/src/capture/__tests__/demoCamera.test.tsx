import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import type { CameraSession } from '@hackyeah/platform';
import { simulatedCamera } from '../../demo/camera';
import { demoLivePose, type DemoPoseCamera } from '../../demo/pose';
test('simulated preview receives matching analysis landmarks and reports fit geometry', async () => {
  const onGeometry = jest.fn();
  let session!: CameraSession & DemoPoseCamera;
  let screen!: ReactTestRenderer;
  const Preview = simulatedCamera.Preview;
  await act(async () => {
    screen = create(
      <Preview
        active
        mode="assessment"
        onReady={value => {
          session = value!;
        }}
        onError={jest.fn()}
        onGeometry={onGeometry}
      />,
    );
  });
  expect(session.simulated).toBe(true);
  expect(onGeometry).toHaveBeenCalledWith({
    imageWidth: 640,
    imageHeight: 480,
    mirrored: false,
    fit: 'contain',
  });
  await act(async () => session.showPose?.(demoLivePose('shoulder_reach', 0)));
  const wrist = () =>
    StyleSheet.flatten(
      screen.root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.testID === 'demo-point-15',
      )[0].props.style,
    ).top;
  const resting = wrist();
  await act(async () => session.showPose?.(demoLivePose('shoulder_reach', 4)));
  expect(wrist()).toBeLessThan(resting);
  await act(async () => screen.unmount());
});
