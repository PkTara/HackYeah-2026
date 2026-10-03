import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  LayerSlider,
  nearestStop,
  positionAt,
  stepStop,
} from '../components/LayerSlider';
import { fitCrumbs } from '../components/Breadcrumbs';

const STOPS = [
  { key: 'skeleton', label: 'Skeleton' },
  { key: 'muscle', label: 'Muscle' },
  { key: 'tendon', label: 'Tendon' },
] as const;
type Key = (typeof STOPS)[number]['key'];

describe('slider maths', () => {
  it('puts each stop in the middle of its third of the track', () => {
    expect(positionAt(50, 300, 3)).toBe(0);
    expect(positionAt(150, 300, 3)).toBe(1);
    expect(positionAt(250, 300, 3)).toBe(2);
    expect(positionAt(200, 300, 3)).toBeCloseTo(1.5);
  });

  it('clamps positions past the ends and before layout', () => {
    expect(positionAt(-40, 300, 3)).toBe(0);
    expect(positionAt(400, 300, 3)).toBe(2);
    expect(positionAt(100, 0, 3)).toBe(0);
  });

  it('snaps to the nearest stop and steps within range', () => {
    expect(nearestStop(1.4, 3)).toBe(1);
    expect(nearestStop(1.6, 3)).toBe(2);
    expect(nearestStop(9, 3)).toBe(2);
    expect(stepStop(0, -1, 3)).toBe(0);
    expect(stepStop(1, 1, 3)).toBe(2);
    expect(stepStop(2, 1, 3)).toBe(2);
  });
});

describe('LayerSlider', () => {
  function render(value: Key, onChange: (key: Key) => void) {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <LayerSlider label="Layer" stops={STOPS} value={value} onChange={onChange} />,
      );
    });
    return renderer;
  }

  it('is an adjustable control with its value for screen readers', () => {
    const renderer = render('muscle', jest.fn());
    const slider = renderer.root.find(n => n.props.accessibilityRole === 'adjustable');
    expect(slider.props.accessibilityLabel).toBe('Layer');
    expect(slider.props.accessibilityValue).toEqual({
      min: 1,
      max: 3,
      now: 2,
      text: 'Muscle',
    });
    act(() => renderer.unmount());
  });

  it('moves one stop per increment or decrement', () => {
    const onChange = jest.fn();
    const renderer = render('muscle', onChange);
    const slider = renderer.root.find(n => n.props.accessibilityRole === 'adjustable');
    act(() => slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
    act(() => slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
    expect(onChange.mock.calls).toEqual([['tendon'], ['skeleton']]);
    act(() => renderer.unmount());
  });

  it('jumps to a stop when its label is pressed, and marks the chosen one', () => {
    const onChange = jest.fn();
    const renderer = render('skeleton', onChange);
    const stop = (label: string) =>
      renderer.root.find(
        n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
      );
    expect(stop('Skeleton').props['aria-selected']).toBe(true);
    expect(stop('Tendon').props['aria-selected']).toBe(false);
    act(() => stop('Tendon').props.onPress());
    act(() => stop('Skeleton').props.onPress());
    expect(onChange.mock.calls).toEqual([['tendon']]);
    act(() => renderer.unmount());
  });
});

describe('fitCrumbs', () => {
  const crumbs = [
    { label: 'Hands', onPress: () => {} },
    { label: 'Right ring finger', short: 'Right ring', onPress: () => {} },
    { label: 'Anatomy' },
  ];

  it('keeps the full labels when they fit', () => {
    expect(fitCrumbs(crumbs, 1000)).toEqual(['Hands', 'Right ring finger', 'Anatomy']);
    expect(fitCrumbs(crumbs, 0)).toEqual(['Hands', 'Right ring finger', 'Anatomy']);
  });

  it('shortens the middle crumbs first on narrow screens', () => {
    expect(fitCrumbs(crumbs, 360)).toEqual(['Hands', 'Right ring', 'Anatomy']);
  });

  it('cuts middle labels down when even the short ones do not fit', () => {
    const [first, middle, last] = fitCrumbs(crumbs, 300);
    expect(first).toBe('Hands');
    expect(last).toBe('Anatomy');
    expect(middle.endsWith('..')).toBe(true);
    expect(middle.length).toBeLessThan('Right ring'.length + 2);
  });
});
