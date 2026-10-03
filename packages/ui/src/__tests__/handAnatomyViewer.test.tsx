import { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { HandAnatomy } from '../components/HandAnatomy';

type Renderer = ReactTestRenderer.ReactTestRenderer;

/** The viewer with its selection kept in state, as a screen would. */
function Viewer({ onSelect }: { onSelect?: (id: string | null) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <HandAnatomy
      side="right"
      selected={selected}
      onSelect={id => {
        setSelected(id);
        onSelect?.(id);
      }}
      initialListOpen
    />
  );
}

function press(renderer: Renderer, label: string) {
  const target = renderer.root.find(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  act(() => target.props.onPress());
}

const text = (renderer: Renderer) => JSON.stringify(renderer.toJSON());

describe('HandAnatomy', () => {
  it('explains the part picked from the list', () => {
    let renderer!: Renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Viewer />);
    });
    expect(text(renderer)).toContain('Each hand has 27 bones');

    press(renderer, 'Ring parts');
    press(renderer, 'Proximal phalanx, ring finger');
    const shown = text(renderer);
    expect(shown).toContain('Right ring finger');
    expect(shown).toContain('The longest finger bone');
    expect(shown).toContain('The A2 pulley sits on it');
    act(() => renderer.unmount());
  });

  it('keeps the same place in view when the layer changes', () => {
    const onSelect = jest.fn();
    let renderer!: Renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Viewer onSelect={onSelect} />);
    });
    press(renderer, 'Ring parts');
    press(renderer, 'Proximal phalanx, ring finger');
    press(renderer, 'Tendon');
    expect(onSelect).toHaveBeenLastCalledWith('ring-a2');
    expect(text(renderer)).toContain('The longest and strongest pulley');

    // The muscle layer has nothing on the base segment, so nothing is picked.
    press(renderer, 'Muscle');
    expect(onSelect).toHaveBeenLastCalledWith(null);
    act(() => renderer.unmount());
  });

  it('marks the picked part in the list without relying on colour', () => {
    let renderer!: Renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Viewer />);
    });
    press(renderer, 'Wrist parts');
    press(renderer, 'Scaphoid');
    const scaphoid = renderer.root.find(
      n => n.props.accessibilityLabel === 'Scaphoid' && n.props['aria-selected'] !== undefined,
    );
    expect(scaphoid.props['aria-selected']).toBe(true);
    act(() => renderer.unmount());
  });
});
