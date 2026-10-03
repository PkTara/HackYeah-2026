import {
  analyzeClimbForm,
  type ClimbObservation,
  type ClimbObservationId,
} from '../climbForm';
import type { PoseFrame } from '../pose';
import { syntheticClimbSession } from '../synthetic';

const find = (
  observations: readonly ClimbObservation[],
  id: ClimbObservationId,
) => {
  const found = observations.find(o => o.id === id);
  if (!found) {
    throw new Error(`missing observation ${id}`);
  }
  return found;
};

describe('climb form analysis', () => {
  // The synthetic climb: rest on straight arms (1.8 to 3.8 s), rest on bent
  // arms while re-placing the left foot (5.0 to 7.0 s), jump up (7.0 s),
  // short rest, rest on straight arms (9.05 to 11.05 s), drop off.
  const report = analyzeClimbForm(syntheticClimbSession());

  it('accepts a clean clip and finds the part on the wall', () => {
    expect(report.verdict).toBe('ok');
    expect(report.reasons).toEqual([]);
    expect(report.capture.view).toBe('back');
    expect(report.capture.climbWindowFound).toBe(true);
    expect(report.capture.climbStartS).toBeGreaterThan(1.0);
    expect(report.capture.climbStartS).toBeLessThan(1.8);
    expect(report.capture.climbEndS).toBeGreaterThan(11.0);
    expect(report.capture.climbEndS).toBeLessThan(11.7);
    expect(report.method).toMatchObject({ id: 'climb-form', version: '0.1.0' });
  });

  it('measures straight arms while still, and points at the bent-arm hold', () => {
    const arms = find(report.observations, 'straight_arms');

    expect(arms.status).toBe('observed');
    // About 4.8 s on straight arms and 2 s on bent arms.
    expect(arms.value as number).toBeGreaterThan(0.6);
    expect(arms.value as number).toBeLessThan(0.8);
    expect(arms.evidence).toHaveLength(1);
    const [bent] = arms.evidence;
    expect(bent.startS).toBeGreaterThan(4.6);
    expect(bent.endS).toBeLessThan(7.2);
    expect(bent.values.meanElbowDeg).toBeLessThan(120);
    expect(bent.endFrame).toBeGreaterThan(bent.startFrame);
    expect(bent.confidence).toBeGreaterThan(0.5);
    expect(arms.details.leftShare).toBeDefined();
    expect(arms.details.rightShare).toBeDefined();
  });

  it('lists the pauses with their timestamps', () => {
    const pauses = find(report.observations, 'pauses');

    expect(pauses.value).toBe(3);
    const starts = pauses.evidence.map(e => e.startS);
    expect(starts[0]).toBeCloseTo(1.8, 0);
    expect(starts[1]).toBeCloseTo(5.0, 0);
    expect(starts[2]).toBeCloseTo(9.1, 0);
    pauses.evidence.forEach(e =>
      expect(e.values.durationS as number).toBeGreaterThanOrEqual(1.5),
    );
  });

  it('finds the re-placed foot and nothing else', () => {
    const feet = find(report.observations, 'foot_replacements');

    expect(feet.value).toBe(1);
    expect(feet.evidence[0].values.foot).toBe('left');
    expect(feet.evidence[0].startS).toBeGreaterThan(5.4);
    expect(feet.evidence[0].endS).toBeLessThan(6.1);
    expect(feet.evidence[0].values.shiftTL as number).toBeLessThan(0.35);
  });

  it('finds the fast move up and the drop off', () => {
    const fast = find(report.observations, 'fast_moves');
    const up = fast.evidence.filter(e => e.values.direction === 'up');
    const down = fast.evidence.filter(e => e.values.direction === 'down');

    expect(up).toHaveLength(1);
    expect(up[0].startS).toBeGreaterThan(6.9);
    expect(up[0].endS).toBeLessThan(7.4);
    expect(up[0].values.peakSpeedTLs as number).toBeGreaterThan(1.4);
    expect(down).toHaveLength(1);
    expect(down[0].startS).toBeGreaterThan(11.0);
  });

  it('describes how winding the hip path was', () => {
    const path = find(report.observations, 'hip_path');

    expect(path.status).toBe('observed');
    expect(path.value as number).toBeGreaterThan(0);
    expect(path.value as number).toBeLessThan(2);
  });

  it('gives the same picture at 15 fps and with other jitter', () => {
    [1, 2].forEach(seed => {
      const other = analyzeClimbForm(
        syntheticClimbSession({ fps: 15, noisePx: 3, seed }),
      );
      expect(other.verdict).toBe('ok');
      expect(find(other.observations, 'pauses').value).toBe(3);
      expect(find(other.observations, 'foot_replacements').value).toBe(1);
      expect(
        find(other.observations, 'fast_moves').evidence.filter(
          e => e.values.direction === 'up',
        ),
      ).toHaveLength(1);
    });
  });

  it('notices a side view and trusts the arm angles less', () => {
    const side = analyzeClimbForm(syntheticClimbSession({ view: 'side' }));

    expect(side.capture.view).toBe('side');
    expect(find(side.observations, 'straight_arms').confidence).toBeLessThan(
      find(report.observations, 'straight_arms').confidence,
    );
  });
});

describe('climb form quality gates', () => {
  it('rejects a clip with nobody in it', () => {
    const empty: PoseFrame[] = Array.from({ length: 200 }, (_, i) => ({
      t: i * 33,
      width: 720,
      height: 1280,
      landmarks: {},
    }));
    const result = analyzeClimbForm(empty);

    expect(result.verdict).toBe('person_not_found');
    expect(result.observations).toEqual([]);
  });

  it('rejects a clip that is too short', () => {
    const result = analyzeClimbForm(
      syntheticClimbSession().filter(f => f.t < 3000),
    );

    expect(result.verdict).toBe('too_short');
    expect(result.observations).toEqual([]);
  });

  it('rejects poorly visible keypoints', () => {
    const result = analyzeClimbForm(syntheticClimbSession({ visibility: 0.4 }));

    expect(result.verdict).toBe('low_confidence');
    expect(result.reasons.map(r => r.code)).toContain('low_visibility');
    expect(result.observations).toEqual([]);
  });

  it('rejects a clip where the climber is missing most of the time', () => {
    const result = analyzeClimbForm(
      syntheticClimbSession({ dropoutAtS: 2, dropoutForS: 8 }),
    );

    expect(result.verdict).toBe('low_confidence');
    expect(result.reasons.map(r => r.code)).toContain(
      'few_frames_with_climber',
    );
  });

  it('uses the whole clip, and says so, when the climber never leaves the ground', () => {
    const standing = syntheticClimbSession().filter(f => f.t < 1000);
    const frames = Array.from({ length: 6 }, (_, k) =>
      standing.map(f => ({ ...f, t: f.t + k * 1000 })),
    ).flat();
    const result = analyzeClimbForm(frames);

    expect(result.verdict).toBe('ok');
    expect(result.capture.climbWindowFound).toBe(false);
    expect(result.reasons[0].code).toBe('climb_window_not_found');
    expect(find(result.observations, 'straight_arms').status).toBe(
      'insufficient_data',
    );
  });
});
