import ReactTestRenderer, { act } from 'react-test-renderer';
import { PixelText } from '../components/PixelText';
import { textWidth } from '../pixel/font';

function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer;
}

describe('PixelText', () => {
  it('draws one line at a fixed size', () => {
    const r = render(<PixelText text="Quiet feet" scale={3} />);
    const root = r.root.findByProps({ accessibilityLabel: 'Quiet feet' });
    expect(root.props.style).toEqual(
      expect.arrayContaining([
        { width: textWidth('Quiet feet') * 3, height: 7 * 3 },
      ]),
    );
    act(() => r.unmount());
  });

  it('wraps word by word, and reads as one heading', () => {
    const r = render(
      <PixelText text="Check in with   your hands" scale={3} heading wrap />,
    );
    const root = r.root.findByProps({
      accessibilityLabel: 'Check in with   your hands',
    });
    expect(root.props.accessibilityRole).toBe('header');
    const words = r.root.findAllByType(PixelText).filter(n => !n.props.wrap);
    expect(words.map(w => w.props.text)).toEqual([
      'Check',
      'in',
      'with',
      'your',
      'hands',
    ]);
    act(() => r.unmount());
  });
});
