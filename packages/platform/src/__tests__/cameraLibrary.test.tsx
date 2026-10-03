import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AndroidCamera from 'react-native-camera-kit/src/Camera.android';
jest.mock('react-native-camera-kit/src/specs/NativeCameraKitModule', () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock('react-native-camera-kit/src/specs/CameraNativeComponent', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ReactLocal.forwardRef((props: object, ref: React.Ref<unknown>) => (
      <View {...props} ref={ref} testID="camera-fabric-view" />
    )),
  };
});
test('mounts the actual upstream Android camera with React frozen props', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<AndroidCamera />);
  });
  expect(
    renderer.root.findByProps({ testID: 'camera-fabric-view' }).props.zoom,
  ).toBe(-1);
  await act(async () => renderer.unmount());
});
test('mounts the actual upstream iOS camera with React frozen props', async () => {
  const IOSCamera = require('react-native-camera-kit/src/Camera.ios').default;
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<IOSCamera />);
  });
  expect(
    renderer.root.findByProps({ testID: 'camera-fabric-view' }).props.zoom,
  ).toBe(-1);
  await act(async () => renderer.unmount());
});
