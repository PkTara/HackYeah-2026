import {
  cameraFramePath,
  cameraVideoPath,
  assertCameraFrameSize,
  assertCameraVideoSize,
} from '../../../../apps/mobile/harmony/entry/src/main/ets/camera/CameraMediaPolicy';
test('allows only a captured JPEG inside the application camera cache', () => {
  expect(
    cameraFramePath('file:///app/cache/climbing-camera/123.jpeg', '/app/cache'),
  ).toBe('/app/cache/climbing-camera/123.jpeg');
});
test('rejects a read outside the camera cache', () => {
  expect(() =>
    cameraFramePath('file:///app/cache/profile.json', '/app/cache'),
  ).toThrow('Only captured camera frames can be read.');
});
test('rejects traversal disguised as a frame filename', () => {
  expect(() =>
    cameraFramePath(
      'file:///app/cache/climbing-camera/../123.jpeg',
      '/app/cache',
    ),
  ).toThrow('Only captured camera frames can be read.');
});
test('limits a frame read to eight MiB', () => {
  expect(() => assertCameraFrameSize(8 * 1024 * 1024 + 1)).toThrow(
    'Camera frame exceeds the 8 MiB limit.',
  );
});

test('allows removal of only a camera-created private MP4', () => {
  expect(
    cameraVideoPath(
      'file:///app/cache/climbing-camera/climbing-123.mp4',
      '/app/cache',
    ),
  ).toBe('/app/cache/climbing-camera/climbing-123.mp4');
});
test('rejects video removal outside the app camera cache', () => {
  expect(() =>
    cameraVideoPath('file:///app/files/climbing-123.mp4', '/app/cache'),
  ).toThrow('Only recorded camera videos can be removed.');
});
test('rejects traversal in video removal paths', () => {
  expect(() =>
    cameraVideoPath(
      'file:///app/cache/climbing-camera/../climbing-123.mp4',
      '/app/cache',
    ),
  ).toThrow('Only recorded camera videos can be removed.');
});
test('keeps video removal separate from frame reads and unrelated cache files', () => {
  expect(() =>
    cameraFramePath(
      'file:///app/cache/climbing-camera/climbing-123.mp4',
      '/app/cache',
    ),
  ).toThrow('Only captured camera frames can be read.');
  expect(() =>
    cameraVideoPath(
      'file:///app/cache/climbing-camera/profile.json',
      '/app/cache',
    ),
  ).toThrow('Only recorded camera videos can be removed.');
});

test('rejects a private clip exceeding the upload size limit', () => {
  expect(() => assertCameraVideoSize(32 * 1024 * 1024 + 1)).toThrow(
    'Video exceeds the 32 MiB upload limit. Record a shorter clip.',
  );
});
test('rejects an empty system camera result before review', () => {
  expect(() => assertCameraVideoSize(0)).toThrow(
    'The system camera returned an empty video.',
  );
});
