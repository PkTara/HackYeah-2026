import ReactTestRenderer, { act } from 'react-test-renderer';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';

function createFakeCapabilities(): Capabilities & {
  haptics: { tap: jest.Mock };
} {
  return {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: true, tap: jest.fn() },
    storage: createMemoryStore(),
  };
}

function pressButton(
  renderer: ReactTestRenderer.ReactTestRenderer,
  title: string,
) {
  const button = renderer.root.find(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.findAllByProps({ children: title }).length > 0,
  );
  act(() => button.props.onPress());
}

function textOf(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findByProps({ accessibilityLabel: label }).props
    .children;
}

function renderedText(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

describe('App', () => {
  it('shows the injected platform and updates the counter with haptic feedback', async () => {
    const capabilities = createFakeCapabilities();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App capabilities={capabilities} />);
    });

    expect(renderedText(renderer)).toContain('Test OS');

    pressButton(renderer, '+');
    pressButton(renderer, '+');
    expect(textOf(renderer, 'count')).toBe(2);
    expect(capabilities.haptics.tap).toHaveBeenCalledTimes(2);

    pressButton(renderer, 'Reset');
    expect(textOf(renderer, 'count')).toBe(0);
  });

  it('navigates to About and back', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <App capabilities={createFakeCapabilities()} />,
      );
    });

    pressButton(renderer, 'About this app');
    expect(renderedText(renderer)).toContain('Architecture');

    pressButton(renderer, 'Back');
    expect(renderedText(renderer)).toContain('Counter');
    expect(renderedText(renderer)).not.toContain('Architecture');
  });
});
