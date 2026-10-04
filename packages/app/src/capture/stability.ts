import type { PoseResultDto } from '@hackyeah/data';
export type LiveMetric = 'leg_spread' | 'shoulder_reach';
export type Stability = {
  phase: 'baseline' | 'raise' | 'hold' | 'complete';
  baseline?: readonly number[];
  samples: readonly PoseResultDto[];
  latest?: PoseResultDto;
};
export const initialStability = (metric: LiveMetric): Stability => ({
  phase: metric === 'shoulder_reach' ? 'baseline' : 'hold',
  samples: [],
});
export function validLiveReading(result: PoseResultDto): boolean {
  const indices =
    result.metric === 'shoulder_reach'
      ? [11, 12, 13, 14, 15, 16, 23, 24]
      : [23, 24, 27, 28];
  const values =
    result.metric === 'shoulder_reach'
      ? [result.left_value, result.right_value]
      : [result.value];
  return (
    result.status === 'ok' &&
    result.confidence >= 0.7 &&
    Number.isFinite(result.timestamp_ms) &&
    values.every(
      value =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 180,
    ) &&
    indices.every(index => {
      const point = result.landmarks?.[index];
      return (
        point &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= 0 &&
        point.x <= 1 &&
        point.y >= 0 &&
        point.y <= 1 &&
        point.visibility >= 0.5
      );
    })
  );
}
export function advanceStability(
  state: Stability,
  result: PoseResultDto,
): Stability {
  if (!validLiveReading(result)) {
    return {
      phase: state.baseline
        ? 'raise'
        : result.metric === 'shoulder_reach'
        ? 'baseline'
        : 'hold',
      baseline: state.baseline,
      samples: [],
    };
  }
  if (state.phase === 'baseline') {
    const resting =
      result.landmarks![15].y > result.landmarks![11].y &&
      result.landmarks![16].y > result.landmarks![12].y;
    if (!resting) {
      return { ...state, samples: [], latest: result };
    }
    const gap = state.latest
      ? result.timestamp_ms! - state.latest.timestamp_ms!
      : 0;
    const candidates = [
      ...(gap > 1500 || gap <= 0 ? [] : state.samples),
      result,
    ];
    const steady = ['left_value', 'right_value'].every(key => {
      const values = candidates.map(
        sample => sample[key as 'left_value' | 'right_value']!,
      );
      return Math.max(...values) - Math.min(...values) <= 3;
    });
    const samples = steady ? candidates : [result];
    if (
      samples.length >= 3 &&
      result.timestamp_ms! - samples[0].timestamp_ms! >= 800
    ) {
      return {
        phase: 'raise',
        baseline: [result.left_value!, result.right_value!],
        samples: [],
        latest: result,
      };
    }
    return { ...state, samples, latest: result };
  }
  const values =
    result.metric === 'shoulder_reach'
      ? [result.left_value!, result.right_value!]
      : [result.value!];
  if (
    result.metric === 'shoulder_reach' &&
    !values.some((value, index) => value - state.baseline![index] >= 5)
  ) {
    return { ...state, phase: 'raise', samples: [], latest: result };
  }
  const gap = state.latest
    ? result.timestamp_ms! - state.latest.timestamp_ms!
    : 0;
  if (result.metric === 'leg_spread' && result.value! < 5) {
    return { ...state, phase: 'hold', samples: [], latest: result };
  }
  const old = gap > 1500 || gap <= 0 ? [] : state.samples;
  const samples = [...old, result];
  const steady = values.every((_, index) => {
    const all = samples.map(sample =>
      sample.metric === 'shoulder_reach'
        ? [sample.left_value!, sample.right_value!][index]
        : sample.value!,
    );
    return Math.max(...all) - Math.min(...all) <= 3;
  });
  const held = steady ? samples : [result];
  const duration = result.timestamp_ms! - held[0].timestamp_ms!;
  return {
    ...state,
    phase: held.length >= 5 && duration >= 2000 ? 'complete' : 'hold',
    samples: held,
    latest: result,
  };
}
