/**
 * Pull-ups, counted live from a front view.
 *
 * Signals, all relative to the body so camera distance does not matter:
 *   - elbow angle: both arms at least `straightElbowDeg` means hanging with
 *     straight arms (the start position);
 *   - progress: how far the shoulders have risen towards the hands, as a share
 *     of this person's own hang (calibrated from their hanging frames, so grip
 *     width does not matter);
 *   - top: the nose above the line of the wrists. The wrist sits a few cm
 *     below the bar, so this is a slightly lenient stand-in for "chin over the
 *     bar". vision-demos (chin_ups) uses the eyes, which is more lenient still.
 *
 * Each signal goes through a 3-frame running median before any threshold.
 */
import {
  angleDeg,
  distance,
  meanPoint,
  pointOf,
  visibilityOf,
  type Point,
} from './geometry';
import type { BodyLandmark, PoseFrame } from './pose';
import {
  RepCounter,
  type RepCounterOptions,
  type RepMetrics,
  type RepReading,
  type RepRule,
  type RepLiveState,
  type PartialRep,
} from './repCounter';
import type { TestResult } from './result';
import { round } from './result';
import { median, RunningMedian } from './smoothing';
import type { KeypointSourceInfo } from './sources';

export type PullupSettings = Readonly<{
  /** Landmarks less visible than this are ignored. */
  minVisibility: number;
  /** Both elbows at least this straight counts as hanging. */
  straightElbowDeg: number;
  /** How far above the wrists the nose must be at the top, in hang lengths (0 = level). */
  topNoseMargin: number;
  /** Progress also needed at the top, so a nose glitch alone never counts. */
  topProgress: number;
  /** Wrists may sit this far below the shoulders (in arm lengths) and still count as on the bar. */
  handsOnBarSlack: number;
  /** Running-median length for every signal. */
  smoothFrames: number;
}>;

export const DEFAULT_PULLUP_SETTINGS: PullupSettings = {
  minVisibility: 0.5,
  straightElbowDeg: 150,
  topNoseMargin: 0,
  topProgress: 0.5,
  handsOnBarSlack: 0.25,
  smoothFrames: 3,
};

const NEEDS: readonly BodyLandmark[] = [
  'nose',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
];

type Arm = { shoulder: Point; elbow: Point; wrist: Point };

function arm(
  frame: PoseFrame,
  side: 'left' | 'right',
  min: number,
): Arm | null {
  const shoulder = pointOf(frame, `${side}_shoulder`, min);
  const elbow = pointOf(frame, `${side}_elbow`, min);
  const wrist = pointOf(frame, `${side}_wrist`, min);
  return shoulder && elbow && wrist ? { shoulder, elbow, wrist } : null;
}

export function createPullupRule(
  overrides: Partial<PullupSettings> = {},
): RepRule {
  const s: PullupSettings = { ...DEFAULT_PULLUP_SETTINGS, ...overrides };
  const elbowSmooth = new RunningMedian(s.smoothFrames);
  const progressSmooth = new RunningMedian(s.smoothFrames);
  const noseSmooth = new RunningMedian(s.smoothFrames);
  // Shoulder-to-wrist height while hanging with straight arms, per frame.
  let hangDrops: number[] = [];

  const notVisible = (confidence: number): RepReading => ({
    visible: false,
    confidence,
    engaged: false,
    atStart: false,
    atTarget: false,
    progress: NaN,
  });

  return {
    test: 'pull-ups',
    methodId: 'pull-up-counter',
    version: '1.0.0',
    settings: s,
    setup: {
      view: 'front',
      parts: ['head', 'shoulder', 'elbow', 'wrist'],
      sides: 'both',
    },
    reset() {
      elbowSmooth.reset();
      progressSmooth.reset();
      noseSmooth.reset();
      hangDrops = [];
    },
    read(frame) {
      const confidence =
        NEEDS.reduce((sum, name) => sum + visibilityOf(frame, name), 0) /
        NEEDS.length;
      const arms = [
        arm(frame, 'left', s.minVisibility),
        arm(frame, 'right', s.minVisibility),
      ].filter((a): a is Arm => a !== null);
      if (arms.length === 0) {
        return notVisible(confidence);
      }

      const wrists = meanPoint(arms.map(a => a.wrist)) as Point;
      const shoulders = meanPoint(arms.map(a => a.shoulder)) as Point;
      // The less foreshortened arm is the better length estimate.
      const armLength = Math.max(
        ...arms.map(
          a => distance(a.shoulder, a.elbow) + distance(a.elbow, a.wrist),
        ),
      );
      const elbowRaw = Math.min(
        ...arms.map(a => angleDeg(a.shoulder, a.elbow, a.wrist)),
      );
      // Positive while the wrists are above the shoulders (image y grows down).
      const drop = shoulders.y - wrists.y;
      const engaged = wrists.y < shoulders.y + s.handsOnBarSlack * armLength;

      if (engaged && drop > 0 && elbowRaw >= s.straightElbowDeg) {
        hangDrops.push(drop);
        if (hangDrops.length > 15) {
          hangDrops.shift();
        }
      }
      const hang = hangDrops.length ? median(hangDrops) : 0.9 * armLength;
      const progressRaw = Math.min(1.5, Math.max(-0.5, 1 - drop / hang));

      const nose = pointOf(frame, 'nose', s.minVisibility);
      const noseMarginRaw = nose ? (wrists.y - nose.y) / hang : NaN;

      const elbow = elbowSmooth.push(elbowRaw);
      const progress = progressSmooth.push(progressRaw);
      // A missing nose resets its smoothing, so a stale value never counts a rep.
      const noseMargin = nose ? noseSmooth.push(noseMarginRaw) : NaN;
      if (!nose) {
        noseSmooth.reset();
      }

      return {
        visible: true,
        confidence,
        engaged,
        atStart: engaged && elbow >= s.straightElbowDeg,
        atTarget:
          engaged &&
          Number.isFinite(noseMargin) &&
          noseMargin > s.topNoseMargin &&
          progress >= s.topProgress,
        progress,
      };
    },
  };
}

/** One counted pull-up. Times are seconds since the session started. */
export type PullupRep = Readonly<{
  number: number;
  /** Left the hang. */
  startS: number;
  /** Nose reached the bar line. */
  topS: number;
  /** Back in a straight-arm hang, or null if the set ended first. */
  endS: number | null;
  ascentS: number;
  descentS: number | null;
}>;

export type PullupMetrics = Readonly<{
  reps: number;
  /** Attempts that did not reach the top, or did not start from a straight-arm hang. Not counted. */
  partialReps: number;
  repDetails: readonly PullupRep[];
  partials: readonly PartialRep[];
  meanAscentS: number | null;
  meanDescentS: number | null;
}>;

const mean = (values: number[]) =>
  values.length
    ? round(values.reduce((a, b) => a + b, 0) / values.length, 2)
    : null;

function toPullupMetrics(m: RepMetrics): PullupMetrics {
  const repDetails = m.repDetails.map(r => ({
    number: r.number,
    startS: r.startS,
    topS: r.targetS,
    endS: r.endS,
    ascentS: r.toTargetS,
    descentS: r.toStartS,
  }));
  return {
    reps: m.reps,
    partialReps: m.partialReps,
    repDetails,
    partials: m.partials,
    meanAscentS: mean(repDetails.map(r => r.ascentS)),
    meanDescentS: mean(
      repDetails.map(r => r.descentS).filter((d): d is number => d !== null),
    ),
  };
}

/**
 * Counts pull-ups live. Feed it every frame with push(); show push()'s
 * return value; call finish() when the user stops.
 *
 *   const counter = new PullupCounter({ source: source.info });
 *   source.start(frame => setLive(counter.push(frame)));
 *   ...
 *   const result = counter.finish(); // result.value is null unless result.verdict === 'ok'
 */
export class PullupCounter {
  private readonly counter: RepCounter;

  constructor(
    options: Readonly<{
      settings?: Partial<PullupSettings>;
      counter?: Partial<RepCounterOptions>;
      source?: KeypointSourceInfo | null;
    }> = {},
  ) {
    this.counter = new RepCounter(
      createPullupRule(options.settings),
      options.counter,
      options.source ?? null,
    );
  }

  push(frame: PoseFrame): RepLiveState {
    return this.counter.push(frame);
  }

  get state(): RepLiveState {
    return this.counter.state;
  }

  finish(): TestResult<PullupMetrics> {
    const result = this.counter.finish();
    return { ...result, metrics: toPullupMetrics(result.metrics) };
  }
}
