import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { CameraPreview } from '../camera';
import type { CameraSession } from '../camera.types';
import { request } from 'react-native-permissions';
import NativeCameraKit from 'react-native-camera-kit/dist/specs/NativeCameraKitModule';
jest.mock('react-native/Libraries/Blob/NativeFileReaderModule', () => ({
  __esModule: true,
  default: {
    readAsDataURL: jest.fn().mockResolvedValue('data:image/jpeg;base64,/9j/'),
  },
}));
jest.mock('react-native-permissions', () => ({
  request: jest.fn().mockResolvedValue('granted'),
  RESULTS: { GRANTED: 'granted' },
  PERMISSIONS: {
    IOS: { CAMERA: 'ios.camera' },
    ANDROID: { CAMERA: 'android.camera' },
  },
}));
jest.mock('react-native-camera-kit/dist/specs/NativeCameraKitModule', () => ({
  __esModule: true,
  default: {
    capture: jest.fn().mockResolvedValue({
      uri: 'file:///camera.jpeg',
      name: 'camera.jpeg',
      width: 100,
      height: 200,
    }),
  },
}));
jest.mock('react-native-camera-kit/dist/specs/CameraNativeComponent', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ReactLocal.forwardRef((props: object, ref: React.Ref<unknown>) => (
      <View {...props} ref={ref} testID="camera-fabric-view" />
    )),
  };
});
test('connects native permission and the actual camera-kit view/capture APIs to the public session', async () => {
  const oldFetch = globalThis.fetch;
  const oldReader = globalThis.FileReader;
  globalThis.fetch = jest.fn().mockResolvedValue({
    blob: async () =>
      new Blob(['camera'], { type: 'image/jpeg', lastModified: 0 }),
  });
  // Exercise React Native's FileReader implementation against its native module boundary.
  // eslint-disable-next-line @react-native/no-deep-imports
  const nativeFileReader = require('react-native/Libraries/Blob/FileReader');
  globalThis.FileReader = nativeFileReader.default;
  let session: CameraSession | null = null;
  const onReady = (next: CameraSession | null) => {
    session = next;
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <CameraPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={jest.fn()}
      />,
    );
  });
  expect(request).toHaveBeenCalled();
  expect(
    renderer.root.findByProps({ testID: 'camera-fabric-view' }).props
      .cameraType,
  ).toBe('back');
  expect(session).toBeNull();
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'camera-fabric-view' })
      .props.onZoom({ nativeEvent: { zoom: 1 } });
  });
  await expect(session!.snapshot()).resolves.toMatchObject({
    kind: 'image',
    uri: 'file:///camera.jpeg',
  });
  expect(NativeCameraKit.capture).toHaveBeenCalled();
  await act(async () => renderer.unmount());
  expect(session).toBeNull();
  globalThis.fetch = oldFetch;
  globalThis.FileReader = oldReader;
});
