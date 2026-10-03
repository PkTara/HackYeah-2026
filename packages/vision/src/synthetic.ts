/**
 * Synthetic sessions: a 2D stick figure doing pull-ups, a dead hang or a
 * plank, as PoseFrames.
 *
 * Used by the unit tests, by the web harness, and as a clearly labelled
 * "simulated camera" for demos on platforms without a pose model yet. The
 * numbers are made up to look like a phone video (30 fps, a few pixels of
 * jitter); they are not recordings of a real person. Deterministic for a given
 * seed.
 */
import type { LandmarkName, PoseFrame } from './pose';
import {
  createReplaySource,
  type KeypointSource,
  type ReplayOptions,
} from './sources';
import type { LiveTestId } from './result';

type Px = { x: number; y: number };
type Body = Partial<Record<LandmarkName, Px>>;

/** Deterministic random numbers in [0, 1). A plain LCG, no bitwise operators. */
export function createRandom(seed: number): () => number {
  let state = Math.floor(Math.abs(seed)) % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

const smoothstep = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

type FrameStyle = {
  width: number;
  height: number;
  noisePx: number;
  visibility: number;
  random: () => number;
  /** Lower visibility for points on the far side of the body. */
  farSide?: 'left' | 'right';
};

function toFrame(t: number, body: Body | null, style: FrameStyle): PoseFrame {
  const landmarks: PoseFrame['landmarks'] = {};
  if (body) {
    const out: Partial<
      Record<LandmarkName, { x: number; y: number; visibility: number }>
    > = {};
    (Object.keys(body) as LandmarkName[]).forEach(name => {
      const p = body[name] as Px;
      const far = style.farSide !== undefined && name.startsWith(style.farSide);
      out[name] = {
        x: (p.x + gaussian(style.random) * style.noisePx) / style.width,
        y: (p.y + gaussian(style.random) * style.noisePx) / style.height,
        visibility: far ? 0.3 : style.visibility,
      };
    });
    return { t, width: style.width, height: style.height, landmarks: out };
  }
  return { t, width: style.width, height: style.height, landmarks };
}

/** Elbow position for a two-segment arm, bent away from `awayFromX`. */
function elbowFor(
  shoulder: Px,
  wrist: Px,
  upper: number,
  fore: number,
  awayFromX: number,
): Px {
  const dx = wrist.x - shoulder.x;
  const dy = wrist.y - shoulder.y;
  const d = Math.min(
    upper + fore - 1e-6,
    Math.max(Math.abs(upper - fore) + 1e-6, Math.hypot(dx, dy)),
  );
  const angle = Math.acos(
    Math.min(
      1,
      Math.max(-1, (upper * upper + d * d - fore * fore) / (2 * upper * d)),
    ),
  );
  const base = Math.atan2(dy, dx);
  const candidates = [base + angle, base - angle].map(a => ({
    x: shoulder.x + upper * Math.cos(a),
    y: shoulder.y + upper * Math.sin(a),
  }));
  return Math.abs(candidates[0].x - awayFromX) >=
    Math.abs(candidates[1].x - awayFromX)
    ? candidates[0]
    : candidates[1];
}

// Front view on a portrait 720 x 1280 frame, as for pull-ups and dead hangs.
const FRONT = { width: 720, height: 1280, cx: 360, barY: 200 };
const UPPER = 150;
const FORE = 140;
const GRIP = 115; // wrists from the centre line
const SHOULDER = 90; // shoulders from the centre line
const HANG_DROP = Math.sqrt((UPPER + FORE) ** 2 - (GRIP - SHOULDER) ** 2);

function head(nose: Px): Body {
  return {
    nose,
    left_eye: { x: nose.x + 18, y: nose.y - 14 },
    right_eye: { x: nose.x - 18, y: nose.y - 14 },
    left_ear: { x: nose.x + 40, y: nose.y - 4 },
    right_ear: { x: nose.x - 40, y: nose.y - 4 },
  };
}

/**
 * Hanging from the bar with the shoulders `rise` px above a straight-arm
 * hang. The person faces the camera, so their left side is on the image right.
 */
function hangingBody(rise: number): Body {
  const { cx, barY } = FRONT;
  const wristY = barY + 12;
  const shoulderY = wristY + HANG_DROP - rise;
  const body: Body = { ...head({ x: cx, y: shoulderY - 95 }) };
  (
    [
      ['left', 1],
      ['right', -1],
    ] as const
  ).forEach(([side, sign]) => {
    const shoulder = { x: cx + sign * SHOULDER, y: shoulderY };
    const wrist = { x: cx + sign * GRIP, y: wristY };
    body[`${side}_shoulder`] = shoulder;
    body[`${side}_wrist`] = wrist;
    body[`${side}_elbow`] = elbowFor(shoulder, wrist, UPPER, FORE, cx);
    const hip = { x: cx + sign * 55, y: shoulderY + 240 };
    const knee = { x: cx + sign * 52, y: hip.y + 210 };
    body[`${side}_hip`] = hip;
    body[`${side}_knee`] = knee;
    body[`${side}_ankle`] = { x: cx + sign * 48, y: knee.y + 200 };
  });
  return body;
}

/** Standing under the bar with the arms down. */
function standingBody(): Body {
  const { cx } = FRONT;
  const shoulderY = 620;
  const body: Body = { ...head({ x: cx, y: shoulderY - 95 }) };
  (
    [
      ['left', 1],
      ['right', -1],
    ] as const
  ).forEach(([side, sign]) => {
    body[`${side}_shoulder`] = { x: cx + sign * SHOULDER, y: shoulderY };
    body[`${side}_elbow`] = { x: cx + sign * 102, y: shoulderY + 150 };
    body[`${side}_wrist`] = { x: cx + sign * 106, y: shoulderY + 290 };
    body[`${side}_hip`] = { x: cx + sign * 55, y: shoulderY + 240 };
    body[`${side}_knee`] = { x: cx + sign * 52, y: shoulderY + 450 };
    body[`${side}_ankle`] = { x: cx + sign * 48, y: shoulderY + 640 };
  });
  return body;
}

type Segment = { durationS: number; body: (progress: number) => Body | null };

function render(
  segments: Segment[],
  fps: number,
  style: FrameStyle,
): PoseFrame[] {
  const frames: PoseFrame[] = [];
  const step = 1000 / fps;
  let t = 0;
  segments.forEach(segment => {
    const count = Math.max(1, Math.round(segment.durationS * fps));
    for (let i = 0; i < count; i += 1) {
      frames.push(toFrame(Math.round(t), segment.body(i / count), style));
      t += step;
    }
  });
  return frames;
}

export type SyntheticCommon = Readonly<{
  fps?: number;
  noisePx?: number;
  visibility?: number;
  seed?: number;
  /** Seconds into the session when the person disappears (no detection). */
  dropoutAtS?: number;
  dropoutForS?: number;
}>;

function withDropout(segments: Segment[], opts: SyntheticCommon): Segment[] {
  if (opts.dropoutAtS === undefined || !opts.dropoutForS) {
    return segments;
  }
  // Split the timeline at the dropout and replace that span with empty frames.
  const out: Segment[] = [];
  let start = 0;
  const from = opts.dropoutAtS;
  const to = from + opts.dropoutForS;
  segments.forEach(seg => {
    const end = start + seg.durationS;
    const pieces: Array<[number, number, boolean]> = [];
    if (end <= from || start >= to) {
      pieces.push([start, end, false]);
    } else {
      if (start < from) {
        pieces.push([start, from, false]);
      }
      pieces.push([Math.max(start, from), Math.min(end, to), true]);
      if (end > to) {
        pieces.push([to, end, false]);
      }
    }
    pieces.forEach(([a, b, gone]) => {
      if (b - a > 1e-9) {
        out.push({
          durationS: b - a,
          body: gone
            ? () => null
            : p => seg.body((a - start + p * (b - a)) / seg.durationS),
        });
      }
    });
    start = end;
  });
  return out;
}

function frameStyle(
  opts: SyntheticCommon,
  width: number,
  height: number,
  farSide?: 'left' | 'right',
): FrameStyle {
  return {
    width,
    height,
    noisePx: opts.noisePx ?? 2,
    visibility: opts.visibility ?? 0.95,
    random: createRandom(opts.seed ?? 7),
    farSide,
  };
}

export type SyntheticPullupOptions = SyntheticCommon &
  Readonly<{
    /** Number of attempts (default 5). */
    reps?: number;
    /** Attempts (0-based) that stop half way and do not reach the bar. */
    partialAt?: readonly number[];
    ascentS?: number;
    descentS?: number;
    topHoldS?: number;
    /** Straight-arm hang between reps. */
    restS?: number;
  }>;

/** Stand, grab the bar, do the reps, hang a moment, let go. */
export function syntheticPullupSession(
  opts: SyntheticPullupOptions = {},
): PoseFrame[] {
  const reps = opts.reps ?? 5;
  const ascent = opts.ascentS ?? 1.0;
  const descent = opts.descentS ?? 1.2;
  const top = HANG_DROP - 60; // shoulders 60 px under the wrists: nose clears them
  const half = HANG_DROP - 150; // nose stays under the wrists
  const segments: Segment[] = [
    { durationS: 1.0, body: () => standingBody() },
    { durationS: 1.5, body: () => hangingBody(0) },
  ];
  for (let i = 0; i < reps; i += 1) {
    const peak = opts.partialAt?.includes(i) ? half : top;
    segments.push(
      { durationS: ascent, body: p => hangingBody(peak * smoothstep(p)) },
      { durationS: opts.topHoldS ?? 0.2, body: () => hangingBody(peak) },
      {
        durationS: descent,
        body: p => hangingBody(peak * (1 - smoothstep(p))),
      },
      { durationS: opts.restS ?? 0.6, body: () => hangingBody(0) },
    );
  }
  segments.push(
    { durationS: 0.6, body: () => hangingBody(0) },
    { durationS: 1.0, body: () => standingBody() },
  );
  return render(
    withDropout(segments, opts),
    opts.fps ?? 30,
    frameStyle(opts, FRONT.width, FRONT.height),
  );
}

export type SyntheticHangOptions = SyntheticCommon &
  Readonly<{
    /** Straight-arm hang length (default 10 s). */
    holdS?: number;
    /** Seconds into the hang when the arms bend (pull up a little). */
    bendAtS?: number;
    bendForS?: number;
  }>;

/** Stand, hang with straight arms, let go. */
export function syntheticHangSession(
  opts: SyntheticHangOptions = {},
): PoseFrame[] {
  const holdS = opts.holdS ?? 10;
  const hang: Segment[] = [];
  if (opts.bendAtS !== undefined && opts.bendForS) {
    hang.push(
      { durationS: opts.bendAtS, body: () => hangingBody(0) },
      { durationS: opts.bendForS, body: () => hangingBody(100) },
      {
        durationS: Math.max(0, holdS - opts.bendAtS - opts.bendForS),
        body: () => hangingBody(0),
      },
    );
  } else {
    hang.push({ durationS: holdS, body: () => hangingBody(0) });
  }
  const segments: Segment[] = [
    { durationS: 1.0, body: () => standingBody() },
    ...hang.filter(s => s.durationS > 0),
    { durationS: 1.5, body: () => standingBody() },
  ];
  return render(
    withDropout(segments, opts),
    opts.fps ?? 30,
    frameStyle(opts, FRONT.width, FRONT.height),
  );
}

// Side view on a landscape 1280 x 720 frame, head to the right, left side to the camera.
const SIDE = { width: 1280, height: 720 };

function plankBody(hipOffsetPx: number): Body {
  const shoulder = { x: 900, y: 460 };
  const ankle = { x: 330, y: 600 };
  const lineY = (x: number) =>
    shoulder.y +
    ((x - shoulder.x) * (ankle.y - shoulder.y)) / (ankle.x - shoulder.x);
  const near: Body = {
    left_shoulder: shoulder,
    left_elbow: { x: 900, y: 610 },
    left_wrist: { x: 1010, y: 615 },
    left_hip: { x: 610, y: lineY(610) + hipOffsetPx },
    left_knee: { x: 470, y: lineY(470) + hipOffsetPx * 0.45 },
    left_ankle: ankle,
  };
  return withFarSide(near, {
    nose: { x: 1005, y: 445 },
    left_eye: { x: 990, y: 433 },
    right_eye: { x: 996, y: 431 },
    left_ear: { x: 960, y: 440 },
    right_ear: { x: 966, y: 437 },
  });
}

function standingSideBody(): Body {
  const near: Body = {
    left_shoulder: { x: 640, y: 250 },
    left_elbow: { x: 645, y: 330 },
    left_wrist: { x: 650, y: 410 },
    left_hip: { x: 640, y: 450 },
    left_knee: { x: 642, y: 540 },
    left_ankle: { x: 640, y: 630 },
  };
  return withFarSide(near, {
    nose: { x: 690, y: 200 },
    left_eye: { x: 680, y: 188 },
    right_eye: { x: 684, y: 186 },
    left_ear: { x: 650, y: 195 },
    right_ear: { x: 656, y: 192 },
  });
}

function lyingBody(): Body {
  const near: Body = {
    left_shoulder: { x: 900, y: 600 },
    left_elbow: { x: 980, y: 606 },
    left_wrist: { x: 1060, y: 610 },
    left_hip: { x: 610, y: 605 },
    left_knee: { x: 470, y: 608 },
    left_ankle: { x: 330, y: 610 },
  };
  return withFarSide(near, {
    nose: { x: 1005, y: 590 },
    left_eye: { x: 990, y: 580 },
    right_eye: { x: 996, y: 578 },
    left_ear: { x: 960, y: 585 },
    right_ear: { x: 966, y: 582 },
  });
}

/** Adds the far (right) side a few pixels behind the near side, plus the head. */
function withFarSide(near: Body, headPoints: Body): Body {
  const body: Body = { ...headPoints, ...near };
  (Object.keys(near) as LandmarkName[]).forEach(name => {
    const p = near[name] as Px;
    body[name.replace('left_', 'right_') as LandmarkName] = {
      x: p.x - 8,
      y: p.y - 6,
    };
  });
  return body;
}

export type SyntheticPlankOptions = SyntheticCommon &
  Readonly<{
    /** Plank length (default 10 s). */
    holdS?: number;
    /** Seconds into the plank when the hips start to sag (and stay down). */
    sagAfterS?: number;
    /** How far the hips drop below the line, in px (default 80, about 150 degrees at the hip). */
    sagPx?: number;
  }>;

/** Stand side-on, plank, then drop to the floor. */
export function syntheticPlankSession(
  opts: SyntheticPlankOptions = {},
): PoseFrame[] {
  const holdS = opts.holdS ?? 10;
  const sagPx = opts.sagPx ?? 80;
  const plank: Segment[] =
    opts.sagAfterS !== undefined && opts.sagAfterS < holdS
      ? [
          { durationS: opts.sagAfterS, body: () => plankBody(0) },
          { durationS: holdS - opts.sagAfterS, body: () => plankBody(sagPx) },
        ]
      : [{ durationS: holdS, body: () => plankBody(0) }];
  const segments: Segment[] = [
    { durationS: 1.0, body: () => standingSideBody() },
    ...plank,
    { durationS: 1.5, body: () => lyingBody() },
  ];
  return render(
    withDropout(segments, opts),
    opts.fps ?? 30,
    frameStyle(opts, SIDE.width, SIDE.height, 'right'),
  );
}

/** Synthetic frames for a test, with default options. */
export function syntheticSession(test: LiveTestId, seed = 7): PoseFrame[] {
  switch (test) {
    case 'pull-ups':
      return syntheticPullupSession({ seed, partialAt: [3] });
    case 'dead-hang':
      return syntheticHangSession({ seed, holdS: 12 });
    case 'plank':
      return syntheticPlankSession({ seed, holdS: 15, sagAfterS: 11 });
  }
}

/**
 * A "camera" that plays a synthetic session in real time. For demos on
 * platforms without a pose model. Results from it carry `simulated: true`
 * and must be labelled as simulated on screen.
 */
export function createSimulatedSource(
  test: LiveTestId,
  options: ReplayOptions & { seed?: number } = {},
): KeypointSource {
  return createReplaySource(syntheticSession(test, options.seed), {
    ...options,
    info: {
      id: 'simulated',
      model: 'synthetic stick figure',
      modelVersion: 'synthetic-1',
      simulated: true,
      ...options.info,
    },
  });
}

// A climb filmed from behind (or from the side) with a still camera, portrait
// 720 x 1280. One torso length is 240 px.

type Stance = { hip: Px; hands: [Px, Px]; feet: [Px, Px] };
type ArmShape = 'straight' | 'bent' | 'down';

const lerp = (a: Px, b: Px, f: number): Px => ({
  x: a.x + (b.x - a.x) * f,
  y: a.y + (b.y - a.y) * f,
});

function lerpStance(a: Stance, b: Stance, f: number): Stance {
  return {
    hip: lerp(a.hip, b.hip, f),
    hands: [lerp(a.hands[0], b.hands[0], f), lerp(a.hands[1], b.hands[1], f)],
    feet: [lerp(a.feet[0], b.feet[0], f), lerp(a.feet[1], b.feet[1], f)],
  };
}

/**
 * `squeeze` scales left-right offsets: 1 seen from behind, small seen from
 * the side (both shoulders almost on top of each other).
 */
function makeStance(
  hip: Px,
  arms: [ArmShape, ArmShape],
  feet: [Px, Px],
  squeeze: number,
): Stance {
  const shoulderY = hip.y - 240;
  const hands = ([0, 1] as const).map(k => {
    const sign = k === 0 ? -1 : 1;
    const shoulder = { x: hip.x + sign * 90 * squeeze, y: shoulderY };
    const out = sign * 40 * squeeze;
    switch (arms[k]) {
      case 'straight':
        return {
          x: shoulder.x + out,
          y: shoulderY - Math.sqrt(289 ** 2 - out ** 2),
        };
      case 'bent':
        return { x: shoulder.x + out, y: shoulderY - 150 };
      case 'down':
        return { x: shoulder.x + sign * 15 * squeeze, y: shoulderY + 285 };
    }
  }) as [Px, Px];
  const foot = (p: Px) => ({ x: hip.x + (p.x - hip.x) * squeeze, y: p.y });
  return { hip, hands, feet: [foot(feet[0]), foot(feet[1])] };
}

function climberBody(st: Stance, squeeze: number): Body {
  const mid = { x: st.hip.x, y: st.hip.y - 240 };
  // Seen from behind, the climber's left is on the image left.
  const body: Body = { ...head({ x: mid.x, y: mid.y - 95 }) };
  (
    [
      ['left', -1, 0],
      ['right', 1, 1],
    ] as const
  ).forEach(([side, sign, k]) => {
    const shoulder = { x: mid.x + sign * 90 * squeeze, y: mid.y };
    const hipSide = { x: st.hip.x + sign * 55 * squeeze, y: st.hip.y };
    body[`${side}_shoulder`] = shoulder;
    body[`${side}_wrist`] = st.hands[k];
    body[`${side}_elbow`] = elbowFor(shoulder, st.hands[k], UPPER, FORE, mid.x);
    body[`${side}_hip`] = hipSide;
    body[`${side}_ankle`] = st.feet[k];
    body[`${side}_knee`] = elbowFor(hipSide, st.feet[k], 220, 210, st.hip.x);
  });
  return body;
}

export type SyntheticClimbOptions = SyntheticCommon &
  Readonly<{
    /** "back" (default): camera behind the climber. "side": camera side on. */
    view?: 'back' | 'side';
  }>;

/**
 * About 12.7 s: stand, step on, rest on straight arms (2 s), move up, rest
 * on bent arms (2 s) while re-placing the left foot a few cm, jump up fast,
 * short rest, move up, rest on straight arms (2 s), drop off, stand.
 */
export function syntheticClimbSession(
  opts: SyntheticClimbOptions = {},
): PoseFrame[] {
  const squeeze = opts.view === 'side' ? 0.08 : 1;
  const st = (hip: Px, arms: [ArmShape, ArmShape], l: Px, r: Px) =>
    makeStance(hip, arms, [l, r], squeeze);
  const stand = st(
    { x: 360, y: 900 },
    ['down', 'down'],
    { x: 320, y: 1250 },
    { x: 400, y: 1250 },
  );
  const s1 = st(
    { x: 360, y: 780 },
    ['straight', 'straight'],
    { x: 310, y: 1090 },
    { x: 410, y: 1060 },
  );
  const s2 = st(
    { x: 380, y: 640 },
    ['bent', 'bent'],
    { x: 330, y: 960 },
    { x: 430, y: 930 },
  );
  const s2b = st(
    { x: 380, y: 640 },
    ['bent', 'bent'],
    { x: 360, y: 935 },
    { x: 430, y: 930 },
  );
  const s3 = st(
    { x: 380, y: 480 },
    ['straight', 'straight'],
    { x: 330, y: 820 },
    { x: 430, y: 800 },
  );
  const s4 = st(
    { x: 360, y: 360 },
    ['straight', 'straight'],
    { x: 310, y: 700 },
    { x: 410, y: 680 },
  );

  const hold = (stance: Stance, durationS: number): Segment => ({
    durationS,
    body: () => climberBody(stance, squeeze),
  });
  const move = (from: Stance, to: Stance, durationS: number): Segment => ({
    durationS,
    body: p => climberBody(lerpStance(from, to, smoothstep(p)), squeeze),
  });
  const segments: Segment[] = [
    hold(stand, 1.0),
    move(stand, s1, 0.8),
    hold(s1, 2.0),
    move(s1, s2, 1.2),
    hold(s2, 0.6),
    move(s2, s2b, 0.3), // the left foot shifts about 0.16 torso lengths
    hold(s2b, 1.1),
    move(s2b, s3, 0.25), // fast
    hold(s3, 0.8),
    move(s3, s4, 1.0),
    hold(s4, 2.0),
    move(s4, stand, 0.6), // drop off
    hold(stand, 1.0),
  ];
  return render(
    withDropout(segments, opts),
    opts.fps ?? 30,
    frameStyle(opts, FRONT.width, FRONT.height),
  );
}
