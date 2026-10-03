import { createHarmonyMediaAdapter } from '../harmonyCamera';
test('decodes native JPEG bytes for the live WebSocket frame', async () => {
  const native = {
    releaseVideo: jest.fn().mockResolvedValue(undefined),
    readFrame: jest.fn().mockResolvedValue('/9j/'),
    recordVideo: jest.fn(),
  };
  const adapter = createHarmonyMediaAdapter(native);
  await expect(adapter.readBytes('file:///cache/frame.jpeg')).resolves.toEqual(
    new Uint8Array([255, 216, 255]),
  );
  expect(native.readFrame).toHaveBeenCalledWith('file:///cache/frame.jpeg');
});
test('normalizes the system video picker result into an uploadable clip', async () => {
  const native = {
    releaseVideo: jest.fn().mockResolvedValue(undefined),
    readFrame: jest.fn(),
    recordVideo: jest.fn().mockResolvedValue({
      uri: 'file:///cache/climbing-1.mp4',
      filename: 'climbing-1.mp4',
    }),
  };
  const clip = await createHarmonyMediaAdapter(native).recordVideo('back');
  expect(clip).toMatchObject({
    kind: 'video',
    uri: 'file:///cache/climbing-1.mp4',
    filename: 'climbing-1.mp4',
    mimeType: 'video/mp4',
  });
  expect(native.recordVideo).toHaveBeenCalledWith('back');
});
test('preserves user cancellation from the system recorder', async () => {
  const native = {
    releaseVideo: jest.fn().mockResolvedValue(undefined),
    readFrame: jest.fn(),
    recordVideo: jest.fn().mockResolvedValue(null),
  };
  await expect(
    createHarmonyMediaAdapter(native).recordVideo('back'),
  ).resolves.toBeNull();
});
test('forwards explicit frame cleanup to the scoped native cache module', async () => {
  const releaseFrame = jest.fn().mockResolvedValue(undefined);
  const native = {
    readFrame: jest.fn(),
    recordVideo: jest.fn(),
    releaseFrame,
    releaseVideo: jest.fn(),
  };
  await createHarmonyMediaAdapter(native).releaseFrame(
    'file:///cache/climbing-camera/1.jpeg',
  );
  expect(releaseFrame).toHaveBeenCalledWith(
    'file:///cache/climbing-camera/1.jpeg',
  );
});
test('releases a successful private video only when its owner discards it', async () => {
  const releaseVideo = jest.fn().mockResolvedValue(undefined);
  const native = {
    readFrame: jest.fn(),
    recordVideo: jest
      .fn()
      .mockResolvedValue({
        uri: 'file:///app/cache/climbing-camera/climbing-123.mp4',
        filename: 'climbing-123.mp4',
      }),
    releaseVideo,
  };
  const clip = await createHarmonyMediaAdapter(native).recordVideo('back');
  expect(releaseVideo).not.toHaveBeenCalled();
  expect(typeof clip!.release).toBe('function');
  clip!.release!();
  clip!.release!();
  expect(releaseVideo).toHaveBeenCalledTimes(1);
  expect(releaseVideo).toHaveBeenCalledWith(
    'file:///app/cache/climbing-camera/climbing-123.mp4',
  );
});
