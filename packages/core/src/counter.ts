/**
 * Example domain module: replace with the project's real logic.
 *
 * Everything in @hackyeah/core is plain TypeScript: no React, no react-native,
 * no I/O. That keeps it runnable in any host (HarmonyOS, Android, iOS, web,
 * a server, or a unit test) and trivially testable.
 */

export type CounterState = Readonly<{
  count: number;
  step: number;
}>;

export type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'setStep'; step: number };

export const initialCounterState: CounterState = { count: 0, step: 1 };

export function counterReducer(
  state: CounterState,
  action: CounterAction,
): CounterState {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'reset':
      return { ...state, count: 0 };
    case 'setStep':
      if (!Number.isInteger(action.step) || action.step < 1) {
        return state;
      }
      return { ...state, step: action.step };
  }
}
