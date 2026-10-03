/**
 * A hold timer you feed one frame at a time (plank, dead hang, later
 * one-leg balance).
 *
 * The posture rule (postures.ts) says whether one frame is "in position". This
 * file turns that into holds:
 *
 *   get_in_position -> holding -> wobble -> holding ... -> ended
 *
 * - The hold starts once the position has lasted `enterMs`, and is backdated
 *   to the first frame of it.
 * - A break shorter than `graceMs` (a glitchy frame, a brief wobble) does not
 *   end the hold. While it lasts the shown time pauses, so the screen never
 *   shows time that might not count.
 * - A longer break ends the hold at the last frame that was in position.
 * - The result is the longest hold. Holds shorter than `minHoldS` are ignored.
 */
import { hasPerson, type PoseFrame } from './pose';
import {
  CaptureStats,
  DEFAULT_QUALITY,
  judgeCapture,
  round,
  type LiveTestId,
  type QualityThresholds,
  type TestResult,
  type TestSetup,
} from './result';
import type { KeypointSourceInfo } from './sources';

/** Why a frame is not in position. Screens map these to their own words. */
export type PostureHint =
  | 'hips_sagging'
  | 'hips_too_high'
  | 'not_horizontal'
  | 'not_on_arms'
  | 'knees_bent'
  | 'hands_not_overhead'
  | 'arms_bent'
  | 'not_hanging';

export type PostureReading = Readonly<{
  /** Every point the rule needs was visible enough. */
  visible: boolean;
  /** Mean visibility of the needed points, 0 to 1. */
  confidence: number;
  inPosture: boolean;
  /** The first check that failed, or null. */
  hint: PostureHint | null;
  /** The numbers behind the decision, e.g. { hipAngleDeg: 171 }. */
  measures: Readonly<Record<string, number>>;
}>;

export interface PostureRule {
  readonly test: LiveTestId;
  readonly methodId: string;
  readonly version: string;
  readonly settings: Readonly<Record<string, number | string | boolean>>;
  readonly setup: TestSetup;
  read(frame: PoseFrame): PostureReading;
  reset(): void;
}

export type HoldPhase =
  | 'not_in_frame'
  | 'get_in_position'
  | 'holding'
  | 'wobble'
  | 'ended';

export type HoldSegment = Readonly<{
  /** Seconds since the session started. */
  startS: number;
  endS: number;
  durationS: number;
}>;

export type HoldLiveState = Readonly<{
  test: LiveTestId;
  phase: HoldPhase;
  /** The current hold, or the last one once it has ended. */
  holdS: number;
  /** Longest hold so far. */
  bestS: number;
  hint: PostureHint | null;
  elapsedS: number;
}>;

export type HoldMetrics = Readonly<{
  /** Longest single hold. */
  bestHoldS: number;
  holds: readonly HoldSegment[];
}>;

export type HoldTimerOptions = Readonly<{
  /** In position this long before the hold starts. */
  enterMs: number;
  /** Breaks shorter than this do not end a hold. */
  graceMs: number;
  /** No usable frame for this long counts as out of position. */
  lostMs: number;
  /** Shorter holds are ignored. */
  minHoldS: number;
  quality: QualityThresholds;
}>;

export const DEFAULT_HOLD_OPTIONS: HoldTimerOptions = {
  enterMs: 500,
  graceMs: 1000,
  lostMs: 1000,
  minHoldS: 1,
  quality: DEFAULT_QUALITY,
};

export class HoldTimer {
  private readonly options: HoldTimerOptions;
  private readonly stats = new CaptureStats();
  private phase: HoldPhase = 'not_in_frame';
  private firstT = NaN;
  private lastT = NaN;
  private lastVisibleT = NaN;
  private enterSince: number | null = null;
  private holdStartT = NaN;
  private lastInT = NaN;
  private outSince: number | null = null;
  private hint: PostureHint | null = null;
  private readonly holds: HoldSegment[] = [];

  constructor(
    private readonly rule: PostureRule,
    options: Partial<HoldTimerOptions> = {},
    private readonly source: KeypointSourceInfo | null = null,
  ) {
    this.options = { ...DEFAULT_HOLD_OPTIONS, ...options };
    rule.reset();
  }

  get state(): HoldLiveState {
    const running = this.phase === 'holding' || this.phase === 'wobble';
    const current = running
      ? (this.lastInT - this.holdStartT) / 1000
      : this.holds.length
      ? this.holds[this.holds.length - 1].durationS
      : 0;
    return {
      test: this.rule.test,
      phase: this.phase,
      holdS: round(current, 1),
      bestS: round(
        Math.max(running ? current : 0, ...this.holds.map(h => h.durationS), 0),
        1,
      ),
      hint: this.hint,
      elapsedS: Number.isNaN(this.firstT)
        ? 0
        : (this.lastT - this.firstT) / 1000,
    };
  }

  /** Feeds one frame and returns the live state for the screen. */
  push(frame: PoseFrame): HoldLiveState {
    if (Number.isNaN(this.firstT)) {
      this.firstT = frame.t;
    }
    if (!Number.isNaN(this.lastT) && frame.t <= this.lastT) {
      return this.state;
    }
    this.lastT = frame.t;
    const reading = this.rule.read(frame);
    this.stats.add(
      frame.t,
      hasPerson(frame),
      reading.visible,
      reading.confidence,
    );
    this.step(frame.t, reading);
    return this.state;
  }

  private step(t: number, r: PostureReading): void {
    const o = this.options;
    if (r.visible) {
      this.lastVisibleT = t;
    }
    const lost =
      !r.visible &&
      (Number.isNaN(this.lastVisibleT) || t - this.lastVisibleT > o.lostMs);
    const inPosture = r.visible && r.inPosture;
    this.hint = r.visible ? r.hint : null;

    switch (this.phase) {
      case 'not_in_frame':
      case 'get_in_position':
      case 'ended':
        if (inPosture) {
          if (this.enterSince === null) {
            this.enterSince = t;
          }
          if (t - this.enterSince >= o.enterMs) {
            this.phase = 'holding';
            this.holdStartT = this.enterSince;
            this.lastInT = t;
          }
        } else {
          this.enterSince = null;
          if (this.phase !== 'ended') {
            this.phase =
              lost || !r.visible ? 'not_in_frame' : 'get_in_position';
          }
        }
        break;

      case 'holding':
        if (inPosture) {
          this.lastInT = t;
        } else {
          this.phase = 'wobble';
          this.outSince = t;
        }
        break;

      case 'wobble':
        if (inPosture) {
          this.phase = 'holding';
          this.lastInT = t;
          this.outSince = null;
        } else if (this.outSince !== null && t - this.outSince >= o.graceMs) {
          this.endHold();
        }
        break;
    }
  }

  private endHold(): void {
    const durationS = (this.lastInT - this.holdStartT) / 1000;
    if (durationS >= this.options.minHoldS) {
      this.holds.push({
        startS: this.sec(this.holdStartT),
        endS: this.sec(this.lastInT),
        durationS: round(durationS, 2),
      });
    }
    this.phase = 'ended';
    this.enterSince = null;
    this.outSince = null;
  }

  private sec(t: number): number {
    return round((t - this.firstT) / 1000, 2);
  }

  /** The final result. Call when the user stops, or when the phase becomes "ended". */
  finish(): TestResult<HoldMetrics> {
    if (this.phase === 'holding' || this.phase === 'wobble') {
      this.endHold();
    }
    const capture = this.stats.summary();
    const best = this.holds.reduce((m, h) => Math.max(m, h.durationS), 0);
    const { verdict, reasons } = judgeCapture(
      capture,
      this.holds.length > 0,
      {
        code: 'posture_not_held',
        detail: `The position was never held for ${this.options.minHoldS}s or more.`,
      },
      this.options.quality,
    );
    return {
      test: this.rule.test,
      verdict,
      reasons,
      // Whole seconds, like the manual stopwatch, so both fit the same field.
      value: verdict === 'ok' ? Math.floor(best) : null,
      unit: 'seconds',
      metrics: { bestHoldS: round(best, 2), holds: [...this.holds] },
      capture,
      method: {
        id: this.rule.methodId,
        version: this.rule.version,
        settings: {
          ...this.rule.settings,
          enterMs: this.options.enterMs,
          graceMs: this.options.graceMs,
          minHoldS: this.options.minHoldS,
        },
        source: this.source,
      },
      setup: this.rule.setup,
    };
  }
}
