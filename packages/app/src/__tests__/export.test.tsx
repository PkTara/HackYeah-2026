import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AUDIENCES, sampleGame, type GameState } from '@hackyeah/core';
import { createLocalBackend } from '@hackyeah/data';
import {
  createMemoryStore,
  type Capabilities,
  type ShareCapability,
} from '@hackyeah/platform';
import { App } from '../App';
import { trailFor } from '../navigation/trail';

const SET_UP: GameState = {
  ...sampleGame,
  onboardingSkipped: true,
  flags: [{ side: 'right', finger: 'ring', date: '2026-09-27', spots: ['a2'] }],
};

type Renderer = ReactTestRenderer.ReactTestRenderer;

function fakeShare(over: Partial<ShareCapability> = {}) {
  return {
    share: jest.fn().mockResolvedValue('shared'),
    canCopy: true,
    copy: jest.fn().mockResolvedValue(true),
    ...over,
  } satisfies ShareCapability;
}

function capabilities(share?: ShareCapability): Capabilities {
  return {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: true, tap: jest.fn() },
    storage: createMemoryStore(),
    share,
  };
}

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

const has = (renderer: Renderer, label: string) =>
  renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  ).length > 0;

const settle = () => act(async () => {});

const screenText = (renderer: Renderer) => JSON.stringify(renderer.toJSON());

/** The exact text in the preview box. */
function preview(renderer: Renderer): string {
  const node = renderer.root.find(
    n => n.props.testID === 'export-preview' && typeof n.type !== 'string',
  );
  const children = node.props.children;
  return Array.isArray(children) ? children.join('') : String(children);
}

function status(renderer: Renderer): string {
  const node = renderer.root.find(
    n => n.props.testID === 'export-status' && typeof n.type !== 'string',
  );
  return String(node.props.children ?? '');
}

async function renderApp(caps = capabilities(fakeShare())) {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <App
        capabilities={caps}
        backend={createLocalBackend(caps.storage, SET_UP)}
        today="2026-10-04"
      />,
    );
  });
  return renderer;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Export in every mode', () => {
  it('opens from the monkey profile and lists seven readers', async () => {
    const renderer = await renderApp();
    press(renderer, 'Export');
    for (const audience of Object.values(AUDIENCES)) {
      expect(has(renderer, `Export for ${audience.name}`)).toBe(true);
      expect(has(renderer, `Why this format: ${audience.name}`)).toBe(true);
    }
    expect(screenText(renderer)).toContain(
      'Made on this device. Nothing is sent until you share it.',
    );
    act(() => renderer.unmount());
  });

  it.each([
    ['gazelle', 'Running', 'runs'],
    ['dolphin', 'Swimming', 'swims'],
  ])('opens from the %s profile with its own words', async (pet, name, sessions) => {
    const renderer = await renderApp();
    press(renderer, `Switch to ${pet} mode`, 'Export', 'Export for Coach');
    const text = preview(renderer);
    expect(text).toContain(`${name} training for my coach`);
    expect(text).toContain(`Recent ${sessions}`);
    expect(text).not.toContain('climb');
    act(() => renderer.unmount());
  });

  it('opens from the Data hub', async () => {
    const renderer = await renderApp();
    press(renderer, 'Data', 'Export your record');
    expect(has(renderer, 'Export for Doctor or GP')).toBe(true);
    act(() => renderer.unmount());
  });
});

describe('one reader', () => {
  it('previews the doctor sheet and drops a section turned off', async () => {
    const renderer = await renderApp();
    press(renderer, 'Export', 'Export for Doctor or GP');
    const text = preview(renderer);
    expect(text).toContain('Climbing record for my doctor');
    expect(text).toContain(AUDIENCES.doctor.notThis);
    expect(text).toContain('Right ring finger');
    expect(text).toContain('Some entries are example data.');
    press(renderer, 'Sore spots');
    expect(preview(renderer)).not.toContain('What is sore');
    act(() => renderer.unmount());
  });

  it('shares and copies the previewed text, with quiet status lines', async () => {
    const shareFn = jest.fn().mockResolvedValue('shared');
    const copyFn = jest.fn().mockResolvedValue(true);
    const share = fakeShare({ share: shareFn, copy: copyFn });
    const alert = jest.spyOn(Alert, 'alert');
    const renderer = await renderApp(capabilities(share));
    press(renderer, 'Export', 'Export for Family');
    const text = preview(renderer);
    press(renderer, 'Share');
    await settle();
    // The preview drops only the file's last line break.
    expect(shareFn.mock.calls[0][0].text).toBe(`${text}\n`);
    expect(status(renderer)).toBe('Shared.');
    press(renderer, 'Copy');
    await settle();
    expect(copyFn).toHaveBeenCalledWith(`${text}\n`);
    expect(status(renderer)).toBe('Copied.');
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
    act(() => renderer.unmount());
  });

  it('says to select the text when copying fails', async () => {
    const share = fakeShare({ copy: jest.fn().mockResolvedValue(false) });
    const renderer = await renderApp(capabilities(share));
    press(renderer, 'Export', 'Export for Coach', 'Copy');
    await settle();
    expect(status(renderer)).toBe(
      'Could not copy. Select the preview text instead.',
    );
    act(() => renderer.unmount());
  });

  it('shows only the buttons the device supports', async () => {
    const plain = await renderApp(capabilities(undefined));
    press(plain, 'Export', 'Export for Physio');
    expect(screenText(plain)).toContain('Select the preview text to copy it.');
    expect(has(plain, 'Share')).toBe(false);
    act(() => plain.unmount());

    const download = jest.fn().mockResolvedValue('saved');
    const print = jest.fn().mockResolvedValue(true);
    const renderer = await renderApp(
      capabilities(fakeShare({ download, print })),
    );
    press(renderer, 'Export', 'Export for Physio');
    expect(has(renderer, 'Save file')).toBe(true);
    expect(has(renderer, 'Print or save as PDF')).toBe(false);
    press(renderer, 'Printable page', 'Print or save as PDF');
    await settle();
    expect(print.mock.calls[0][0]).toContain('<!doctype html>');
    press(renderer, 'Save file');
    await settle();
    expect(download.mock.calls[0][0].name).toBe(
      'climbing-monkey-physio-climb-2026-10-04.html',
    );
    expect(status(renderer)).toBe(
      'Saved climbing-monkey-physio-climb-2026-10-04.html.',
    );
    act(() => renderer.unmount());
  });

  it('keeps typed text out of storage', async () => {
    const caps = capabilities(fakeShare());
    const written: string[] = [];
    const store = caps.storage;
    const recording: Capabilities = {
      ...caps,
      storage: {
        ...store,
        getItem: key => store.getItem(key),
        removeItem: key => store.removeItem(key),
        setItem: (key, value) => {
          written.push(`${key}=${value}`);
          return store.setItem(key, value);
        },
      },
    };
    const renderer = await renderApp(recording);
    press(renderer, 'Export', 'Export for Doctor or GP');
    const field = renderer.root.find(
      n =>
        n.props.accessibilityLabel === 'Why are you going? (optional)' &&
        typeof n.props.onChangeText === 'function',
    );
    act(() => field.props.onChangeText('Secret knee worry'));
    await settle();
    expect(preview(renderer)).toContain('Secret knee worry');
    expect(written.join('\n')).not.toContain('Secret');
    act(() => renderer.unmount());
  });
});

describe('export trail', () => {
  it('sits under the profile of its mode', () => {
    expect(
      trailFor('ExportFormat', { audience: 'doctor' }).map(c => c.label),
    ).toEqual(['Profile', 'Export', 'Doctor or GP']);
    expect(
      trailFor('SportExportFormat', { audience: 'coach' }).map(c => c.route),
    ).toEqual(['SportProfile', 'SportExport', 'SportExportFormat']);
  });
});
