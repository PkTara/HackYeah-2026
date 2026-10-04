import { AccessibilityInfo, View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { emptyGame, sampleGame, type GameState } from '@hackyeah/core';
import { createLocalBackend, type ClimbingBackend } from '@hackyeah/data';
import { createMemoryStore, type Capabilities } from '@hackyeah/platform';
import { App } from '../App';

/** The demo data with setup already skipped, so the app opens on the profile. */
const SET_UP: GameState = { ...sampleGame, onboardingSkipped: true };

function createFakeCapabilities(): Capabilities {
  return {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: true, tap: jest.fn() },
    storage: createMemoryStore(),
  };
}

type Renderer = ReactTestRenderer.ReactTestRenderer;

/** Finds each pressable by its accessibilityLabel and presses them in turn. */
function press(renderer: Renderer, ...labels: string[]) {
  for (const label of labels) {
    const target = renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel === label,
    );
    act(() => target.props.onPress());
  }
}

function screenText(renderer: Renderer) {
  return JSON.stringify(renderer.toJSON());
}

async function renderApp(
  capabilities = createFakeCapabilities(),
  backend: ClimbingBackend = createLocalBackend(capabilities.storage, SET_UP),
) {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <App capabilities={capabilities} backend={backend} today="2026-10-03" />,
    );
  });
  return renderer;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('App', () => {
  it('opens on the profile with the focus, quest and monkey level', async () => {
    const renderer = await renderApp();
    const text = screenText(renderer);

    expect(text).toContain('Lvl 1');
    expect(text).toContain('Vertical');
    expect(text).toContain('Quiet feet');
    act(() => renderer.unmount());
  });

  it('levels the monkey up once per quest and saves progress', async () => {
    const capabilities = createFakeCapabilities();
    const renderer = await renderApp(capabilities);

    press(renderer, 'Done');
    expect(screenText(renderer)).toContain('Level 2');
    expect(screenText(renderer)).toContain('banana headband');

    press(renderer, 'Nice');
    expect(screenText(renderer)).toContain('Lvl 2');
    expect(screenText(renderer)).not.toContain('Level up');

    await act(async () => {});
    const saved = JSON.parse(
      (await capabilities.storage.getItem('climbing-monkey/game/v1')) ?? '{}',
    );
    expect(saved.completed).toContain('vertical-quiet-feet');
    act(() => renderer.unmount());
  });

  it('swaps to a different quest', async () => {
    const renderer = await renderApp();

    press(renderer, 'Swap');
    expect(screenText(renderer)).toContain('Read it first');
    act(() => renderer.unmount());
  });

  it('switches tabs from the tab bar', async () => {
    const renderer = await renderApp();

    press(renderer, 'Data');
    expect(screenText(renderer)).not.toContain('Quiet feet');

    press(renderer, 'Profile');
    expect(screenText(renderer)).toContain('Quiet feet');
    act(() => renderer.unmount());
  });

  it('logs multiple new styles, reloads them and counts each on the profile', async () => {
    const capabilities = createFakeCapabilities();
    const fresh = () =>
      createLocalBackend(capabilities.storage, {
        ...emptyGame,
        onboardingSkipped: true,
      });
    const renderer = await renderApp(capabilities, fresh());
    press(
      renderer,
      'Log',
      'Log climb',
      'Vertical',
      'Technical',
      'Powerful',
      'Balance',
      'Coordination',
      'Compression',
      'Endurance',
    );
    // Styles can be toggled independently before saving.
    press(renderer, 'Powerful', 'V3', 'Sent', 'Save climb');
    await act(async () => {});

    const saved = JSON.parse(
      (await capabilities.storage.getItem('climbing-monkey/game/v1')) ?? '{}',
    );
    expect(saved.logs).toHaveLength(1);
    expect(saved.logs[0]).toMatchObject({
      movements: [
        'technical',
        'balance',
        'coordination',
        'compression',
        'endurance',
      ],
      terrain: 'vertical',
      grade: 'V3',
      sent: true,
    });
    // Back on the list, the climb shows with every style.
    press(renderer, 'See your climbs');
    expect(screenText(renderer)).toContain('1 climb this week: 1 sent.');
    expect(screenText(renderer)).toContain(
      'Technical, balance, coordination, compression and endurance, holds not recorded',
    );
    act(() => renderer.unmount());

    const again = await renderApp(capabilities, fresh());
    for (const style of [
      'Technical',
      'Balance',
      'Coordination',
      'Compression',
      'Endurance',
    ]) {
      // One compact row per logged style; the whole row opens its sheet.
      expect(screenText(again)).toContain(`Why: ${style} tally`);
    }
    // Styles with no climbs fold into one line instead of a row each.
    expect(screenText(again)).not.toContain('Why: Powerful tally');
    expect(screenText(again)).toMatch(
      /Not logged yet: ?controlled, dynamic, powerful\./,
    );
    act(() => again.unmount());
  });

  it('puts the saved state back and says so when a save fails', async () => {
    const local = createLocalBackend(createMemoryStore(), SET_UP);
    const backend: ClimbingBackend = {
      ...local,
      kind: 'remote',
      completeQuest: () => Promise.reject(new Error('server down')),
    };
    const renderer = await renderApp(createFakeCapabilities(), backend);

    press(renderer, 'Done');
    press(renderer, 'Nice');
    await act(async () => {});

    expect(screenText(renderer)).toContain('Could not save that change');
    expect(screenText(renderer)).toContain('Lvl 1');
    act(() => renderer.unmount());
  });

  it('shows the quest a server picked instead of one from the library', async () => {
    const assigned = {
      id: 'srv-1',
      kind: 'checkin' as const,
      title: 'Check in with your hands',
      task: 'Record how your hand feels today.',
      why: 'Current hand discomfort was reported.',
      minutes: 1,
      equipment: 'None',
      loadsFingers: false,
    };
    const next = {
      ...assigned,
      id: 'srv-2',
      title: 'Understand your starting point',
    };
    const local = createLocalBackend(createMemoryStore(), {
      ...SET_UP,
      assigned,
    });
    const backend: ClimbingBackend = {
      ...local,
      kind: 'remote',
      // The server answers a completion with its next pick.
      completeQuest: async id => ({
        ...SET_UP,
        completed: [...SET_UP.completed, id],
        assigned: next,
      }),
    };
    const renderer = await renderApp(createFakeCapabilities(), backend);
    expect(screenText(renderer)).toContain('Check in with your hands');
    expect(screenText(renderer)).not.toContain('Quiet feet');

    press(renderer, 'Done');
    press(renderer, 'Nice');
    await act(async () => {});
    expect(screenText(renderer)).toContain('Understand your starting point');
    expect(screenText(renderer)).toContain('Lvl 2');
    act(() => renderer.unmount());
  });
});

describe('profile reset', () => {
  const GAME_KEY = 'climbing-monkey/game/v1';

  it('asks first, then deletes everything and runs setup again', async () => {
    const capabilities = createFakeCapabilities();
    const renderer = await renderApp(capabilities);

    press(renderer, 'Reset profile');
    expect(screenText(renderer)).toContain('Are you sure?');
    expect(screenText(renderer)).toContain('Quiet feet');

    press(renderer, 'Yes, reset my profile');
    await act(async () => {});

    expect(screenText(renderer)).toContain('Skip setup');
    expect(screenText(renderer)).not.toContain('Quiet feet');
    const saved = await capabilities.storage.getItem(GAME_KEY);
    expect(JSON.parse(saved ?? 'null')).toEqual(emptyGame);
    act(() => renderer.unmount());
  });

  it('keeps everything when the climber keeps the profile', async () => {
    const capabilities = createFakeCapabilities();
    const local = createLocalBackend(capabilities.storage, SET_UP);
    const backend: ClimbingBackend = {
      ...local,
      resetProfile: jest.fn(local.resetProfile),
    };
    const renderer = await renderApp(capabilities, backend);

    press(renderer, 'Reset profile', 'Keep my profile');
    await act(async () => {});

    expect(backend.resetProfile).not.toHaveBeenCalled();
    expect(screenText(renderer)).not.toContain('Are you sure?');
    expect(screenText(renderer)).toContain('Quiet feet');
    expect(screenText(renderer)).toContain('Lvl 1');
    expect(await capabilities.storage.getItem(GAME_KEY)).toBeNull();
    act(() => renderer.unmount());
  });

  it('says so and keeps the profile when the reset fails', async () => {
    const local = createLocalBackend(createMemoryStore(), SET_UP);
    const backend: ClimbingBackend = {
      ...local,
      kind: 'remote',
      resetProfile: () => Promise.reject(new Error('server down')),
    };
    const renderer = await renderApp(createFakeCapabilities(), backend);

    press(renderer, 'Reset profile', 'Yes, reset my profile');
    await act(async () => {});

    expect(screenText(renderer)).toContain('Could not reset your profile.');
    expect(screenText(renderer)).toContain('Quiet feet');
    expect(screenText(renderer)).toContain('Lvl 1');
    act(() => renderer.unmount());
  });

  it('moves focus to the question when it appears', async () => {
    const renderer = await renderApp();
    const sendEvent = jest.mocked(AccessibilityInfo.sendAccessibilityEvent);
    sendEvent.mockClear();

    press(renderer, 'Reset profile');

    const question = renderer.root.find(
      node =>
        node.type === View && node.props.accessibilityLabel === 'Are you sure?',
    ).instance;
    // The screen reader on phones, and keyboard focus on the web.
    expect(sendEvent).toHaveBeenCalledWith(question, 'focus');
    expect(question.focus.mock.contexts).toContain(question);
    act(() => renderer.unmount());
  });
});

describe('links', () => {
  it('a link to a finger close-up shows the Hands tab as current', async () => {
    const capabilities = createFakeCapabilities();
    let renderer!: Renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <App
          capabilities={capabilities}
          backend={createLocalBackend(capabilities.storage, SET_UP)}
          today="2026-10-03"
          initialRoute="Finger"
        />,
      );
    });
    const tab = (label: string) =>
      renderer.root.find(
        n =>
          n.props.accessibilityLabel === label &&
          n.props['aria-selected'] !== undefined,
      ).props['aria-selected'];
    expect(tab('Hands')).toBe(true);
    expect(tab('Profile')).toBe(false);
    act(() => renderer.unmount());
  });
});

describe('first launch', () => {
  it('runs setup first, and remembers a skip', async () => {
    const capabilities = createFakeCapabilities();
    const fresh = () => createLocalBackend(capabilities.storage);
    const renderer = await renderApp(capabilities, fresh());
    expect(screenText(renderer)).toContain('Skip setup');
    expect(screenText(renderer)).not.toContain('Quiet feet');

    press(renderer, 'Skip setup');
    expect(screenText(renderer)).toContain('Quiet feet');
    await act(async () => {});
    act(() => renderer.unmount());

    // Opened again: straight to the profile.
    const again = await renderApp(capabilities, fresh());
    expect(screenText(again)).toContain('Quiet feet');
    expect(screenText(again)).not.toContain('Skip setup');
    act(() => again.unmount());
  });

  it('saves the answers, and can run setup again from Data', async () => {
    const capabilities = createFakeCapabilities();
    const renderer = await renderApp(
      capabilities,
      createLocalBackend(capabilities.storage),
    );
    press(renderer, 'Start');
    press(renderer, 'Outdoors', 'Next');
    press(renderer, '2 to 5 years', 'Next');
    press(renderer, 'V4', 'Next');
    press(renderer, 'Get stronger fingers', 'Next');
    press(renderer, 'Skip reach', 'Skip apps', 'Skip for now');
    press(renderer, 'Go to my profile');
    expect(screenText(renderer)).toContain('Quiet feet');
    await act(async () => {});

    const saved = async () =>
      JSON.parse(
        (await capabilities.storage.getItem('climbing-monkey/game/v1')) ?? '{}',
      );
    expect((await saved()).onboarding.details.goal).toBe('finger-strength');

    // A rerun that is skipped keeps the first answers.
    press(renderer, 'Data');
    press(renderer, 'Redo setup');
    expect(screenText(renderer)).toContain('Skip setup');
    press(renderer, 'Skip setup');
    await act(async () => {});
    expect(screenText(renderer)).not.toContain('Skip setup');
    expect((await saved()).onboarding.details.goal).toBe('finger-strength');
    expect((await saved()).onboardingSkipped).toBe(false);
    act(() => renderer.unmount());
  });
});
