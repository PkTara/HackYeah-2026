/**
 * Backend that talks to a JSON HTTP API. Paths live in endpoints.ts and
 * payload shapes in wire.ts; this file only does the requests.
 */
import { BackendError, type ClimbingBackend } from './backend';
import { endpoints, type Route } from './endpoints';
import {
  fromProfileDto,
  toClimbDto,
  toHandFlagDto,
  toReachDto,
} from './wire';

/** The part of fetch we use. Typed locally so tests can pass a fake. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: unknown;
  },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export type HttpBackendOptions = Readonly<{
  /** API root, e.g. "https://api.example.com/v1". */
  baseUrl: string;
  /** Sent as "Authorization: Bearer <token>" when it returns a value. */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Give up after this long. Default 10 seconds. */
  timeoutMs?: number;
  /** Defaults to the global fetch (available in React Native and browsers). */
  fetch?: FetchLike;
}>;

type AbortControllerLike = { signal: unknown; abort(): void };

export function createHttpBackend(opts: HttpBackendOptions): ClimbingBackend {
  const globals = globalThis as {
    fetch?: FetchLike;
    AbortController?: new () => AbortControllerLike;
  };
  const doFetch = opts.fetch ?? globals.fetch;
  const base = opts.baseUrl.replace(/\/+$/, '');

  async function call(route: Route, body?: unknown): Promise<unknown> {
    if (!doFetch) {
      throw new BackendError('fetch is not available on this platform', 0);
    }
    const token = await opts.getAuthToken?.();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = globals.AbortController
      ? new globals.AbortController()
      : null;
    const timer = setTimeout(() => controller?.abort(), opts.timeoutMs ?? 10_000);
    const what = `${route.method} ${route.path}`;
    let response;
    try {
      response = await doFetch(base + route.path, {
        method: route.method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller?.signal,
      });
    } catch {
      throw new BackendError(`Could not reach the server (${what})`, 0);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new BackendError(`${what} failed with ${response.status}`, response.status);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    kind: 'remote',
    load: async () => fromProfileDto(await call(endpoints.loadProfile())),
    addClimb: async log => {
      await call(endpoints.addClimb(), toClimbDto(log));
    },
    removeClimb: async id => {
      await call(endpoints.removeClimb(id));
    },
    completeQuest: async questId => {
      await call(endpoints.completeQuest(questId));
    },
    skipQuest: async questId => {
      await call(endpoints.skipQuest(questId));
    },
    setHandFlag: async (flag, flagged) => {
      await call(
        endpoints.setHandFlag(flag.side, flag.finger, flagged),
        flagged ? toHandFlagDto(flag) : undefined,
      );
    },
    saveReach: async reach => {
      await call(endpoints.saveReach(), toReachDto(reach));
    },
  };
}
