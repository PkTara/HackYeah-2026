/**
 * A standalone browser page that wires @hackyeah/vision to MediaPipe the way
 * the web host would: camera, landmarker, counter, result. It is a developer
 * tool, not app UI. Run it from the repo root:
 *
 *   node apps/web/node_modules/vite/bin/vite.js --config packages/vision/harness/vite.config.mjs
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  BODY_LANDMARKS,
  MEDIAPIPE_POSE_MODELS,
  PullupCounter,
  analyzeClimbForm,
  createDeadHangTimer,
  createMediaPipeSource,
  createPlankTimer,
  createSimulatedSource,
  fromMediaPipeResult,
  type BodyLandmark,
  type KeypointSource,
  type KeypointSourceInfo,
  type LiveTestId,
  type PoseFrame,
} from '@hackyeah/vision';

const params = new URLSearchParams(location.search);
// "full" by default; see MEDIAPIPE_POSE_MODELS for why not "lite".
// "?model=/models/pose_landmarker_full.task" uses a local copy (offline use).
const MODEL_URL = params.get('model') ?? MEDIAPIPE_POSE_MODELS.full;
// CPU by default. In a headless check with software WebGL, the full model
// found nobody on the GPU delegate while CPU found the person, so GPU has to
// be checked per browser first: "?delegate=GPU".
const DELEGATE: 'GPU' | 'CPU' =
  params.get('delegate') === 'GPU' ? 'GPU' : 'CPU';
const MODEL_VERSION = `tasks-vision 1.0.1, ${
  MODEL_URL.split('/').pop() ?? 'unknown model'
}, ${DELEGATE}`;

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const testSelect = $<HTMLSelectElement>('test');
const video = $<HTMLVideoElement>('video');
const canvas = $<HTMLCanvasElement>('overlay');
const stage = $<HTMLDivElement>('stage');
const live = $<HTMLPreElement>('live');
const result = $<HTMLPreElement>('result');
const clip = $<HTMLInputElement>('clip');

type Counter = { push(frame: PoseFrame): unknown; finish(): unknown };

let running: {
  source: KeypointSource;
  counter: Counter;
  landmarker?: PoseLandmarker;
} | null = null;

/**
 * A new landmarker per run: VIDEO mode needs increasing timestamps, and the
 * camera clock and a file's clock start from different places.
 */
async function createLandmarker(): Promise<PoseLandmarker> {
  // The WASM files are served from the installed package (see vite.config.mjs).
  const fileset = await FilesetResolver.forVisionTasks('');
  const create = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  try {
    return await create(DELEGATE);
  } catch {
    // No WebGL in this browser: fall back to the CPU.
    return create('CPU');
  }
}

function counterFor(test: LiveTestId, source: KeypointSourceInfo): Counter {
  switch (test) {
    case 'pull-ups':
      return new PullupCounter({ source });
    case 'dead-hang':
      return createDeadHangTimer({ source });
    case 'plank':
      return createPlankTimer({ source });
  }
}

// COCO skeleton edges, drawn from the shared landmark names.
const EDGES: Array<[BodyLandmark, BodyLandmark]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_hip', 'right_hip'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

function draw(frame: PoseFrame): void {
  if (canvas.width !== frame.width || canvas.height !== frame.height) {
    canvas.width = frame.width;
    canvas.height = frame.height;
  }
  // Without a video (simulated frames) the stage takes the frame's shape.
  const noVideo = video.videoWidth === 0;
  stage.style.width = noVideo ? '360px' : '';
  stage.style.aspectRatio = noVideo ? `${frame.width} / ${frame.height}` : '';
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffd23f';
  EDGES.forEach(([a, b]) => {
    const p = frame.landmarks[a];
    const q = frame.landmarks[b];
    if (p && q && p.visibility >= 0.5 && q.visibility >= 0.5) {
      ctx.beginPath();
      ctx.moveTo(p.x * frame.width, p.y * frame.height);
      ctx.lineTo(q.x * frame.width, q.y * frame.height);
      ctx.stroke();
    }
  });
  ctx.fillStyle = '#f4f1e6';
  BODY_LANDMARKS.forEach(name => {
    const p = frame.landmarks[name];
    if (p && p.visibility >= 0.5) {
      ctx.fillRect(p.x * frame.width - 4, p.y * frame.height - 4, 8, 8);
    }
  });
}

function stopCamera(): void {
  const stream = video.srcObject as MediaStream | null;
  stream?.getTracks().forEach(track => track.stop());
  video.srcObject = null;
}

function stop(): void {
  if (!running) {
    return;
  }
  running.source.stop();
  running.landmarker?.close();
  result.textContent = JSON.stringify(running.counter.finish(), null, 2);
  running = null;
  stopCamera();
}

async function run(
  source: KeypointSource,
  landmarker?: PoseLandmarker,
): Promise<void> {
  const counter = counterFor(testSelect.value as LiveTestId, source.info);
  running = { source, counter, landmarker };
  result.textContent = 'Running. Press "Stop and show result" when done.';
  await source.start(
    frame => {
      live.textContent = JSON.stringify(counter.push(frame), null, 2);
      draw(frame);
    },
    error => {
      live.textContent = `Pose detection stopped: ${error.message}`;
    },
  );
}

$<HTMLButtonElement>('camera').onclick = async () => {
  stop();
  live.textContent = 'Starting the camera and the model...';
  try {
    video.removeAttribute('src');
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    await video.play();
    const landmarker = await createLandmarker();
    await run(
      createMediaPipeSource({
        landmarker,
        video,
        info: { modelVersion: MODEL_VERSION },
      }),
      landmarker,
    );
  } catch (error) {
    live.textContent = `Could not start the camera or the model: ${String(
      error,
    )}`;
  }
};

$<HTMLButtonElement>('simulate').onclick = () => {
  stop();
  stopCamera();
  video.removeAttribute('src');
  video.load();
  run(createSimulatedSource(testSelect.value as LiveTestId)).catch(error => {
    live.textContent = String(error);
  });
};

$<HTMLButtonElement>('stop').onclick = stop;

// Climbing form from a local video file: every frame stays on this device.
// The clip is stepped through at a fixed rate by seeking, not played, so a
// slow device analyses the same frames as a fast one.
const ANALYSIS_FPS = 15;

function seek(time: number): Promise<void> {
  return new Promise(resolve => {
    video.addEventListener('seeked', () => resolve(), { once: true });
    video.currentTime = time;
  });
}

clip.onchange = async () => {
  const file = clip.files?.[0];
  if (!file) {
    return;
  }
  stop();
  result.textContent = 'Loading the model...';
  const landmarker = await createLandmarker();
  const frames: PoseFrame[] = [];
  video.srcObject = null;
  video.src = URL.createObjectURL(file);
  await new Promise(resolve =>
    video.addEventListener('loadeddata', resolve, { once: true }),
  );
  video.pause();
  result.textContent = 'Analysing the clip...';
  for (let i = 0; i / ANALYSIS_FPS <= video.duration; i += 1) {
    const time = i / ANALYSIS_FPS;
    await seek(time);
    // VIDEO mode needs increasing timestamps; start at 1 ms.
    const t = 1 + Math.round(time * 1000);
    const frame = fromMediaPipeResult(
      landmarker.detectForVideo(video, t),
      t,
      video.videoWidth,
      video.videoHeight,
    );
    frames.push(frame);
    draw(frame);
    live.textContent = `${frames.length} frames analysed`;
  }
  landmarker.close();
  const report = analyzeClimbForm(frames, {
    source: {
      id: 'mediapipe-web',
      model: 'MediaPipe Pose Landmarker (BlazePose GHUM 3D)',
      modelVersion: MODEL_VERSION,
      landmarkSet: 'mediapipe-33',
      runsOn: 'device',
      simulated: false,
    },
  });
  result.textContent = JSON.stringify(report, null, 2);
};
