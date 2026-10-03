/**
 * Posture rules for the hold tests. Each one looks at a single frame and says
 * whether it is in position, and if not, the first reason why.
 *
 * Plank, filmed from the side:
 *   1. body roughly horizontal: the shoulder-to-ankle line within
 *      `maxTiltDeg` of horizontal (so standing up does not count);
 *   2. resting on the arms: the upper arm points down from the shoulder;
 *   3. knees straight (when the knee is visible);
 *   4. straight line: the angle at the hip between shoulder and ankle is at
 *      least `straightHipDeg`. When it is not, the hint says whether the hips
 *      sag below the line or lift above it.
 *   The side facing the camera is used and only switches when the other side
 *   is clearly more visible, so the measurement does not flip between hips
 *   (the idea of vision-demos, deadlift/src/reps.py `orientation`, Apache 2.0).
 *
 * Dead hang, filmed from the front:
 *   1. hands overhead: wrists above the shoulders by at least
 *      `handsAboveShoulders` arm lengths;
 *   2. straight arms: both elbows at least `straightElbowDeg`;
 *   3. hanging below the hands: hips below the shoulders, when visible.
 *   The camera cannot see whether the feet are off the ground; the screen has
 *   to tell people to lift their feet.
 */
import {
  angleDeg,
  distance,
  meanPoint,
  pointOf,
  tiltFromHorizontalDeg,
  verticalOffsetFromLine,
  visibilityOf,
  type Point,
} from './geometry';
import {
  HoldTimer,
  type HoldTimerOptions,
  type PostureHint,
  type PostureReading,
  type PostureRule,
} from './holdTimer';
import type { BodyLandmark, LandmarkName, PoseFrame } from './pose';
import { RunningMedian } from './smoothing';
import type { KeypointSourceInfo } from './sources';

type Side = 'left' | 'right';

const name = (side: Side, part: string) => `${side}_${part}` as LandmarkName;

function reading(
  visible: boolean,
  confidence: number,
  hint: PostureHint | null,
  measures: Record<string, number> = {},
): PostureReading {
  return {
    visible,
    confidence,
    inPosture: visible && hint === null,
    hint,
    measures,
  };
}

// Plank

export type PlankSettings = Readonly<{
  minVisibility: number;
  /** Shoulder-hip-ankle angle at least this counts as a straight line. */
  straightHipDeg: number;
  /** Shoulder-to-ankle line may tilt this far from horizontal. */
  maxTiltDeg: number;
  /** Hip-knee-ankle angle at least this counts as straight knees. */
  straightKneeDeg: number;
  /** Switch sides only when the other side is this much more visible. */
  sideSwitchMargin: number;
  smoothFrames: number;
}>;

export const DEFAULT_PLANK_SETTINGS: PlankSettings = {
  minVisibility: 0.5,
  straightHipDeg: 160,
  maxTiltDeg: 35,
  straightKneeDeg: 150,
  sideSwitchMargin: 0.15,
  smoothFrames: 3,
};

const PLANK_PARTS = ['shoulder', 'elbow', 'hip', 'knee', 'ankle'];

export function createPlankRule(
  overrides: Partial<PlankSettings> = {},
): PostureRule {
  const s: PlankSettings = { ...DEFAULT_PLANK_SETTINGS, ...overrides };
  const hipSmooth = new RunningMedian(s.smoothFrames);
  let side: Side = 'left';
  const sideScore: Record<Side, number> = { left: 0, right: 0 };

  const sideVisibility = (frame: PoseFrame, which: Side) =>
    PLANK_PARTS.reduce(
      (sum, part) => sum + visibilityOf(frame, name(which, part)),
      0,
    ) / PLANK_PARTS.length;

  return {
    test: 'plank',
    methodId: 'plank-hold-timer',
    version: '1.0.0',
    settings: s,
    setup: {
      view: 'side',
      parts: ['shoulder', 'elbow', 'hip', 'knee', 'ankle'],
      sides: 'either',
    },
    reset() {
      hipSmooth.reset();
      side = 'left';
      sideScore.left = 0;
      sideScore.right = 0;
    },
    read(frame) {
      // Smoothed visibility per side; switch only on a clear difference.
      (['left', 'right'] as const).forEach(which => {
        sideScore[which] =
          0.8 * sideScore[which] + 0.2 * sideVisibility(frame, which);
      });
      const other: Side = side === 'left' ? 'right' : 'left';
      if (sideScore[other] > sideScore[side] + s.sideSwitchMargin) {
        side = other;
        hipSmooth.reset();
      }

      const confidence = sideVisibility(frame, side);
      const at = (part: string) =>
        pointOf(frame, name(side, part), s.minVisibility);
      const shoulder = at('shoulder');
      const elbow = at('elbow');
      const hip = at('hip');
      const knee = at('knee');
      const ankle = at('ankle');
      if (!shoulder || !elbow || !hip || !ankle) {
        return reading(false, confidence, null);
      }

      const tiltDeg = tiltFromHorizontalDeg(shoulder, ankle);
      const upperArm = distance(shoulder, elbow);
      const onArms = elbow.y - shoulder.y >= 0.5 * upperArm;
      const kneeDeg = knee ? angleDeg(hip, knee, ankle) : NaN;
      const hipDeg = hipSmooth.push(angleDeg(shoulder, hip, ankle));
      const measures = { hipAngleDeg: hipDeg, tiltDeg, kneeAngleDeg: kneeDeg };

      if (tiltDeg > s.maxTiltDeg) {
        return reading(true, confidence, 'not_horizontal', measures);
      }
      if (!onArms) {
        return reading(true, confidence, 'not_on_arms', measures);
      }
      if (Number.isFinite(kneeDeg) && kneeDeg < s.straightKneeDeg) {
        return reading(true, confidence, 'knees_bent', measures);
      }
      if (hipDeg < s.straightHipDeg) {
        const below = verticalOffsetFromLine(shoulder, ankle, hip) > 0;
        return reading(
          true,
          confidence,
          below ? 'hips_sagging' : 'hips_too_high',
          measures,
        );
      }
      return reading(true, confidence, null, measures);
    },
  };
}

// Dead hang

export type DeadHangSettings = Readonly<{
  minVisibility: number;
  /** Both elbows at least this straight. */
  straightElbowDeg: number;
  /** Wrists at least this many arm lengths above the shoulders. */
  handsAboveShoulders: number;
  smoothFrames: number;
}>;

export const DEFAULT_DEAD_HANG_SETTINGS: DeadHangSettings = {
  minVisibility: 0.5,
  straightElbowDeg: 150,
  handsAboveShoulders: 0.6,
  smoothFrames: 3,
};

const HANG_NEEDS: readonly BodyLandmark[] = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
];

export function createDeadHangRule(
  overrides: Partial<DeadHangSettings> = {},
): PostureRule {
  const s: DeadHangSettings = { ...DEFAULT_DEAD_HANG_SETTINGS, ...overrides };
  const elbowSmooth = new RunningMedian(s.smoothFrames);
  const raiseSmooth = new RunningMedian(s.smoothFrames);

  return {
    test: 'dead-hang',
    methodId: 'dead-hang-timer',
    version: '1.0.0',
    settings: s,
    setup: {
      view: 'front',
      parts: ['shoulder', 'elbow', 'wrist', 'hip'],
      sides: 'both',
    },
    reset() {
      elbowSmooth.reset();
      raiseSmooth.reset();
    },
    read(frame) {
      const confidence =
        HANG_NEEDS.reduce((sum, n) => sum + visibilityOf(frame, n), 0) /
        HANG_NEEDS.length;
      const arms = (['left', 'right'] as const)
        .map(which => {
          const shoulder = pointOf(
            frame,
            name(which, 'shoulder'),
            s.minVisibility,
          );
          const elbow = pointOf(frame, name(which, 'elbow'), s.minVisibility);
          const wrist = pointOf(frame, name(which, 'wrist'), s.minVisibility);
          return shoulder && elbow && wrist ? { shoulder, elbow, wrist } : null;
        })
        .filter(
          (a): a is { shoulder: Point; elbow: Point; wrist: Point } =>
            a !== null,
        );
      if (arms.length === 0) {
        return reading(false, confidence, null);
      }

      const shoulders = meanPoint(arms.map(a => a.shoulder)) as Point;
      const wrists = meanPoint(arms.map(a => a.wrist)) as Point;
      const armLength = Math.max(
        ...arms.map(
          a => distance(a.shoulder, a.elbow) + distance(a.elbow, a.wrist),
        ),
      );
      const elbowDeg = elbowSmooth.push(
        Math.min(...arms.map(a => angleDeg(a.shoulder, a.elbow, a.wrist))),
      );
      const raise = raiseSmooth.push((shoulders.y - wrists.y) / armLength);
      const hips = meanPoint([
        pointOf(frame, 'left_hip', s.minVisibility),
        pointOf(frame, 'right_hip', s.minVisibility),
      ]);
      const measures = { elbowAngleDeg: elbowDeg, handsAboveShoulders: raise };

      if (raise < s.handsAboveShoulders) {
        return reading(true, confidence, 'hands_not_overhead', measures);
      }
      if (elbowDeg < s.straightElbowDeg) {
        return reading(true, confidence, 'arms_bent', measures);
      }
      if (hips && hips.y <= shoulders.y) {
        return reading(true, confidence, 'not_hanging', measures);
      }
      return reading(true, confidence, null, measures);
    },
  };
}

type HoldTimerSetup = Readonly<{
  options?: Partial<HoldTimerOptions>;
  source?: KeypointSourceInfo | null;
}>;

/** A plank timer. Film from the side, whole body in the frame. */
export function createPlankTimer(
  setup: HoldTimerSetup & { settings?: Partial<PlankSettings> } = {},
): HoldTimer {
  return new HoldTimer(
    createPlankRule(setup.settings),
    setup.options,
    setup.source ?? null,
  );
}

/** A dead hang timer. Film from the front, hands and hips in the frame. */
export function createDeadHangTimer(
  setup: HoldTimerSetup & { settings?: Partial<DeadHangSettings> } = {},
): HoldTimer {
  return new HoldTimer(
    createDeadHangRule(setup.settings),
    setup.options,
    setup.source ?? null,
  );
}
