import { baselineTest, type BaselineTestId } from '@hackyeah/core';
import { LIVE_TEST_IDS, type LiveTestId } from '../result';

// Fails to typecheck if a live test id stops being a home test id in core.
const asBaseline: readonly BaselineTestId[] =
  LIVE_TEST_IDS satisfies readonly LiveTestId[];

describe('live test ids', () => {
  it('are the same ids as the home tests in @hackyeah/core', () => {
    asBaseline.forEach(id => expect(baselineTest(id).id).toBe(id));
  });

  it('use the same units as the home tests', () => {
    expect(baselineTest('pull-ups').unit).toBe('reps');
    expect(baselineTest('dead-hang').unit).toBe('seconds');
    expect(baselineTest('plank').unit).toBe('seconds');
  });
});
