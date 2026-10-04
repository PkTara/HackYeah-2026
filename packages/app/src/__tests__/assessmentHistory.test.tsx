import ReactTestRenderer, { act } from 'react-test-renderer';
import { emptyGame, type AssessmentRecord } from '@hackyeah/core';
import { createLocalBackend, type ClimbingBackend } from '@hackyeah/data';
import { createMemoryStore } from '@hackyeah/platform';
import { GameProvider, useGame } from '../state/GameProvider';

const record: AssessmentRecord = {
  id: 'camera-1',
  metric: 'shoulder_reach_left',
  value: 175,
  unit: 'degrees',
  method: 'camera',
  confidence: 0.9,
  protocol: 'front-facing-overhead-reach-v1',
  occurredAt: '2026-10-04T10:00:00Z',
};
let api: ReturnType<typeof useGame>;
function Probe() {
  api = useGame();
  return null;
}
async function render(backend: ClimbingBackend) {
  let screen!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <GameProvider backend={backend}>
        <Probe />
      </GameProvider>,
    );
  });
  return screen;
}

it('useGame saves reviewed assessments and resolves after persistence', async () => {
  const backend = createLocalBackend(createMemoryStore(), emptyGame);
  const screen = await render(backend);
  await act(async () => {
    await api.saveAssessment(record);
  });
  expect((await backend.load()).assessments).toEqual([record]);
  expect(api.state.assessments).toEqual([record]);
  await act(async () => screen.unmount());
});

it('rejects a failed assessment save, restoring history and exposing the sync notice', async () => {
  const local = createLocalBackend(createMemoryStore(), emptyGame);
  const failure = new Error('offline');
  const screen = await render({
    ...local,
    saveAssessment: async () => {
      throw failure;
    },
  });
  await act(async () => {
    await expect(api.saveAssessment(record)).rejects.toBe(failure);
  });
  expect(api.state.assessments).toEqual([]);
  expect(api.syncError).toContain('Could not save');
  await act(async () => screen.unmount());
});

it('rolls back the provider when the actual local store cannot persist a reviewed reading', async () => {
  const storage = createMemoryStore();
  const backend = createLocalBackend(
    {
      ...storage,
      setItem: async () => {
        throw new Error('disk full');
      },
    },
    emptyGame,
  );
  const screen = await render(backend);
  await act(async () => {
    await expect(api.saveAssessment(record)).rejects.toThrow('disk full');
  });
  expect(api.state.assessments).toEqual([]);
  expect((await backend.load()).assessments).toEqual([]);
  expect(api.syncError).toContain('Could not save');
  await act(async () => screen.unmount());
});
