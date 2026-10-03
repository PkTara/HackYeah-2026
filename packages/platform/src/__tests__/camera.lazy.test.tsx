import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { CameraPreview } from '../camera';
jest.mock('react-native-permissions', () => {
  (
    globalThis as unknown as { cameraPermissionLibraryLoaded: boolean }
  ).cameraPermissionLibraryLoaded = true;
  return {
    request: jest.fn(),
    RESULTS: { GRANTED: 'granted' },
    PERMISSIONS: {
      IOS: { CAMERA: 'ios.camera' },
      ANDROID: { CAMERA: 'android.camera' },
    },
  };
});
jest.mock('react-native-camera-kit/dist/specs/NativeCameraKitModule', () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock('react-native-camera-kit/dist/specs/CameraNativeComponent', () => ({
  __esModule: true,
  default: () => null,
}));
test('keeps native camera libraries unloaded when the preview is inactive', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <CameraPreview
        active={false}
        mode="assessment"
        onReady={jest.fn()}
        onError={jest.fn()}
      />,
    );
  });
  expect(
    (globalThis as unknown as { cameraPermissionLibraryLoaded?: boolean })
      .cameraPermissionLibraryLoaded,
  ).toBeUndefined();
  await act(async () => renderer.unmount());
});
