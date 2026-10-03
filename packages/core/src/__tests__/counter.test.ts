import { counterReducer, initialCounterState } from '../counter';

describe('counterReducer', () => {
  it('increments and decrements by the current step', () => {
    let state = counterReducer(initialCounterState, {
      type: 'setStep',
      step: 5,
    });
    state = counterReducer(state, { type: 'increment' });
    state = counterReducer(state, { type: 'increment' });
    state = counterReducer(state, { type: 'decrement' });
    expect(state).toEqual({ count: 5, step: 5 });
  });

  it('resets the count but keeps the step', () => {
    const state = counterReducer({ count: 42, step: 3 }, { type: 'reset' });
    expect(state).toEqual({ count: 0, step: 3 });
  });

  it.each([0, -1, 1.5, Number.NaN])('ignores invalid step %p', step => {
    const state = counterReducer(initialCounterState, {
      type: 'setStep',
      step,
    });
    expect(state).toBe(initialCounterState);
  });
});
