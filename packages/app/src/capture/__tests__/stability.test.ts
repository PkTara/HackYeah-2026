import { advanceStability, initialStability } from '../stability';
import { shoulder } from '../../testing/livePoseFixture';
const restingBaseline = () =>
  [0, 500, 1000].reduce(
    (state, t) => advanceStability(state, shoulder(t)),
    initialStability('shoulder_reach'),
  );
test('resting arms establish a baseline without completing', () => {
  let state = initialStability('shoulder_reach');
  for (let t = 0; t <= 5000; t += 500) {
    state = advanceStability(state, shoulder(t));
  }
  expect(state.phase).toBe('raise');
  expect(state.baseline).toEqual([10, 10]);
  expect(state.samples).toHaveLength(0);
});
test('relative arm raise followed by five steady samples over two seconds completes', () => {
  let state = restingBaseline();
  for (let t = 1500; t <= 3500; t += 500) {
    state = advanceStability(state, shoulder(t, 170));
  }
  expect(state.phase).toBe('complete');
  expect(state.latest?.left_value).toBe(170);
});
test('invalid landmarks reset a shoulder hold and remove the review reading', () => {
  let state = restingBaseline();
  state = advanceStability(state, shoulder(1500, 170));
  state = advanceStability(state, {
    ...shoulder(2000, 170),
    landmarks: undefined,
  });
  expect(state.phase).toBe('raise');
  expect(state.samples).toHaveLength(0);
  expect(state.latest).toBeUndefined();
});
test('a gap over 1.5 seconds resets the held samples', () => {
  let state = restingBaseline();
  for (const t of [1500, 2000, 2500, 3000]) {
    state = advanceStability(state, shoulder(t, 170));
  }
  state = advanceStability(state, shoulder(5000, 170));
  expect(state.phase).toBe('hold');
  expect(state.samples).toHaveLength(1);
});
test('leg spread only completes a meaningful steady hold', () => {
  let state = initialStability('leg_spread');
  const leg = (t: number, value: number) => ({
    ...shoulder(t),
    metric: 'leg_spread' as const,
    value,
  });
  for (let t = 0; t <= 3000; t += 500) {
    state = advanceStability(state, leg(t, 0));
  }
  expect(state.phase).not.toBe('complete');
  for (let t = 3500; t <= 5500; t += 500) {
    state = advanceStability(state, leg(t, 92));
  }
  expect(state.phase).toBe('complete');
});
test('valid small shoulder movement remains reviewable for manual Stop', () => {
  const baseline = restingBaseline();
  const state = advanceStability(baseline, shoulder(1500, 12));
  expect(state.phase).toBe('raise');
  expect(state.latest?.left_value).toBe(12);
});
test('starting with already raised arms cannot complete before a resting baseline', () => {
  let state = initialStability('shoulder_reach');
  const frame = shoulder(0, 170);
  const points = frame.landmarks!.map(p => ({ ...p }));
  points[15].y = 0.2;
  points[16].y = 0.2;
  for (let t = 0; t <= 3000; t += 500) {
    state = advanceStability(state, {
      ...frame,
      timestamp_ms: t,
      landmarks: points,
    });
  }
  expect(state.phase).toBe('baseline');
  expect(state.samples).toHaveLength(0);
});
test('returning to resting arms resets the raise requirement', () => {
  let state = restingBaseline();
  state = advanceStability(state, shoulder(1500, 170));
  for (let t = 2000; t <= 4500; t += 500) {
    state = advanceStability(state, shoulder(t, 10));
  }
  expect(state.phase).toBe('raise');
  expect(state.samples).toHaveLength(0);
});
test('baseline needs three steady resting samples spanning at least 800 milliseconds', () => {
  let state = advanceStability(initialStability('shoulder_reach'), shoulder(0));
  expect(state.phase).toBe('baseline');
  state = advanceStability(state, shoulder(500));
  expect(state.phase).toBe('baseline');
  state = advanceStability(state, shoulder(1000));
  expect(state.phase).toBe('raise');
  expect(state.baseline).toEqual([10, 10]);
});
