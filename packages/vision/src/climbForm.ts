/**
 * Climbing form, described from the keypoints of a recorded clip, on the
 * device.
 *
 * Input: the PoseFrames of one climb, from any source (MediaPipe on a video
 * file on the web, the HarmonyOS skeleton module, or keypoints from the
 * backend). Output: a few descriptive observations, each with the frames and
 * timestamps it came from and a confidence. These are candidate observations
 * to check against the video, not grades, not coaching verdicts and not an
 * injury assessment.
 *
 * Assumptions, also in the README:
 *   - a still camera (tripod or propped phone), filmed from behind the
 *     climber or from the side;
 *   - one climber in the picture;
 *   - lengths are in torso lengths (shoulder centre to hip centre), measured
 *     from the clip itself, so camera distance does not matter.
 *
 * Observations:
 *   straight_arms      share of still moments, with a hand above the
 *                      shoulder, where those arms were straight; evidence:
 *                      longer bent-arm holds
 *   pauses             still moments of `pauseMinS` or more
 *   hip_path           how winding the hip path was (geometric index of
 *                      entropy, as used in climbing fluency research);
 *                      compare attempts on the same route only
 *   foot_replacements  feet that settled, then moved a short way and
 *                      settled again (re-placing on the same hold)
 *   fast_moves         moments where the hips moved fast (dynamic moves,
 *                      jumps, drops)
 */
import {
  angleDeg,
  distance,
  pointOf,
  visibilityOf,
  type Point,
} from './geometry';
import { hasPerson, type LandmarkName, type PoseFrame } from './pose';
import { round } from './result';
import { median } from './smoothing';
import type { KeypointSourceInfo } from './sources';

export const CLIMB_FORM_DISCLAIMER =
  'Candidate observations from 2D pose estimates. Not a grade, not coaching advice and not an injury assessment. Check them against the video.';

export type ClimbView = 'back' | 'side' | 'unclear';

export type ClimbObservationId =
  | 'straight_arms'
  | 'pauses'
  | 'hip_path'
  | 'foot_replacements'
  | 'fast_moves';

export type ClimbEvidence = Readonly<{
  /** Seconds since the first frame. */
  startS: number;
  endS: number;
  /** Indexes into the frames that were analysed. */
  startFrame: number;
  endFrame: number;
  confidence: number;
  values: Readonly<Record<string, number | string>>;
}>;

export type ClimbObservation = Readonly<{
  id: ClimbObservationId;
  status: 'observed' | 'insufficient_data';
  value: number | null;
  unit: 'share' | 'count' | 'index';
  /** 0 to 1: keypoint visibility, how much data there was, and how well the camera view suits it. */
  confidence: number;
  evidence: readonly ClimbEvidence[];
  details: Readonly<Record<string, number>>;
}>;

export type ClimbVerdict =
  | 'ok'
  | 'low_confidence'
  | 'person_not_found'
  | 'too_short';

export type ClimbFormReport = Readonly<{
  verdict: ClimbVerdict;
  reasons: readonly Readonly<{ code: string; detail: string }>[];
  capture: Readonly<{
    durationS: number;
    frames: number;
    framesWithPerson: number;
    personCoverage: number;
    meanVisibility: number;
    fps: number;
    /** From the shoulder width relative to the torso: wide means behind, narrow means side on. */
    view: ClimbView;
    shoulderToTorso: number;
    /** The part of the clip on the wall, found from the hips rising above where they started. */
    climbStartS: number;
    climbEndS: number;
    climbWindowFound: boolean;
  }>;
  method: Readonly<{
    id: 'climb-form';
    version: string;
    settings: Readonly<Record<string, number>>;
    source: KeypointSourceInfo | null;
  }>;
  /** Empty unless the verdict is "ok". */
  observations: readonly ClimbObservation[];
}>;

export type ClimbFormSettings = Readonly<{
  minVisibility: number;
  minDurationS: number;
  /** Share of frames that must show the climber. */
  minCoverage: number;
  minMeanVisibility: number;
  /** Smoothing window for positions, in seconds. */
  smoothS: number;
  /** Fill keypoint gaps up to this long. */
  maxGapS: number;
  /** Hip speed below this (torso lengths per second) is a pause. */
  stillSpeed: number;
  /** Hip speed below this counts as holding a position, for the arm check. */
  restSpeed: number;
  pauseMinS: number;
  straightElbowDeg: number;
  bentElbowDeg: number;
  bentMinS: number;
  footStillSpeed: number;
  footPlaceMinS: number;
  /** Feet shifting less than this between two settles have not moved. */
  footNoiseTL: number;
  /** Feet shifting at most this far between two settles were re-placed on the same hold. */
  footReplaceMaxTL: number;
  fastSpeed: number;
  fastMinTravelTL: number;
  /** The climb starts once the hips are this far above where they started. */
  climbRiseTL: number;
  climbRiseHoldS: number;
}>;

export const DEFAULT_CLIMB_FORM_SETTINGS: ClimbFormSettings = {
  minVisibility: 0.5,
  minDurationS: 4,
  minCoverage: 0.6,
  minMeanVisibility: 0.5,
  smoothS: 0.15,
  maxGapS: 0.3,
  stillSpeed: 0.15,
  restSpeed: 0.3,
  pauseMinS: 1.5,
  straightElbowDeg: 150,
  bentElbowDeg: 120,
  bentMinS: 1,
  footStillSpeed: 0.25,
  footPlaceMinS: 0.3,
  footNoiseTL: 0.06,
  footReplaceMaxTL: 0.35,
  fastSpeed: 1.4,
  fastMinTravelTL: 0.25,
  climbRiseTL: 0.3,
  climbRiseHoldS: 0.5,
};

const VERSION = '0.1.0';

// Series helpers. A series has one entry per frame; null where not seen.

type Series = (Point | null)[];

/** Fills gaps of at most `maxFrames` by straight lines between the known ends. */
function fillGaps(series: Series, maxFrames: number): Series {
  const out = [...series];
  let i = 0;
  while (i < out.length) {
    if (out[i] !== null) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < out.length && out[i] === null) {
      i += 1;
    }
    const before = out[start - 1];
    const after = out[i];
    const length = i - start;
    if (before && after && length <= maxFrames) {
      for (let k = 0; k < length; k += 1) {
        const f = (k + 1) / (length + 1);
        out[start + k] = {
          x: before.x + f * (after.x - before.x),
          y: before.y + f * (after.y - before.y),
        };
      }
    }
  }
  return out;
}

/** Centred moving average over `size` frames, skipping missing ones. Does not shift events in time. */
function smooth(series: Series, size: number): Series {
  const half = Math.floor(Math.max(1, size) / 2);
  return series.map((p, i) => {
    if (p === null) {
      return null;
    }
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let k = i - half; k <= i + half; k += 1) {
      const q = series[k];
      if (q) {
        sx += q.x;
        sy += q.y;
        n += 1;
      }
    }
    return { x: sx / n, y: sy / n };
  });
}

/**
 * Speed per frame in units per second, by central differences `reach` frames
 * either side. A wider reach than one frame keeps keypoint jitter from
 * breaking a pause into pieces.
 */
function speeds(
  series: Series,
  t: readonly number[],
  unit: number,
  reach: number,
): number[] {
  const last = series.length - 1;
  return series.map((_, i) => {
    const a = series[Math.max(0, i - reach)];
    const b = series[Math.min(last, i + reach)];
    const dt = t[Math.min(last, i + reach)] - t[Math.max(0, i - reach)];
    return a && b && dt > 0 ? distance(a, b) / unit / dt : NaN;
  });
}

/** Inclusive [start, end] index ranges where `mask` is true. */
function runs(mask: readonly boolean[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start = -1;
  mask.forEach((on, i) => {
    if (on && start < 0) {
      start = i;
    }
    if (!on && start >= 0) {
      out.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) {
    out.push([start, mask.length - 1]);
  }
  return out;
}

/** Convex hull perimeter (Andrew's monotone chain). */
function hullPerimeter(points: readonly Point[]): number {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) {
    return 0;
  }
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Point[]) => {
    const chain: Point[] = [];
    list.forEach(p => {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], p) <= 0
      ) {
        chain.pop();
      }
      chain.push(p);
    });
    chain.pop();
    return chain;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  return hull.reduce(
    (sum, p, i) => sum + distance(p, hull[(i + 1) % hull.length]),
    0,
  );
}

const mean = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const CORE: readonly LandmarkName[] = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_ankle',
  'right_ankle',
];

export function analyzeClimbForm(
  frames: readonly PoseFrame[],
  options: Readonly<{
    settings?: Partial<ClimbFormSettings>;
    source?: KeypointSourceInfo | null;
  }> = {},
): ClimbFormReport {
  const s: ClimbFormSettings = {
    ...DEFAULT_CLIMB_FORM_SETTINGS,
    ...options.settings,
  };
  const n = frames.length;
  const t = frames.map(f => (f.t - (n ? frames[0].t : 0)) / 1000);
  const durationS = n > 1 ? t[n - 1] : 0;
  const fps = durationS > 0 ? (n - 1) / durationS : 0;
  const withPerson = frames.filter(hasPerson);
  const meanVisibility = mean(
    withPerson.map(f => mean(CORE.map(name => visibilityOf(f, name)))),
  );
  const at = (name: LandmarkName): Series =>
    frames.map(f => pointOf(f, name, s.minVisibility));

  const shoulders = { left: at('left_shoulder'), right: at('right_shoulder') };
  const elbows = { left: at('left_elbow'), right: at('right_elbow') };
  const wrists = { left: at('left_wrist'), right: at('right_wrist') };
  const ankles = { left: at('left_ankle'), right: at('right_ankle') };
  const midOf = (a: Series, b: Series): Series =>
    a.map((p, i) => {
      const q = b[i];
      return p && q ? { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } : p ?? q;
    });
  const hipRaw = midOf(at('left_hip'), at('right_hip'));
  const shoulderMid = midOf(shoulders.left, shoulders.right);

  const torso = median(
    hipRaw.map((h, i) => {
      const sh = shoulderMid[i];
      return h && sh ? distance(h, sh) : NaN;
    }),
  );
  const shoulderToTorso = median(
    shoulders.left.map((l, i) => {
      const r = shoulders.right[i];
      return l && r && torso > 0 ? distance(l, r) / torso : NaN;
    }),
  );
  const view: ClimbView = !Number.isFinite(shoulderToTorso)
    ? 'unclear'
    : shoulderToTorso < 0.35
    ? 'side'
    : shoulderToTorso > 0.55
    ? 'back'
    : 'unclear';

  const report = (
    verdict: ClimbVerdict,
    reasons: { code: string; detail: string }[],
    window: [number, number, boolean],
    observations: ClimbObservation[],
  ): ClimbFormReport => ({
    verdict,
    reasons,
    capture: {
      durationS: round(durationS, 2),
      frames: n,
      framesWithPerson: withPerson.length,
      personCoverage: n ? round(withPerson.length / n, 3) : 0,
      meanVisibility: round(meanVisibility, 3),
      fps: round(fps, 1),
      view,
      shoulderToTorso: Number.isFinite(shoulderToTorso)
        ? round(shoulderToTorso, 2)
        : 0,
      climbStartS: n ? round(t[window[0]], 2) : 0,
      climbEndS: n ? round(t[window[1]], 2) : 0,
      climbWindowFound: window[2],
    },
    method: {
      id: 'climb-form',
      version: VERSION,
      settings: s,
      source: options.source ?? null,
    },
    observations,
  });

  // Quality gates: reject instead of describing a clip we cannot read.
  const whole: [number, number, boolean] = [0, Math.max(0, n - 1), false];
  if (withPerson.length === 0) {
    return report(
      'person_not_found',
      [{ code: 'no_person', detail: 'No climber was detected.' }],
      whole,
      [],
    );
  }
  if (durationS < s.minDurationS) {
    return report(
      'too_short',
      [
        {
          code: 'too_short',
          detail: `The clip lasted ${round(durationS, 1)}s; at least ${
            s.minDurationS
          }s is needed.`,
        },
      ],
      whole,
      [],
    );
  }
  const lowReasons: { code: string; detail: string }[] = [];
  if (withPerson.length / n < s.minCoverage) {
    lowReasons.push({
      code: 'few_frames_with_climber',
      detail: `The climber was found in ${Math.round(
        (100 * withPerson.length) / n,
      )}% of frames.`,
    });
  }
  if (meanVisibility < s.minMeanVisibility) {
    lowReasons.push({
      code: 'low_visibility',
      detail: `Mean keypoint visibility was ${round(meanVisibility, 2)}.`,
    });
  }
  if (!(torso > 0)) {
    lowReasons.push({
      code: 'torso_not_seen',
      detail: 'Shoulders and hips were never visible together.',
    });
  }
  if (lowReasons.length) {
    return report('low_confidence', lowReasons, whole, []);
  }

  const gap = Math.round(s.maxGapS * fps);
  // An odd window, so the average is centred on the frame.
  const size = 2 * Math.floor(Math.max(1, Math.round(s.smoothS * fps)) / 2) + 1;
  const prepare = (series: Series) => smooth(fillGaps(series, gap), size);
  // At least 0.1 s either side. fps comes from rounded timestamps (14.99, not 15),
  // so round() would sometimes halve the reach and double the jitter.
  const reach = Math.max(1, Math.ceil(0.1 * fps));
  const hip = prepare(hipRaw);
  const hipSpeed = speeds(hip, t, torso, reach);

  // The climb window: from the hips clearly rising above where they started
  // to the last moment they were up there.
  const startFrames = hip.slice(
    0,
    Math.max(1, Math.round(Math.min(1, durationS / 10) * fps)),
  );
  const baseline = median(startFrames.map(p => (p ? p.y : NaN)));
  const above = hip.map(
    p => p !== null && p.y < baseline - s.climbRiseTL * torso,
  );
  const holdFrames = Math.max(1, Math.round(s.climbRiseHoldS * fps));
  const firstUp = runs(above).find(([a, b]) => b - a + 1 >= holdFrames);
  const lastUp = above.lastIndexOf(true);
  const window: [number, number, boolean] =
    firstUp && lastUp > firstUp[0] ? [firstUp[0], lastUp, true] : whole;
  const inWindow = (i: number) => i >= window[0] && i <= window[1];

  const span = (a: number, b: number) => round(t[b] - t[a], 2);
  const evidence = (
    a: number,
    b: number,
    confidence: number,
    values: Record<string, number | string>,
  ): ClimbEvidence => ({
    startS: round(t[a], 2),
    endS: round(t[b], 2),
    startFrame: a,
    endFrame: b,
    confidence: round(confidence, 2),
    values,
  });
  const hipVisibility = (a: number, b: number) =>
    mean(
      frames
        .slice(a, b + 1)
        .map(f =>
          Math.max(visibilityOf(f, 'left_hip'), visibilityOf(f, 'right_hip')),
        ),
    );
  const viewFactor = view === 'back' ? 1 : view === 'unclear' ? 0.8 : 0.6;
  const observations: ClimbObservation[] = [];

  // Straight arms while holding a position.
  {
    let samples = 0;
    let straight = 0;
    const sides = { left: [0, 0], right: [0, 0] };
    const visibilities: number[] = [];
    const minAngle: number[] = frames.map(() => NaN);
    let loadedFrames = 0;
    frames.forEach((f, i) => {
      if (!inWindow(i) || !(hipSpeed[i] < s.restSpeed)) {
        return;
      }
      let loaded = false;
      (['left', 'right'] as const).forEach(side => {
        const sh = shoulders[side][i];
        const el = elbows[side][i];
        const wr = wrists[side][i];
        if (!sh || !el || !wr || wr.y > sh.y - 0.1 * torso) {
          return; // not hanging from that hand
        }
        const angle = angleDeg(sh, el, wr);
        const isStraight = angle >= s.straightElbowDeg;
        samples += 1;
        straight += isStraight ? 1 : 0;
        sides[side][0] += 1;
        sides[side][1] += isStraight ? 1 : 0;
        visibilities.push(
          mean(
            [`${side}_shoulder`, `${side}_elbow`, `${side}_wrist`].map(nm =>
              visibilityOf(f, nm as LandmarkName),
            ),
          ),
        );
        minAngle[i] = Number.isNaN(minAngle[i])
          ? angle
          : Math.min(minAngle[i], angle);
        loaded = true;
      });
      loadedFrames += loaded ? 1 : 0;
    });
    const loadedS = fps > 0 ? loadedFrames / fps : 0;
    const bent = runs(minAngle.map(a => a < s.bentElbowDeg))
      .filter(([a, b]) => t[b] - t[a] >= s.bentMinS)
      .map(([a, b]) => {
        const angles = minAngle.slice(a, b + 1).filter(Number.isFinite);
        const vis = mean(
          frames
            .slice(a, b + 1)
            .map(f => mean(CORE.slice(0, 6).map(nm => visibilityOf(f, nm)))),
        );
        return evidence(a, b, vis * viewFactor, {
          durationS: span(a, b),
          meanElbowDeg: round(mean(angles), 0),
        });
      });
    const details: Record<string, number> = {
      stillWithHandUpS: round(loadedS, 2),
      bentHolds: bent.length,
    };
    // Left and right separately, for a left/right comparison, when each was seen.
    (['left', 'right'] as const).forEach(side => {
      if (sides[side][0] > 0) {
        details[`${side}Share`] = round(sides[side][1] / sides[side][0], 3);
      }
    });
    observations.push({
      id: 'straight_arms',
      status: loadedS >= 1 ? 'observed' : 'insufficient_data',
      value: loadedS >= 1 ? round(straight / samples, 3) : null,
      unit: 'share',
      confidence: round(
        mean(visibilities) * viewFactor * Math.min(1, loadedS / 5),
        2,
      ),
      evidence: bent,
      details,
    });
  }

  // Pauses.
  const windowFrames = window[1] - window[0] + 1;
  {
    const still = hipSpeed.map((v, i) => inWindow(i) && v < s.stillSpeed);
    const stillCount = still.filter(Boolean).length;
    const pauses = runs(still)
      .filter(([a, b]) => t[b] - t[a] >= s.pauseMinS)
      .map(([a, b]) =>
        evidence(a, b, hipVisibility(a, b), { durationS: span(a, b) }),
      );
    const lengths = pauses.map(p => p.endS - p.startS);
    observations.push({
      id: 'pauses',
      status: 'observed',
      value: pauses.length,
      unit: 'count',
      confidence: round(hipVisibility(window[0], window[1]), 2),
      evidence: pauses,
      details: {
        totalS: round(
          lengths.reduce((a, b) => a + b, 0),
          2,
        ),
        longestS: round(Math.max(0, ...lengths), 2),
        stillShare: round(stillCount / windowFrames, 3),
      },
    });
  }

  // Hip path: geometric index of entropy, ln(2 * path length / hull perimeter).
  {
    const path = hip
      .slice(window[0], window[1] + 1)
      .filter((p): p is Point => p !== null)
      .map(p => ({ x: p.x / torso, y: p.y / torso }));
    const length = path.reduce(
      (sum, p, i) => (i ? sum + distance(path[i - 1], p) : 0),
      0,
    );
    const perimeter = hullPerimeter(path);
    const ok = path.length >= 10 && perimeter > 0.1;
    observations.push({
      id: 'hip_path',
      status: ok ? 'observed' : 'insufficient_data',
      value: ok ? round(Math.log((2 * length) / perimeter), 3) : null,
      unit: 'index',
      confidence: round(
        hipVisibility(window[0], window[1]) * (path.length / windowFrames),
        2,
      ),
      evidence: [],
      details: {
        pathLengthTL: round(length, 2),
        hullPerimeterTL: round(perimeter, 2),
      },
    });
  }

  // Feet that settle, move a little and settle again.
  {
    const found: ClimbEvidence[] = [];
    let placements = 0;
    let moves = 0;
    const visibilities: number[] = [];
    (['left', 'right'] as const).forEach(side => {
      const foot = prepare(ankles[side]);
      const footSpeed = speeds(foot, t, torso, reach);
      const settled = runs(
        footSpeed.map((v, i) => inWindow(i) && v < s.footStillSpeed),
      )
        .filter(([a, b]) => t[b] - t[a] >= s.footPlaceMinS)
        .map(([a, b]) => {
          const pts = foot
            .slice(a, b + 1)
            .filter((p): p is Point => p !== null);
          return {
            a,
            b,
            at: { x: median(pts.map(p => p.x)), y: median(pts.map(p => p.y)) },
          };
        });
      // Shifts below the noise level are the same placement.
      const merged: typeof settled = [];
      settled.forEach(p => {
        const last = merged[merged.length - 1];
        if (last && distance(last.at, p.at) / torso < s.footNoiseTL) {
          last.b = p.b;
        } else {
          merged.push({ ...p });
        }
      });
      placements += merged.length;
      merged.forEach((p, k) => {
        visibilities.push(
          mean(
            frames
              .slice(p.a, p.b + 1)
              .map(f => visibilityOf(f, `${side}_ankle`)),
          ),
        );
        if (k === 0) {
          return;
        }
        moves += 1;
        const prev = merged[k - 1];
        const shift = distance(prev.at, p.at) / torso;
        if (shift <= s.footReplaceMaxTL) {
          found.push(
            evidence(prev.b, p.a, mean(visibilities.slice(-2)) * viewFactor, {
              foot: side,
              shiftTL: round(shift, 2),
            }),
          );
        }
      });
    });
    found.sort((x, y) => x.startS - y.startS);
    observations.push({
      id: 'foot_replacements',
      status: placements >= 2 ? 'observed' : 'insufficient_data',
      value: placements >= 2 ? found.length : null,
      unit: 'count',
      confidence: round(
        mean(visibilities) * viewFactor * Math.min(1, placements / 4),
        2,
      ),
      evidence: found,
      details: {
        footPlacements: placements,
        footMoves: moves,
        shareOfMoves: moves ? round(found.length / moves, 3) : 0,
      },
    });
  }

  // Fast hip moves.
  {
    const fast = hipSpeed.map((v, i) => inWindow(i) && v > s.fastSpeed);
    const events = runs(fast)
      .map(([a, b]) => {
        const from = hip[Math.max(window[0], a - 1)];
        const to = hip[Math.min(window[1], b + 1)];
        if (!from || !to) {
          return null;
        }
        const dx = (to.x - from.x) / torso;
        const dy = (to.y - from.y) / torso;
        const travel = Math.hypot(dx, dy);
        if (travel < s.fastMinTravelTL) {
          return null;
        }
        // Image directions: y grows downwards.
        const direction =
          Math.abs(dy) >= Math.abs(dx)
            ? dy < 0
              ? 'up'
              : 'down'
            : dx < 0
            ? 'left'
            : 'right';
        const peak = Math.max(
          ...hipSpeed.slice(a, b + 1).filter(Number.isFinite),
        );
        return evidence(a, b, hipVisibility(a, b) * Math.min(1, fps / 24), {
          direction,
          peakSpeedTLs: round(peak, 2),
          travelTL: round(travel, 2),
        });
      })
      .filter((e): e is ClimbEvidence => e !== null);
    observations.push({
      id: 'fast_moves',
      status: 'observed',
      value: events.length,
      unit: 'count',
      confidence: round(
        hipVisibility(window[0], window[1]) * Math.min(1, fps / 24),
        2,
      ),
      evidence: events,
      details: {
        upward: events.filter(e => e.values.direction === 'up').length,
      },
    });
  }

  const reasons = window[2]
    ? []
    : [
        {
          code: 'climb_window_not_found',
          detail:
            'The hips never clearly rose above their starting height, so the whole clip was used.',
        },
      ];
  return report('ok', reasons, window, observations);
}
