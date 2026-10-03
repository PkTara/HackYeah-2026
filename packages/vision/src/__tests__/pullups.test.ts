import { PullupCounter } from '../pullups';
import type { PoseFrame } from '../pose';
import type { RepPhase } from '../repCounter';
import { syntheticPullupSession } from '../synthetic';

function run(frames: readonly PoseFrame[]) {
  const counter = new PullupCounter();
  const phases: RepPhase[] = [];
  frames.forEach(frame => {
    const { phase } = counter.push(frame);
    if (phases[phases.length - 1] !== phase) {
      phases.push(phase);
    }
  });
  return { result: counter.finish(), phases, counter };
}

describe('PullupCounter', () => {
  it('counts full reps and times the ascent and descent of each', () => {
    const { result } = run(syntheticPullupSession({ reps: 5 }));

    expect(result.verdict).toBe('ok');
    expect(result.value).toBe(5);
    expect(result.unit).toBe('reps');
    expect(result.metrics.partialReps).toBe(0);
    expect(result.metrics.repDetails).toHaveLength(5);
    result.metrics.repDetails.forEach(rep => {
      // The figure takes 1.0 s up and 1.2 s down; the measured span runs from
      // leaving the straight-arm hang to the nose clearing the hands, so it is
      // a little shorter.
      expect(rep.ascentS).toBeGreaterThan(0.4);
      expect(rep.ascentS).toBeLessThanOrEqual(1.0);
      expect(rep.descentS).not.toBeNull();
      expect(rep.descentS as number).toBeGreaterThan(0.4);
      expect(rep.descentS as number).toBeLessThanOrEqual(1.2);
      expect(rep.topS).toBeGreaterThan(rep.startS);
    });
    expect(result.metrics.meanAscentS).not.toBeNull();
  });

  it('keeps a half-way attempt as a partial rep and does not count it', () => {
    const { result } = run(syntheticPullupSession({ reps: 5, partialAt: [3] }));

    expect(result.value).toBe(4);
    expect(result.metrics.partialReps).toBe(1);
    expect(result.metrics.partials[0].reason).toBe('target_not_reached');
    expect(result.metrics.partials[0].peakProgress).toBeGreaterThan(0.35);
    expect(result.metrics.partials[0].peakProgress).toBeLessThan(0.6);
  });

  it('goes through the live phases a screen shows', () => {
    const { phases } = run(syntheticPullupSession({ reps: 1 }));

    expect(phases).toEqual([
      'get_in_position',
      'at_start',
      'going',
      'at_target',
      'returning',
      'at_start',
      'get_in_position',
    ]);
  });

  it('reports live counts as the reps happen', () => {
    const counter = new PullupCounter();
    const counts = syntheticPullupSession({ reps: 3 }).map(
      f => counter.push(f).reps,
    );

    expect(counts[0]).toBe(0);
    expect(Math.max(...counts)).toBe(3);
    // The count never goes down.
    expect(counts.every((c, i) => i === 0 || c >= counts[i - 1])).toBe(true);
  });

  it('works at 15 fps with more jitter, and with other seeds', () => {
    [1, 2, 3].forEach(seed => {
      const { result } = run(
        syntheticPullupSession({ reps: 4, fps: 15, noisePx: 4, seed }),
      );
      expect(result.verdict).toBe('ok');
      expect(result.value).toBe(4);
    });
  });

  it('drops a rep the camera lost, and keeps counting after it', () => {
    // Rep 3 (index 2) starts at 8.5 s; the person vanishes during its ascent.
    const { result } = run(
      syntheticPullupSession({ reps: 5, dropoutAtS: 8.8, dropoutForS: 1.5 }),
    );

    expect(result.value).toBe(4);
    expect(result.metrics.partialReps).toBe(0);
  });

  it('rides out a short detection gap without losing the set', () => {
    const { result } = run(
      syntheticPullupSession({ reps: 3, dropoutAtS: 5.0, dropoutForS: 0.4 }),
    );

    expect(result.value).toBe(3);
  });

  it('says person_not_found when nobody is in the picture', () => {
    const empty: PoseFrame[] = Array.from({ length: 150 }, (_, i) => ({
      t: i * 33,
      width: 720,
      height: 1280,
      landmarks: {},
    }));
    const { result } = run(empty);

    expect(result.verdict).toBe('person_not_found');
    expect(result.value).toBeNull();
    expect(result.reasons[0].code).toBe('no_person');
  });

  it('says too_short for a capture under three seconds', () => {
    const frames = syntheticPullupSession({ reps: 1 }).filter(f => f.t < 2500);
    const { result } = run(frames);

    expect(result.verdict).toBe('too_short');
    expect(result.value).toBeNull();
  });

  it('says low_confidence when the needed points are barely visible', () => {
    const { result } = run(
      syntheticPullupSession({ reps: 3, visibility: 0.4 }),
    );

    expect(result.verdict).toBe('low_confidence');
    expect(result.value).toBeNull();
    expect(result.reasons.map(r => r.code)).toContain('low_visibility');
  });

  it('says not_in_position when nobody ever hangs from the bar', () => {
    const standing = syntheticPullupSession({ reps: 2 }).filter(
      f => f.t < 1000,
    );
    // Repeat the standing frames for 4 s.
    const frames = Array.from({ length: 4 }, (_, k) =>
      standing.map(f => ({ ...f, t: f.t + k * 1000 })),
    ).flat();
    const { result, phases } = run(frames);

    expect(phases).toEqual(['get_in_position']);
    expect(result.verdict).toBe('not_in_position');
    expect(result.reasons[0].code).toBe('start_position_not_seen');
  });

  it('keeps the method, thresholds and source with the result', () => {
    const counter = new PullupCounter({
      source: {
        id: 'simulated',
        model: 'synthetic stick figure',
        modelVersion: 'synthetic-1',
        landmarkSet: 'shared',
        runsOn: 'device',
        simulated: true,
      },
    });
    syntheticPullupSession({ reps: 1 }).forEach(f => counter.push(f));
    const result = counter.finish();

    expect(result.method.id).toBe('pull-up-counter');
    expect(result.method.version).toBe('1.0.0');
    expect(result.method.settings.straightElbowDeg).toBe(150);
    expect(result.method.source?.simulated).toBe(true);
    expect(result.setup.view).toBe('front');
    expect(result.capture.fps).toBeGreaterThan(25);
  });
});
