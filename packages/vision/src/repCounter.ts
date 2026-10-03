/**
 * A rep counter you feed one frame at a time.
 *
 * Every rep test has the same shape: hold a start position, move to a target
 * position, come back. The rule (pullups.ts, later push-ups) says what "start"
 * and "target" look like in one frame; this file only keeps time.
 *
 *   get_in_position -> at_start -> going -> at_target -> returning -> at_start
 *                                    |                       |
 *                                    +-- back at start: a partial rep (target not reached)
 *                                                            +-- target again: a partial rep (start not reached)
 *
 * A rep counts when the target is reached after leaving the start position.
 * A rep that never reaches the target, or starts from the top instead of from
 * the start position, is kept as a partial rep and not counted. The idea
 * matches the hysteresis counter in vision-demos (chin_ups/src/reps.py), made
 * incremental so it runs live.
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

/** What a rule reads from one frame. */
export type RepReading = Readonly<{
  /** Every point the rule needs was visible enough. */
  visible: boolean;
  /** Mean visibility of the needed points, 0 to 1. */
  confidence: number;
  /** Taking part at all (pull-ups: hands up on the bar). */
  engaged: boolean;
  /** In the start position (pull-ups: hanging with straight arms). */
  atStart: boolean;
  /** At the target (pull-ups: nose above the hands). */
  atTarget: boolean;
  /** About 0 at the start position and 1 at the target. Tells a partial rep from jitter. */
  progress: number;
}>;

export interface RepRule {
  readonly test: LiveTestId;
  readonly methodId: string;
  readonly version: string;
  readonly settings: Readonly<Record<string, number | string | boolean>>;
  readonly setup: TestSetup;
  /** Reads one frame. May keep state (smoothing, calibration). */
  read(frame: PoseFrame): RepReading;
  reset(): void;
}

export type RepPhase =
  | 'not_in_frame'
  | 'get_in_position'
  | 'at_start'
  | 'going'
  | 'at_target'
  | 'returning';

/** One counted rep. Times are seconds since the first frame of the session. */
export type RepTiming = Readonly<{
  number: number;
  /** Left the start position. */
  startS: number;
  /** Reached the target. */
  targetS: number;
  /** Back in the start position, or null if the session ended or the person let go first. */
  endS: number | null;
  /** Start to target (pull-ups: the ascent). */
  toTargetS: number;
  /** Target to start (pull-ups: the descent), or null when it never finished. */
  toStartS: number | null;
}>;

export type PartialRep = Readonly<{
  startS: number;
  endS: number;
  /** Highest progress reached, 0 to 1. */
  peakProgress: number;
  reason: 'target_not_reached' | 'start_not_reached';
}>;

export type RepLiveState = Readonly<{
  test: LiveTestId;
  phase: RepPhase;
  reps: number;
  partialReps: number;
  lastRep: RepTiming | null;
  /** 0 to 1 while moving, for a progress bar. */
  progress: number;
  /** Seconds since the first frame. */
  elapsedS: number;
}>;

export type RepMetrics = Readonly<{
  reps: number;
  partialReps: number;
  repDetails: readonly RepTiming[];
  partials: readonly PartialRep[];
}>;

export type RepCounterOptions = Readonly<{
  /** Hold the start position this long before counting starts. */
  settleMs: number;
  /** Away from the target this long before the return phase begins. */
  leaveMs: number;
  /** No usable frame for this long means the person left the picture. */
  lostMs: number;
  /** Not engaged (pull-ups: hands off the bar) for this long ends the current set. */
  releaseMs: number;
  /** Progress that counts as leaving the start position. */
  startProgress: number;
  /** A failed attempt must reach this progress to be kept as a partial rep. */
  partialProgress: number;
  quality: QualityThresholds;
}>;

export const DEFAULT_REP_OPTIONS: RepCounterOptions = {
  settleMs: 250,
  leaveMs: 100,
  lostMs: 800,
  releaseMs: 500,
  startProgress: 0.15,
  partialProgress: 0.35,
  quality: { ...DEFAULT_QUALITY, minDurationS: 3 },
};

type OpenRep = {
  number: number;
  startT: number;
  targetT: number;
  leftTargetT: number | null;
};

export class RepCounter {
  private readonly options: RepCounterOptions;
  private readonly stats = new CaptureStats();
  private phase: RepPhase = 'not_in_frame';
  private firstT = NaN;
  private lastT = NaN;
  private lastVisibleT = NaN;
  private startSince: number | null = null;
  private notEngagedSince: number | null = null;
  private awaySince: number | null = null;
  private lastAtStartT = NaN;
  private lastAtTargetT = NaN;
  private attemptStartT = NaN;
  private peak = 0;
  private progress = NaN;
  private reachedStart = false;
  private open: OpenRep | null = null;
  private readonly reps: RepTiming[] = [];
  private readonly partials: PartialRep[] = [];

  constructor(
    private readonly rule: RepRule,
    options: Partial<RepCounterOptions> = {},
    private readonly source: KeypointSourceInfo | null = null,
  ) {
    this.options = { ...DEFAULT_REP_OPTIONS, ...options };
    rule.reset();
  }

  get state(): RepLiveState {
    return {
      test: this.rule.test,
      phase: this.phase,
      reps: this.reps.length,
      partialReps: this.partials.length,
      lastRep: this.reps.length ? this.reps[this.reps.length - 1] : null,
      progress: Number.isFinite(this.progress)
        ? Math.min(1, Math.max(0, this.progress))
        : 0,
      elapsedS: Number.isNaN(this.firstT)
        ? 0
        : (this.lastT - this.firstT) / 1000,
    };
  }

  /** Feeds one frame and returns the live state for the screen. */
  push(frame: PoseFrame): RepLiveState {
    if (Number.isNaN(this.firstT)) {
      this.firstT = frame.t;
    }
    if (!Number.isNaN(this.lastT) && frame.t <= this.lastT) {
      return this.state; // out of order or repeated frame
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

  private step(t: number, r: RepReading): void {
    const o = this.options;
    if (!r.visible) {
      const lostFor = Number.isNaN(this.lastVisibleT)
        ? Infinity
        : t - this.lastVisibleT;
      if (lostFor > o.lostMs) {
        this.leaveSet('not_in_frame');
      }
      return;
    }
    this.lastVisibleT = t;
    this.progress = r.progress;

    if (!r.engaged) {
      if (this.phase === 'not_in_frame' || this.phase === 'get_in_position') {
        this.phase = 'get_in_position';
        this.startSince = null;
        return;
      }
      if (this.notEngagedSince === null) {
        this.notEngagedSince = t;
      }
      if (t - this.notEngagedSince >= o.releaseMs) {
        this.leaveSet('get_in_position');
      }
      return;
    }
    this.notEngagedSince = null;

    switch (this.phase) {
      case 'not_in_frame':
      case 'get_in_position':
        this.phase = 'get_in_position';
        if (r.atStart) {
          if (this.startSince === null) {
            this.startSince = t;
          }
          if (t - this.startSince >= o.settleMs) {
            this.phase = 'at_start';
            this.reachedStart = true;
            this.lastAtStartT = t;
          }
        } else {
          this.startSince = null;
        }
        break;

      case 'at_start':
        if (r.atStart) {
          this.lastAtStartT = t;
        }
        if (r.progress >= o.startProgress) {
          this.phase = 'going';
          this.attemptStartT = this.lastAtStartT;
          this.peak = r.progress;
        }
        break;

      case 'going':
        this.peak = Math.max(this.peak, r.progress);
        if (r.atTarget) {
          this.open = {
            number: this.reps.length + 1,
            startT: this.attemptStartT,
            targetT: t,
            leftTargetT: null,
          };
          this.reps.push(this.closeRep(this.open, null));
          this.phase = 'at_target';
          this.lastAtTargetT = t;
          this.awaySince = null;
        } else if (r.atStart && r.progress < o.startProgress) {
          if (this.peak >= o.partialProgress) {
            this.partials.push({
              startS: this.sec(this.attemptStartT),
              endS: this.sec(t),
              peakProgress: round(this.peak, 2),
              reason: 'target_not_reached',
            });
          }
          this.phase = 'at_start';
          this.lastAtStartT = t;
        }
        break;

      case 'at_target':
        if (r.atTarget) {
          this.lastAtTargetT = t;
          this.awaySince = null;
        } else {
          if (this.awaySince === null) {
            this.awaySince = t;
          }
          if (t - this.awaySince >= o.leaveMs && this.open) {
            this.open.leftTargetT = this.lastAtTargetT;
            this.phase = 'returning';
          }
        }
        break;

      case 'returning':
        if (r.atStart && r.progress < o.startProgress && this.open) {
          this.replaceLast(this.closeRep(this.open, t));
          this.open = null;
          this.phase = 'at_start';
          this.lastAtStartT = t;
        } else if (r.atTarget) {
          // Back up to the target without reaching the start position first.
          this.partials.push({
            startS: this.sec(this.open?.leftTargetT ?? t),
            endS: this.sec(t),
            peakProgress: round(r.progress, 2),
            reason: 'start_not_reached',
          });
          this.phase = 'at_target';
          this.lastAtTargetT = t;
          this.awaySince = null;
        }
        break;
    }
  }

  /** The person let go or left the picture: an open attempt is dropped, a counted rep stays. */
  private leaveSet(next: 'not_in_frame' | 'get_in_position'): void {
    this.open = null;
    this.phase = next;
    this.startSince = null;
    this.notEngagedSince = null;
    this.awaySince = null;
    this.peak = 0;
    this.progress = NaN;
  }

  private closeRep(rep: OpenRep, endT: number | null): RepTiming {
    const toStart =
      endT !== null && rep.leftTargetT !== null ? endT - rep.leftTargetT : null;
    return {
      number: rep.number,
      startS: this.sec(rep.startT),
      targetS: this.sec(rep.targetT),
      endS: endT === null ? null : this.sec(endT),
      toTargetS: round((rep.targetT - rep.startT) / 1000, 2),
      toStartS: toStart === null ? null : round(toStart / 1000, 2),
    };
  }

  private replaceLast(rep: RepTiming): void {
    this.reps[this.reps.length - 1] = rep;
  }

  private sec(t: number): number {
    return round((t - this.firstT) / 1000, 2);
  }

  /** The final result. Call when the user stops the test. */
  finish(): TestResult<RepMetrics> {
    const capture = this.stats.summary();
    const { verdict, reasons } = judgeCapture(
      capture,
      this.reachedStart,
      {
        code: 'start_position_not_seen',
        detail:
          'The start position was never held long enough to start counting.',
      },
      this.options.quality,
    );
    return {
      test: this.rule.test,
      verdict,
      reasons,
      value: verdict === 'ok' ? this.reps.length : null,
      unit: 'reps',
      metrics: {
        reps: this.reps.length,
        partialReps: this.partials.length,
        repDetails: [...this.reps],
        partials: [...this.partials],
      },
      capture,
      method: {
        id: this.rule.methodId,
        version: this.rule.version,
        settings: {
          ...this.rule.settings,
          settleMs: this.options.settleMs,
          leaveMs: this.options.leaveMs,
          startProgress: this.options.startProgress,
          partialProgress: this.options.partialProgress,
        },
        source: this.source,
      },
      setup: this.rule.setup,
    };
  }
}
