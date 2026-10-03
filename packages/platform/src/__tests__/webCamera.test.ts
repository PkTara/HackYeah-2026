import {
  createWebCamera,
  type CameraEnvironment,
  type VideoSurface,
} from '../webCamera';

function environment() {
  const track = {
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  const stream = { getTracks: () => [track] };
  const video: VideoSurface = {
    srcObject: null,
    videoWidth: 640,
    videoHeight: 480,
    play: async () => {},
  };
  const env: CameraEnvironment = {
    getUserMedia: async () => stream,
    createCanvas: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage() {} }),
      toBlob: callback =>
        callback(new Blob(['frame'], { type: 'image/jpeg', lastModified: 0 })),
    }),
    createUrl: () => 'blob:current-frame',
    revokeUrl() {},
  };
  return { track, stream, video, env };
}

test('starting a preview attaches the camera stream and closing releases it', async () => {
  const { track, stream, video, env } = environment();
  const camera = createWebCamera(env);
  await camera.start(video, 'assessment');
  expect(video.srcObject).toBe(stream);
  expect(track.stopped).toBe(false);
  camera.stop();
  expect(track.stopped).toBe(true);
  expect(video.srcObject).toBeNull();
});

test('snapshot captures current dimensions and a reviewable image without upload', async () => {
  const { video, env } = environment();
  const session = await createWebCamera(env).start(video, 'hand');
  const capture = await session.snapshot();
  expect(capture.kind).toBe('image');
  expect(capture.mimeType).toBe('image/jpeg');
  expect([capture.width, capture.height]).toEqual([640, 480]);
  expect(capture.uri).toBe('blob:current-frame');
  expect(capture.blob?.size).toBe(5);
});

test('closing while permission is pending releases the late stream instead of reopening', async () => {
  const { track, stream, video, env } = environment();
  let allow!: (value: typeof stream) => void;
  env.getUserMedia = () =>
    new Promise(resolve => {
      allow = resolve;
    });
  const camera = createWebCamera(env);
  const starting = camera.start(video, 'assessment');
  camera.stop();
  allow(stream);
  await expect(starting).rejects.toThrow('Camera was closed');
  expect(track.stopped).toBe(true);
  expect(video.srcObject).toBeNull();
});

test('a video recording becomes a reviewable clip after stopping', async () => {
  const { video, env } = environment();
  const recorder = {
    state: 'inactive',
    mimeType: 'video/webm',
    ondataavailable: null as ((event: { data: Blob }) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as (() => void) | null,
    start() {
      this.state = 'recording';
    },
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({
        data: new Blob(['clip'], { type: 'video/webm', lastModified: 0 }),
      });
      this.onstop?.();
    },
  };
  env.createRecorder = () => recorder;
  const session = await createWebCamera(env).start(video, 'assessment');
  expect(typeof session.startRecording).toBe('function');
  await session.startRecording!();
  expect(recorder.state).toBe('recording');
  const capture = await session.stopRecording!();
  expect(capture.kind).toBe('video');
  expect(capture.mimeType).toBe('video/webm');
  expect(capture.blob?.size).toBe(4);
});

test('snapshot waits for a visible frame and cannot use a closed session', async () => {
  const { video, env } = environment();
  const camera = createWebCamera(env);
  const session = await camera.start(video, 'assessment');
  video.videoWidth = 0;
  await expect(session.snapshot()).rejects.toThrow('Camera frame is not ready');
  video.videoWidth = 640;
  camera.stop();
  await expect(session.snapshot()).rejects.toThrow('Camera is closed');
});

test('a failed preview releases the granted camera instead of leaving it running', async () => {
  const { video, env, track } = environment();
  video.play = async () => {
    throw new Error('Playback blocked');
  };
  await expect(createWebCamera(env).start(video, 'hand')).rejects.toThrow(
    'Playback blocked',
  );
  expect(track.stopped).toBe(true);
  expect(video.srcObject).toBeNull();
});

test('closing preview cancels a pending recording and leaves no media URL behind', async () => {
  const { video, env, track } = environment();
  let createdUrls = 0;
  env.createUrl = () => {
    createdUrls += 1;
    return 'blob:clip';
  };
  const recorder = {
    state: 'inactive',
    mimeType: 'video/webm',
    ondataavailable: null as ((event: { data: Blob }) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as (() => void) | null,
    start() {
      this.state = 'recording';
    },
    stop() {
      this.state = 'inactive';
    },
  };
  env.createRecorder = () => recorder;
  const camera = createWebCamera(env);
  const session = await camera.start(video, 'assessment');
  await session.startRecording!();
  const finishing = session.stopRecording!();
  camera.stop();
  await expect(finishing).rejects.toThrow('Recording was cancelled');
  expect(recorder.state).toBe('inactive');
  expect(track.stopped).toBe(true);
  expect(createdUrls).toBe(0);
});

test('an empty recording cannot become a reviewable clip', async () => {
  const { video, env } = environment();
  const recorder = {
    state: 'inactive',
    mimeType: 'video/webm',
    ondataavailable: null as ((event: { data: Blob }) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as (() => void) | null,
    start() {
      this.state = 'recording';
    },
    stop() {
      this.state = 'inactive';
      this.onstop?.();
    },
  };
  env.createRecorder = () => recorder;
  const session = await createWebCamera(env).start(video, 'assessment');
  await session.startRecording!();
  await expect(session.stopRecording!()).rejects.toThrow(
    'No video frames were recorded',
  );
});

test('recorder errors detach late stop callbacks so no unreachable video URL is created', async () => {
  const { video, env } = environment();
  let urls = 0;
  env.createUrl = () => {
    urls++;
    return 'blob:late-video';
  };
  const recorder = {
    state: 'inactive',
    mimeType: 'video/webm',
    ondataavailable: null as ((event: { data: Blob }) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as (() => void) | null,
    start() {
      this.state = 'recording';
    },
    stop() {
      this.state = 'inactive';
    },
  };
  env.createRecorder = () => recorder;
  const camera = createWebCamera(env);
  const session = await camera.start(video, 'assessment');
  await session.startRecording!();
  const finishing = session.stopRecording!();
  recorder.onerror?.();
  recorder.ondataavailable?.({
    data: new Blob(['late'], { type: 'video/webm', lastModified: 0 }),
  });
  recorder.onstop?.();
  await expect(finishing).rejects.toThrow('Video recording failed');
  camera.stop();
  expect(urls).toBe(0);
  expect(recorder.onstop).toBeNull();
});
