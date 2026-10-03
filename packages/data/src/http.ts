/**
 * Backend that talks to the Climbing Monkey API (the FastAPI service in
 * backend/). Routes are in endpoints.ts, JSON shapes and their mapping in
 * wire.ts, and what stays on the device in device.ts. This file makes the
 * requests: identity, the order of writes, and the answers that are not
 * errors for the climber (404 on a delete, 401 or 404 on a profile reset,
 * 409 on a quest).
 */
import { emptyGame, mergeBaseline, type GameState } from '@hackyeah/core';
import type { KeyValueStore } from '@hackyeah/platform';
import { BackendError, type ClimbingBackend } from './backend';
import { API_TOKEN_KEY, createDeviceStore } from './device';
import { endpoints, type Route } from './endpoints';
import {
  SERVER_GOAL,
  baselineAssessment,
  onboardingAssessments,
  reachAssessments,
  toClimbBody,
  toGameState,
  toHandReportBody,
  type AssessmentBody,
  type NewClimberBody,
  type NewClimberDto,
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
  /** Server root, e.g. "http://127.0.0.1:8000". Routes start with /v1. */
  baseUrl: string;
  /** Platform store for the API token and the device-only data. */
  storage: KeyValueStore;
  /** Give up on a request after this long. Default 10 seconds. */
  timeoutMs?: number;
  /** Defaults to the global fetch (available in React Native and browsers). */
  fetch?: FetchLike;
  /** Clock for the timestamps sent. Tests pass a fixed one. */
  now?: () => Date;
}>;

type AbortControllerLike = { signal: unknown; abort(): void };

const hasStatus = (error: unknown, status: number) =>
  error instanceof BackendError && error.status === status;

/** One request: JSON in and out, any failure as a BackendError. */
function createRequester(opts: HttpBackendOptions) {
  const globals = globalThis as {
    fetch?: FetchLike;
    AbortController?: new () => AbortControllerLike;
  };
  const doFetch = opts.fetch ?? globals.fetch;
  const base = opts.baseUrl.replace(/\/+$/, '');

  return async function request(
    route: Route,
    body: unknown,
    bearer: string | null,
  ): Promise<unknown> {
    if (!doFetch) {
      throw new BackendError('fetch is not available on this platform', 0);
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const controller = globals.AbortController
      ? new globals.AbortController()
      : null;
    const timer = setTimeout(
      () => controller?.abort(),
      opts.timeoutMs ?? 10_000,
    );
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
      throw new BackendError(
        `${what} failed with ${response.status}`,
        response.status,
      );
    }
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      throw new BackendError(
        `${what} answered with something other than JSON`,
        response.status,
      );
    }
  };
}

export function createHttpBackend(opts: HttpBackendOptions): ClimbingBackend {
  const request = createRequester(opts);
  const device = createDeviceStore(opts.storage);
  const now = opts.now ?? (() => new Date());

  // Identity. The device has one anonymous server profile, made on first
  // use. Everyone shares one token promise, so requests made together
  // create one climber between them, not one each.
  let token: Promise<string> | null = null;

  function share(next: Promise<string>): Promise<string> {
    token = next;
    // If it fails (no signal), the next request tries again.
    next.catch(() => {
      if (token === next) {
        token = null;
      }
    });
    return next;
  }

  async function savedOrNewToken(): Promise<string> {
    return (await opts.storage.getItem(API_TOKEN_KEY)) || newClimber();
  }

  async function newClimber(): Promise<string> {
    // Normally the goal comes later, from setup. After a server reset the
    // device may already know it.
    const { onboarding } = await device.read();
    const body: NewClimberBody = {
      name: 'Climber',
      goal: onboarding ? SERVER_GOAL[onboarding.details.goal] : 'general',
    };
    const answer = (await request(
      endpoints.createClimber(),
      body,
      null,
    )) as Partial<NewClimberDto> | null;
    if (typeof answer?.token !== 'string' || !answer.token) {
      throw new BackendError('The server made a climber without a token', 200);
    }
    await opts.storage.setItem(API_TOKEN_KEY, answer.token);
    return answer.token;
  }

  /** A request as this device's climber. */
  async function api(route: Route, body?: unknown): Promise<unknown> {
    const used = token ?? share(savedOrNewToken());
    try {
      return await request(route, body, await used);
    } catch (error) {
      if (!hasStatus(error, 401)) {
        throw error;
      }
      // The server no longer knows the token, for example after its data was
      // reset. Forget it, make one new climber for everyone who got the same
      // answer, and try this request once more.
      const fresh =
        token && token !== used
          ? token
          : share(opts.storage.removeItem(API_TOKEN_KEY).then(newClimber));
      return request(route, body, await fresh);
    }
  }

  // Writes go out one at a time, in the order they were made, so a quick
  // add then delete reaches the server in that order. load() waits for the
  // writes already made, so it never answers with a state from before them.
  let writes: Promise<unknown> = Promise.resolve();
  function inOrder<T>(task: () => Promise<T>): Promise<T> {
    const run = writes.then(task);
    writes = run.catch(() => {});
    return run;
  }

  // The server makes its own climb ids. Climbs logged since the last load
  // still have the app's id, so remember which server id each one got.
  const serverIds = new Map<string, string>();

  async function readState(): Promise<GameState> {
    const [climbs, hands, assessments, quests, assigned, saved] =
      await Promise.all([
        api(endpoints.listClimbs()),
        api(endpoints.listHandReports()),
        api(endpoints.listAssessments()),
        api(endpoints.listQuests()),
        // Answers with the quest already assigned while it still fits.
        api(endpoints.assignQuest()),
        device.read(),
      ]);
    return toGameState({ climbs, hands, assessments, quests, assigned }, saved);
  }

  /**
   * A change for the server: it runs after the changes before it, then the
   * state is read back, so the app sees the server's quest for what was just
   * saved. If only the read back fails, the change is saved anyway and the
   * answer is nothing: the app keeps showing what it has.
   */
  function save(change: () => Promise<void>): Promise<GameState | void> {
    return inOrder(async () => {
      await change();
      return readState().catch(() => undefined);
    });
  }

  /** Completes or skips a quest, then answers with the server's next one. */
  function questAction(route: Route): Promise<GameState | void> {
    return inOrder(async () => {
      try {
        await api(route);
      } catch (error) {
        if (!hasStatus(error, 409)) {
          throw error;
        }
        // 409: the quest no longer fits (it changed on another device since
        // this one loaded) or was already completed. Not an error for the
        // climber, but the app must drop what it showed, so this read back
        // has to work.
        return readState();
      }
      return readState().catch(() => undefined);
    });
  }

  async function postAssessments(bodies: readonly AssessmentBody[]) {
    for (const body of bodies) {
      await api(endpoints.addAssessment(), body);
    }
  }

  /** Deletes this device's climber on the server, if one was made. */
  async function deleteClimber(): Promise<void> {
    const bearer = await (token ?? opts.storage.getItem(API_TOKEN_KEY));
    if (!bearer) {
      return;
    }
    try {
      // Not api(): after a 401 it would make a new climber only to delete it.
      await request(endpoints.deleteMe(), undefined, bearer);
    } catch (error) {
      // 401: the server no longer knows the token. 404: no such climber.
      // Either way the profile is gone already.
      if (!hasStatus(error, 401) && !hasStatus(error, 404)) {
        throw error;
      }
    }
  }

  return {
    kind: 'remote',
    load: () => writes.then(readState),

    addClimb: log =>
      save(async () => {
        if (serverIds.has(log.id)) {
          return; // already saved: a retried call adds nothing
        }
        const saved = (await api(endpoints.addClimb(), toClimbBody(log))) as {
          id?: unknown;
        } | null;
        if (typeof saved?.id !== 'string') {
          throw new BackendError('The server saved a climb without an id', 200);
        }
        serverIds.set(log.id, saved.id);
      }),

    removeClimb: id =>
      save(async () => {
        try {
          await api(endpoints.removeClimb(serverIds.get(id) ?? id));
        } catch (error) {
          // 404: already gone, which is what we wanted.
          if (!hasStatus(error, 404)) {
            throw error;
          }
        }
        serverIds.delete(id);
      }),

    completeQuest: questId => questAction(endpoints.completeQuest(questId)),
    skipQuest: questId => questAction(endpoints.skipQuest(questId)),

    setHandFlag: (flag, flagged) =>
      save(async () => {
        await api(
          endpoints.addHandReport(),
          toHandReportBody(flag, flagged, now()),
        );
      }),

    saveReach: reach =>
      save(() => postAssessments(reachAssessments(reach, now()))),

    finishOnboarding: result =>
      save(async () => {
        // Kept here first: most answers have no place on the server.
        await device.update(old => ({
          ...old,
          onboarding: result,
          onboardingSkipped: false,
          baseline: mergeBaseline(old.baseline, result.baseline),
        }));
        await api(endpoints.updateMe(), {
          goal: SERVER_GOAL[result.details.goal],
        });
        await postAssessments(onboardingAssessments(result, now()));
      }),

    // Stays on the device, so there is nothing new to read back.
    skipOnboarding: () =>
      inOrder(() =>
        device.update(old => ({ ...old, onboardingSkipped: true })),
      ),

    saveBaseline: result => {
      const keep = () =>
        device.update(old => ({
          ...old,
          baseline: mergeBaseline(old.baseline, [result]),
        }));
      const body = baselineAssessment(result, now());
      // Four of the six tests have no metric on the server: device only.
      return body
        ? save(async () => {
            await keep();
            await api(endpoints.addAssessment(), body);
          })
        : inOrder(keep);
    },

    resetProfile: () =>
      inOrder(async () => {
        await deleteClimber();
        // Keep nothing of the old climber: not its token, its climb ids, or
        // the setup answers and home tests on this device.
        token = null;
        serverIds.clear();
        await device.forget();
        // Loading makes a new anonymous climber. If only that fails, the old
        // profile is still gone: answer with an empty one, and the next
        // request makes the climber.
        return readState().catch(() => ({ ...emptyGame, assigned: null }));
      }),
  };
}
