import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View } from 'react-native';
import {
  createNativeCameraPreview,
  type NativeCameraHandle,
  type NativeCameraViewProps,
} from '../nativeCamera';
import type { CameraSession, MediaCapture } from '../camera.types';

const capture = jest.fn();
const requestPermission = jest.fn();
const CameraView = React.forwardRef<NativeCameraHandle, NativeCameraViewProps>(
  (props, ref) => {
    React.useImperativeHandle(ref, () => ({ capture }));
    return <View {...props} testID="native-camera" />;
  },
);
const Preview = createNativeCameraPreview({
  View: CameraView,
  requestPermission,
});
let renderer: TestRenderer.ReactTestRenderer;
let session: CameraSession | null;
const onReady = jest.fn((next: CameraSession | null) => {
  session = next;
});
const onError = jest.fn();
async function mount(
  active = true,
  mode: 'assessment' | 'hand' = 'assessment',
) {
  await act(async () => {
    renderer = TestRenderer.create(
      <Preview
        active={active}
        mode={mode}
        onReady={onReady}
        onError={onError}
      />,
    );
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  session = null;
  requestPermission.mockResolvedValue(true);
  capture.mockResolvedValue({
    uri: 'file:///frame.jpg',
    name: 'frame.jpg',
    width: 640,
    height: 480,
  });
});
afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
  }
});
test('requests camera permission before exposing a back-camera snapshot session', async () => {
  await mount();
  expect(requestPermission).toHaveBeenCalledTimes(1);
  expect(
    renderer.root.findByProps({ testID: 'native-camera' }).props.cameraType,
  ).toBe('back');
  expect(session).not.toBeNull();
});
test('reports denied permission without mounting a camera', async () => {
  requestPermission.mockResolvedValue(false);
  await mount();
  expect(
    renderer.root.findAllByProps({ testID: 'native-camera' }),
  ).toHaveLength(0);
  expect(onError).toHaveBeenCalledWith(
    'Camera permission is required to show the live preview.',
  );
  expect(session).toBeNull();
});
test('normalizes snapshot files from the live camera and keeps the preview mounted', async () => {
  capture.mockResolvedValue({
    uri: 'file://media/photo/1',
    path: '/cache/frame.jpeg',
    name: 'frame.jpeg',
    width: 640,
    height: 480,
  });
  await mount();
  const result = await session!.snapshot();
  expect(result).toEqual({
    kind: 'image',
    uri: 'file:///cache/frame.jpeg',
    mimeType: 'image/jpeg',
    filename: 'frame.jpeg',
    width: 640,
    height: 480,
  });
  expect(capture).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(CameraView)).toHaveLength(1);
});
test('deactivation releases the preview and invalidates old sessions', async () => {
  await mount();
  const old = session!;
  await act(async () => {
    renderer.update(
      <Preview
        active={false}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  expect(
    renderer.root.findAllByProps({ testID: 'native-camera' }),
  ).toHaveLength(0);
  expect(session).toBeNull();
  await expect(old.snapshot()).rejects.toThrow('Camera preview is inactive.');
});
test('reports native initialization errors and invalidates the session', async () => {
  await mount();
  await act(async () => {
    renderer.root
      .findByType(CameraView)
      .props.onError({ nativeEvent: { errorMessage: 'Camera is in use' } });
  });
  expect(onError).toHaveBeenCalledWith('Camera is in use');
  expect(session).toBeNull();
});
test('rejects an empty native snapshot with a useful message', async () => {
  capture.mockResolvedValue(undefined);
  await mount();
  await expect(session!.snapshot()).rejects.toThrow(
    'Camera is still starting. Try again in a moment.',
  );
});
test('uses the front camera for the hand route and does not request permission while inactive', async () => {
  await mount(false, 'hand');
  expect(requestPermission).not.toHaveBeenCalled();
  await act(async () => {
    renderer.update(
      <Preview active={true} mode="hand" onReady={onReady} onError={onError} />,
    );
  });
  expect(renderer.root.findByType(CameraView).props.cameraType).toBe('front');
});
test('ignores late permission completion after leaving the camera route', async () => {
  let resolve!: (granted: boolean) => void;
  requestPermission.mockImplementation(
    () =>
      new Promise<boolean>(done => {
        resolve = done;
      }),
  );
  await mount();
  await act(async () => {
    renderer.update(
      <Preview
        active={false}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
    resolve(true);
  });
  expect(session).toBeNull();
  expect(renderer.root.findAllByType(CameraView)).toHaveLength(0);
});
test('exposes a session when the native view ref arrives after a lazy camera load', async () => {
  let deliver!: React.ForwardedRef<NativeCameraHandle>;
  const LazyView = React.forwardRef<NativeCameraHandle, NativeCameraViewProps>(
    (_props, ref) => {
      deliver = ref;
      return <View />;
    },
  );
  const LazyPreview = createNativeCameraPreview({
    View: LazyView,
    requestPermission,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <LazyPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  expect(session).toBeNull();
  await act(async () => {
    if (typeof deliver === 'function') {
      deliver({ capture });
    } else if (deliver) {
      deliver.current = { capture };
    }
  });
  expect(session).not.toBeNull();
});
test('requires a fresh permission result after returning to the route', async () => {
  await mount();
  await act(async () => {
    renderer.update(
      <Preview
        active={false}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  requestPermission.mockImplementation(() => new Promise(() => {}));
  await act(async () => {
    renderer.update(
      <Preview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  expect(renderer.root.findAllByType(CameraView)).toHaveLength(0);
  expect(session).toBeNull();
});
test('reports a failed native permission request', async () => {
  requestPermission.mockRejectedValue(
    new Error('Permission service unavailable'),
  );
  await mount();
  expect(onError).toHaveBeenCalledWith('Permission service unavailable');
  expect(session).toBeNull();
});
test('adds native JPEG bytes for live analysis when the driver supports reading its captured file', async () => {
  const readBytes = jest
    .fn()
    .mockResolvedValue(new Uint8Array([255, 216, 255]));
  const BinaryPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    readBytes,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <BinaryPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  const frame = await session!.snapshot();
  expect(frame.bytes).toEqual(new Uint8Array([255, 216, 255]));
  expect(readBytes).toHaveBeenCalledWith('file:///frame.jpg');
});
test('offers a system video recording session for drivers that provide recording', async () => {
  const clip = {
    kind: 'video' as const,
    uri: 'file:///video.mp4',
    filename: 'video.mp4',
    mimeType: 'video/mp4',
  };
  const recordVideo = jest.fn().mockResolvedValue(clip);
  const VideoPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    recordVideo,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <VideoPreview
        active={true}
        mode="hand"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  expect(typeof session!.recordVideo).toBe('function');
  let result;
  let recording!: Promise<unknown>;
  await act(async () => {
    recording = session!.recordVideo!();
  });
  await act(async () => {
    result = await recording;
  });
  expect(result).toEqual(clip);
  expect(recordVideo).toHaveBeenCalledWith('front');
});
test('releases the embedded camera while the system video recorder is open and restores it afterward', async () => {
  let finish!: (clip: null) => void;
  const recordVideo = jest.fn(
    () =>
      new Promise<null>(done => {
        finish = done;
      }),
  );
  const VideoPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    recordVideo,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <VideoPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  let recording!: Promise<unknown>;
  await act(async () => {
    recording = session!.recordVideo!();
  });
  expect(renderer.root.findAllByType(CameraView)).toHaveLength(0);
  expect(session).toBeNull();
  await act(async () => {
    finish(null);
    await recording;
  });
  expect(renderer.root.findAllByType(CameraView)).toHaveLength(1);
  expect(session).not.toBeNull();
});
test('rejects a snapshot finishing after the route is deactivated', async () => {
  let finish!: (frame: { uri: string }) => void;
  capture.mockImplementation(
    () =>
      new Promise(done => {
        finish = done;
      }),
  );
  await mount();
  const snapshot = session!.snapshot();
  await act(async () => {
    renderer.update(
      <Preview
        active={false}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  finish({ uri: 'file:///late.jpg' });
  await expect(snapshot).rejects.toThrow('Camera preview is inactive.');
});
test('keeps a captured file for review and releases it only when requested', async () => {
  const releaseFrame = jest.fn().mockResolvedValue(undefined);
  const ReleasingPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    releaseFrame,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <ReleasingPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  const frame = await session!.snapshot();
  expect(releaseFrame).not.toHaveBeenCalled();
  expect(typeof frame.release).toBe('function');
  frame.release!();
  frame.release!();
  expect(releaseFrame).toHaveBeenCalledTimes(1);
  expect(releaseFrame).toHaveBeenCalledWith('file:///frame.jpg');
});
test('releases a sampled cache file when reading its bytes fails', async () => {
  const releaseFrame = jest.fn().mockResolvedValue(undefined);
  const readBytes = jest.fn().mockRejectedValue(new Error('Frame read failed'));
  const ReleasingPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    releaseFrame,
    readBytes,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <ReleasingPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  await expect(session!.snapshot()).rejects.toThrow('Frame read failed');
  expect(releaseFrame).toHaveBeenCalledWith('file:///frame.jpg');
});
test('rejects a second recorder request while the first request is opening', async () => {
  let finish!: (clip: null) => void;
  const recordVideo = jest.fn(
    () =>
      new Promise<null>(done => {
        finish = done;
      }),
  );
  const VideoPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    recordVideo,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <VideoPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  const currentSession = session!;
  let first!: Promise<unknown>;
  let second!: Promise<unknown>;
  let secondError = '';
  await act(async () => {
    first = currentSession.recordVideo!();
    second = currentSession.recordVideo!();
    second.catch(error => {
      secondError = error.message;
    });
  });
  await act(async () => {
    finish(null);
  });
  expect(secondError).toBe('Video recording is already open.');
  await first;
  expect(recordVideo).toHaveBeenCalledTimes(1);
});
test('waits for native camera startup before offering a capture session', async () => {
  const StartingPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    requiresStarted: true,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <StartingPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  expect(session).toBeNull();
  await act(async () => {
    renderer.root.findByType(CameraView).props.onStarted();
  });
  expect(session).not.toBeNull();
});

test('releases a recorded video finishing after the camera screen is disposed', async () => {
  let finish!: (clip: MediaCapture) => void;
  const release = jest.fn();
  const recordVideo = jest.fn(
    () =>
      new Promise<MediaCapture>(done => {
        finish = done;
      }),
  );
  const VideoPreview = createNativeCameraPreview({
    View: CameraView,
    requestPermission,
    recordVideo,
  });
  await act(async () => {
    renderer = TestRenderer.create(
      <VideoPreview
        active={true}
        mode="assessment"
        onReady={onReady}
        onError={onError}
      />,
    );
  });
  let recording!: Promise<unknown>;
  await act(async () => {
    recording = session!.recordVideo!();
  });
  await act(async () => {
    renderer.unmount();
  });
  finish({
    kind: 'video',
    uri: 'file:///app/cache/climbing-camera/climbing-123.mp4',
    filename: 'climbing-123.mp4',
    mimeType: 'video/mp4',
    release,
  });
  await expect(recording).resolves.toBeNull();
  expect(release).toHaveBeenCalledTimes(1);
});
