import type { HoldPhase, HoldTimer, PostureHint } from '../holdTimer';
import type { PoseFrame } from '../pose';
import { createDeadHangTimer, createPlankTimer } from '../postures';
import { syntheticHangSession, syntheticPlankSession } from '../synthetic';

function run(timer: HoldTimer, frames: readonly PoseFrame[]) {
  const phases: HoldPhase[] = [];
  const hints = new Set<PostureHint>();
  frames.forEach(frame => {
    const state = timer.push(frame);
    if (phases[phases.length - 1] !== state.phase) {
      phases.push(state.phase);
    }
    if (state.hint) {
      hints.add(state.hint);
    }
  });
  return { result: timer.finish(), phases, hints };
}

describe('dead hang timer', () => {
  it('times a straight-arm hang and ends it when the hands come down', () => {
    const { result, phases, hints } = run(
      createDeadHangTimer(),
      syntheticHangSession({ holdS: 10 }),
    );

    expect(result.verdict).toBe('ok');
    expect(result.unit).toBe('seconds');
    expect(result.metrics.bestHoldS).toBeCloseTo(10, 0);
    expect(Math.abs(result.metrics.bestHoldS - 10)).toBeLessThan(0.15);
    // Whole seconds, like the manual stopwatch.
    expect(result.value).toBe(Math.floor(result.metrics.bestHoldS));
    expect(result.metrics.holds).toHaveLength(1);
    expect(phases).toEqual(['get_in_position', 'holding', 'wobble', 'ended']);
    expect(hints.has('hands_not_overhead')).toBe(true);
  });

  it('ends the hold when the arms bend, and starts a new one when they straighten', () => {
    const { result, hints } = run(
      createDeadHangTimer(),
      syntheticHangSession({ holdS: 10, bendAtS: 4, bendForS: 2 }),
    );

    expect(hints.has('arms_bent')).toBe(true);
    expect(result.metrics.holds).toHaveLength(2);
    expect(result.metrics.holds[0].durationS).toBeCloseTo(4, 0);
    expect(result.metrics.holds[1].durationS).toBeCloseTo(4, 0);
    expect(result.metrics.bestHoldS).toBeLessThan(4.2);
  });

  it('keeps one hold through a detection gap shorter than the grace time', () => {
    const { result } = run(
      createDeadHangTimer(),
      syntheticHangSession({ holdS: 10, dropoutAtS: 5, dropoutForS: 0.6 }),
    );

    expect(result.metrics.holds).toHaveLength(1);
    expect(result.metrics.bestHoldS).toBeGreaterThan(9.8);
  });

  it('pauses the shown time during a wobble instead of counting it', () => {
    const timer = createDeadHangTimer();
    const frames = syntheticHangSession({
      holdS: 10,
      dropoutAtS: 5,
      dropoutForS: 0.6,
    });
    let shownDuringGap = -1;
    let shownBeforeGap = -1;
    frames.forEach(f => {
      const state = timer.push(f);
      if (f.t < 5000) {
        shownBeforeGap = state.holdS;
      }
      if (f.t > 5000 && f.t < 5600) {
        shownDuringGap = state.holdS;
      }
    });
    expect(shownDuringGap).toBeLessThanOrEqual(shownBeforeGap + 0.1);
  });

  it('reports person_not_found, too_short and low_confidence', () => {
    const empty: PoseFrame[] = Array.from({ length: 90 }, (_, i) => ({
      t: i * 33,
      width: 720,
      height: 1280,
      landmarks: {},
    }));
    expect(run(createDeadHangTimer(), empty).result.verdict).toBe(
      'person_not_found',
    );

    const short = syntheticHangSession({ holdS: 1 }).filter(f => f.t < 1800);
    expect(run(createDeadHangTimer(), short).result.verdict).toBe('too_short');

    const faint = run(
      createDeadHangTimer(),
      syntheticHangSession({ holdS: 8, visibility: 0.4 }),
    );
    expect(faint.result.verdict).toBe('low_confidence');
    expect(faint.result.value).toBeNull();
  });
});

describe('plank timer', () => {
  it('times a straight plank seen from the side', () => {
    const { result, hints } = run(
      createPlankTimer(),
      syntheticPlankSession({ holdS: 10 }),
    );

    expect(result.verdict).toBe('ok');
    expect(Math.abs(result.metrics.bestHoldS - 10)).toBeLessThan(0.15);
    expect(result.setup).toEqual({
      view: 'side',
      parts: ['shoulder', 'elbow', 'hip', 'knee', 'ankle'],
      sides: 'either',
    });
    // Standing before and lying after are both out of position, for different reasons.
    expect(hints.has('not_horizontal')).toBe(true);
    expect(hints.has('not_on_arms')).toBe(true);
  });

  it('ends the hold when the hips sag, and says so', () => {
    const { result, hints } = run(
      createPlankTimer(),
      syntheticPlankSession({ holdS: 12, sagAfterS: 6 }),
    );

    expect(hints.has('hips_sagging')).toBe(true);
    expect(result.metrics.holds).toHaveLength(1);
    expect(Math.abs(result.metrics.bestHoldS - 6)).toBeLessThan(0.15);
  });

  it('tells hips too high from hips sagging', () => {
    const { hints } = run(
      createPlankTimer(),
      syntheticPlankSession({ holdS: 6, sagAfterS: 3, sagPx: -80 }),
    );

    expect(hints.has('hips_too_high')).toBe(true);
    expect(hints.has('hips_sagging')).toBe(false);
  });

  it('says not_in_position when the plank never happens', () => {
    const standing = syntheticPlankSession({ holdS: 1 }).filter(
      f => f.t < 1000,
    );
    const frames = Array.from({ length: 4 }, (_, k) =>
      standing.map(f => ({ ...f, t: f.t + k * 1000 })),
    ).flat();
    const { result } = run(createPlankTimer(), frames);

    expect(result.verdict).toBe('not_in_position');
    expect(result.reasons[0].code).toBe('posture_not_held');
    expect(result.value).toBeNull();
  });

  it('uses the side facing the camera, whichever it is', () => {
    const mirrored = syntheticPlankSession({ holdS: 8 }).map(frame => {
      const landmarks: Record<
        string,
        PoseFrame['landmarks'][keyof PoseFrame['landmarks']]
      > = {};
      Object.entries(frame.landmarks).forEach(([name, lm]) => {
        const swapped = name.startsWith('left_')
          ? name.replace('left_', 'right_')
          : name.replace('right_', 'left_');
        landmarks[swapped] = lm;
      });
      return { ...frame, landmarks } as PoseFrame;
    });
    const { result } = run(createPlankTimer(), mirrored);

    expect(result.verdict).toBe('ok');
    expect(Math.abs(result.metrics.bestHoldS - 8)).toBeLessThan(0.3);
  });
});
