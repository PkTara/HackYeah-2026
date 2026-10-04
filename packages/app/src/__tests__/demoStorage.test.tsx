import ReactTestRenderer, { act } from 'react-test-renderer';
import { createMemoryStore } from '@hackyeah/platform';
import { DemoProvider, useDemo } from '../demo/DemoProvider';

it('late writes from an older scenario stay out of the reset scenario, including after reopening', async () => {
  const memory = createMemoryStore();
  let api!: ReturnType<typeof useDemo>;
  function Probe() {
    api = useDemo();
    return null;
  }
  let screen!: ReactTestRenderer.ReactTestRenderer;
  const render = async () => {
    await act(async () => {
      screen = ReactTestRenderer.create(
        <DemoProvider storage={memory}>
          <Probe />
        </DemoProvider>,
      );
    });
  };
  await render();
  const previous = api.storage!;
  await act(async () => api.reset());
  await previous.setItem(
    'media/hands',
    '[{"date":"2026-10-04","note":"late old capture"}]',
  );
  expect(await api.storage!.getItem('media/hands')).toBeNull();
  await act(async () => screen.unmount());
  await render();
  expect(await api.storage!.getItem('media/hands')).toBeNull();
  await act(async () => screen.unmount());
});
