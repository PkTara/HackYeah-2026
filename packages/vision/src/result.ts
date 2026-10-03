/**
 * What a live test hands back: the number, how sure we are, and everything
 * needed to judge it later (method, thresholds, model, capture quality).
 *
 * Camera results are estimates. A capture that is too short, never shows the
 * start position or is poorly visible gets a verdict other than "ok" and a
 * null `value`, so the app asks for a retake or manual entry instead of saving
 * a made-up number.
 */
import type { KeypointSourceInfo } from './sources';

/** Same ids as BaselineTestId in @hackyeah/core, so results map straight across. */
export type LiveTestId = 'pull-ups' | 'dead-hang' | 'plank';

export const LIVE_TEST_IDS: readonly LiveTestId[] = [
  'pull-ups',
  'dead-hang',
  'plank',
];

export type Verdict =
  | 'ok'
  | 'low_confidence'
  | 'person_not_found'
  | 'too_short'
  | 'not_in_position';

export type ReasonCode =
  | 'no_person'
  | 'too_short'
  | 'start_position_not_seen'
  | 'posture_not_held'
  | 'few_usable_frames'
  | 'low_visibility';

/** `detail` is for logs and debugging. Screens show their own copy per code. */
export type Reason = Readonly<{ code: ReasonCode; detail: string }>;

export type BodyPart =
  | 'head'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle';

/** How the camera should be placed. Kept with the result as part of the setup. */
export type TestSetup = Readonly<{
  view: 'front' | 'side';
  /** Body parts that must stay in the frame. */
  parts: readonly BodyPart[];
  /** "both": left and right must be visible. "either": the side facing the camera is enough. */
  sides: 'both' | 'either';
}>;

export type CaptureSummary = Readonly<{
  /** First to last frame, in seconds. */
  durationS: number;
  frames: number;
  framesWithPerson: number;
  /** Frames where every point the test needs was visible enough. */
  usableFrames: number;
  /** Usable share between the first and the last usable frame. */
  usableShare: number;
  /** Mean visibility (0 to 1) of the needed points over that span. */
  meanVisibility: number;
  /** Frames per second actually analysed. */
  fps: number;
}>;

export type MethodInfo = Readonly<{
  /** e.g. "pull-up-counter". */
  id: string;
  /** Bumped whenever a threshold or rule changes, so old results stay comparable. */
  version: string;
  /** The thresholds this run used. */
  settings: Readonly<Record<string, number | string | boolean>>;
  /** Where the keypoints came from (model and version), when known. */
  source: KeypointSourceInfo | null;
}>;

export type TestResult<M> = Readonly<{
  test: LiveTestId;
  verdict: Verdict;
  reasons: readonly Reason[];
  /** The number to save, or null unless the verdict is "ok". */
  value: number | null;
  unit: 'reps' | 'seconds';
  /** What was measured, also when the verdict is not "ok" (for "we counted 7 but..."). */
  metrics: M;
  capture: CaptureSummary;
  method: MethodInfo;
  setup: TestSetup;
}>;

export type QualityThresholds = Readonly<{
  /** Shorter sessions are "too_short". */
  minDurationS: number;
  /** Below this usable share the result is "low_confidence". */
  minUsableShare: number;
  /** Below this mean visibility the result is "low_confidence". */
  minMeanVisibility: number;
}>;

export const DEFAULT_QUALITY: QualityThresholds = {
  minDurationS: 2,
  minUsableShare: 0.6,
  minMeanVisibility: 0.5,
};

/** Counts frames as they arrive and summarises capture quality at the end. */
export class CaptureStats {
  private frames = 0;
  private framesWithPerson = 0;
  private firstT = NaN;
  private lastT = NaN;
  // Per frame since the first usable one: [usable, confidence].
  private sinceFirstUsable: Array<[boolean, number]> = [];
  private lastUsableIndex = -1;

  add(
    t: number,
    hasPerson: boolean,
    usable: boolean,
    confidence: number,
  ): void {
    this.frames += 1;
    if (Number.isNaN(this.firstT)) {
      this.firstT = t;
    }
    this.lastT = t;
    if (hasPerson) {
      this.framesWithPerson += 1;
    }
    if (usable || this.sinceFirstUsable.length > 0) {
      this.sinceFirstUsable.push([usable, hasPerson ? confidence : 0]);
      if (usable) {
        this.lastUsableIndex = this.sinceFirstUsable.length - 1;
      }
    }
  }

  get durationS(): number {
    return this.frames < 2 ? 0 : (this.lastT - this.firstT) / 1000;
  }

  summary(): CaptureSummary {
    // The active span runs from the first to the last usable frame, so
    // walking into and out of the picture does not count against quality.
    const span = this.sinceFirstUsable.slice(0, this.lastUsableIndex + 1);
    const usable = span.filter(([ok]) => ok).length;
    const durationS = this.durationS;
    return {
      durationS: round(durationS, 2),
      frames: this.frames,
      framesWithPerson: this.framesWithPerson,
      usableFrames: usable,
      usableShare: span.length ? round(usable / span.length, 3) : 0,
      meanVisibility: span.length
        ? round(span.reduce((sum, [, c]) => sum + c, 0) / span.length, 3)
        : 0,
      fps: durationS > 0 ? round((this.frames - 1) / durationS, 1) : 0,
    };
  }
}

/**
 * The shared part of every verdict, checked in this order: nobody seen, too
 * short, poorly visible, never in position. Visibility comes before position
 * because when the needed points cannot be seen, nothing can be said about
 * the position either.
 */
export function judgeCapture(
  capture: CaptureSummary,
  reachedPosition: boolean,
  notInPosition: Reason,
  q: QualityThresholds,
): { verdict: Verdict; reasons: Reason[] } {
  if (capture.framesWithPerson === 0) {
    return {
      verdict: 'person_not_found',
      reasons: [
        { code: 'no_person', detail: 'No person was detected in any frame.' },
      ],
    };
  }
  if (capture.durationS < q.minDurationS) {
    return {
      verdict: 'too_short',
      reasons: [
        {
          code: 'too_short',
          detail: `The capture lasted ${capture.durationS}s; at least ${q.minDurationS}s is needed.`,
        },
      ],
    };
  }
  const reasons: Reason[] = [];
  if (capture.usableShare < q.minUsableShare) {
    reasons.push({
      code: 'few_usable_frames',
      detail: `Only ${Math.round(
        capture.usableShare * 100,
      )}% of frames showed every needed point.`,
    });
  }
  if (capture.meanVisibility < q.minMeanVisibility) {
    reasons.push({
      code: 'low_visibility',
      detail: `Mean visibility of the needed points was ${capture.meanVisibility}.`,
    });
  }
  if (reasons.length) {
    return { verdict: 'low_confidence', reasons };
  }
  if (!reachedPosition) {
    return { verdict: 'not_in_position', reasons: [notInPosition] };
  }
  return { verdict: 'ok', reasons: [] };
}

export function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
