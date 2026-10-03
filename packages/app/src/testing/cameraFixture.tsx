/**
 * Test helpers for the camera screens: the whole app on the demo data,
 * with a fake camera and a media client talking to a fake server.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { sampleGame, type GameState } from '@hackyeah/core';
import {
  API_TOKEN_KEY,
  createLocalBackend,
  createMediaClient,
  type LiveSocket,
  type MediaClient,
} from '@hackyeah/data';
import {
  createMemoryStore,
  type CameraPreviewProps,
  type CameraSession,
  type Capabilities,
  type MediaCapture,
} from '@hackyeah/platform';
import { App } from '../App';
import type { RouteName } from '../navigation/routes';

export type Renderer = ReactTestRenderer.ReactTestRenderer;

export const SERVER = 'http://server.test';

export const MEASUREMENT = {
  status: 'ok' as const,
  value: 92,
  metric: 'leg_spread' as const,
  unit: 'degrees' as const,
  confidence: 0.9,
  reason: null,
  protocol: 'front-facing-leg-spread-v1',
  method: 'camera' as const,
};

export type Request = { url: string; method: string; body: unknown };
type Answer = { status: number; body?: unknown } | Promise<never>;

/**
 * Fake timers that leave setImmediate real. React Native's StatusBar (in
 * every Screen) keeps its pending setImmediate handle between renders; a
 * fake handle kept past jest.useRealTimers() breaks every later test.
 */
export function useFakeTimers() {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'clearImmediate'] });
}

export function photo(overrides: Partial<MediaCapture> = {}): MediaCapture {
  return {
    kind: 'image',
    uri: 'file:///frame.jpg',
    filename: 'frame.jpg',
    mimeType: 'image/jpeg',
    release: jest.fn(),
    ...overrides,
  };
}

export function socket() {
  const sent: (string | ArrayBuffer)[] = [];
  const state = { closed: false, url: '' };
  const transport: LiveSocket = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send: value => {
      sent.push(value);
    },
    close: () => {
      state.closed = true;
    },
  };
  return { sent, state, transport };
}

/**
 * The fixture. `answer` decides each server answer by path; the default
 * analyses any photo as 92 degrees and saves everything else.
 */
export function setup(
  options: {
    camera?: Partial<CameraSession>;
    answer?: (request: Request) => Answer | Promise<Answer>;
    state?: GameState;
    live?: LiveSocket;
    media?: false;
    /** A preview that reports this instead of starting. */
    denied?: string;
  } = {},
) {
  const captures: MediaCapture[] = [];
  const camera: CameraSession = {
    snapshot: async () => {
      const shot = photo();
      captures.push(shot);
      return shot;
    },
    ...options.camera,
  };
  const preview = { active: false };
  function Preview({ active, onReady, onError }: CameraPreviewProps) {
    preview.active = active;
    useEffect(() => {
      if (active && options.denied) {
        onError(options.denied);
        return;
      }
      onReady(active ? camera : null);
    }, [active, onReady, onError]);
    return <View />;
  }
  function MediaPreview({ capture }: { capture: MediaCapture }) {
    return (
      <View
        accessibilityLabel={
          capture.kind === 'video' ? 'Captured video' : 'Captured photo'
        }
      />
    );
  }

  const storage = createMemoryStore();
  storage.setItem(API_TOKEN_KEY, 'secret');
  const requests: Request[] = [];
  const media: MediaClient | null =
    options.media === false
      ? null
      : createMediaClient({
          baseUrl: SERVER,
          storage,
          socketFactory: url => {
            if (!options.live) {
              throw new Error('No live socket in this test');
            }
            requests.push({ url, method: 'WS', body: null });
            return options.live;
          },
          fetch: async (url, init) => {
            const body =
              typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
            const request = {
              url: url.replace(SERVER, ''),
              method: init.method,
              body,
            };
            requests.push(request);
            const answer = await (options.answer?.(request) ??
              defaultAnswer(request));
            return {
              ok: answer.status < 400,
              status: answer.status,
              text: async () =>
                answer.body === undefined ? '' : JSON.stringify(answer.body),
            };
          },
        });
  const capabilities: Capabilities = {
    platform: 'other',
    platformLabel: 'Test OS',
    haptics: { isAvailable: false, tap: () => {} },
    storage,
    camera: { Preview, MediaPreview },
  };
  const backend = createLocalBackend(
    storage,
    options.state ?? { ...sampleGame, onboardingSkipped: true },
  );
  return { camera, captures, preview, requests, media, capabilities, backend };
}

function defaultAnswer(request: Request): Answer {
  if (request.url === '/v1/pose/image') {
    return { status: 200, body: MEASUREMENT };
  }
  return { status: 201, body: { id: `saved-${request.url}` } };
}

export async function render(
  fixture: ReturnType<typeof setup>,
  initialRoute: RouteName = 'Profile',
): Promise<Renderer> {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <App
        capabilities={fixture.capabilities}
        backend={fixture.backend}
        media={fixture.media}
        today="2026-10-03"
        initialRoute={initialRoute}
      />,
    );
  });
  return renderer;
}

/** The pressable with this accessibilityLabel, or undefined. */
export function control(renderer: Renderer, label: string) {
  return renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  )[0];
}

export async function press(renderer: Renderer, ...labels: string[]) {
  for (const label of labels) {
    const target = control(renderer, label);
    if (!target) {
      throw new Error(`Nothing to press called "${label}"`);
    }
    await act(async () => {
      target.props.onPress();
    });
  }
}

/** Every string on screen, run together, with a space between text nodes. */
export function text(renderer: Renderer): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      out.push(node);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      const { type: kind, children } = node as {
        type?: string;
        children?: unknown;
      };
      if (kind === 'Text') {
        out.push(flat(children), ' ');
      } else {
        walk(children);
      }
    }
  };
  const flat = (node: unknown): string =>
    typeof node === 'string'
      ? node
      : Array.isArray(node)
      ? node.map(flat).join('')
      : node && typeof node === 'object'
      ? flat((node as { children?: unknown }).children)
      : '';
  walk(renderer.toJSON());
  return out.join('');
}

export function has(renderer: Renderer, label: string): boolean {
  return (
    renderer.root.findAll(n => n.props.accessibilityLabel === label).length > 0
  );
}

export async function type(renderer: Renderer, label: string, value: string) {
  const input = renderer.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onChangeText === 'function',
  )[0];
  await act(async () => {
    input.props.onChangeText(value);
  });
}

export const SEND =
  'Send for analysis, I consent to sending this capture to the server for analysis.';
export const CONFIRM =
  'I have reviewed it, Save it to my profile as my own reading';
