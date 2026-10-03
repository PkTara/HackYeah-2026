/**
 * Test double: an in-memory stand-in for the Climbing Monkey API routes the
 * HTTP backend calls (see backend/README.md). It answers with the server's
 * JSON shapes and status codes but has none of its rules: the quests it
 * assigns come from a list the test sets up, and a test says when a quest
 * no longer fits. Only used by the tests; nothing in the app imports it.
 */
import type { FetchLike } from '../http';

type Row = Record<string, unknown> & { id: string; occurred_at?: string };
type Quest = Row & { status: string; kind: string };

type Climber = {
  id: string;
  name: string;
  goal: string;
  climbs: Row[];
  hands: Row[];
  assessments: Row[];
  quests: Quest[];
};

export type FakeCall = Readonly<{
  method: string;
  path: string;
  body?: Record<string, unknown>;
  /** The bearer token sent, or null. */
  token: string | null;
}>;

/** What a test sets up for the next quest the fake assigns. */
export type QuestTemplate = Readonly<{
  kind: string;
  title?: string;
  instructions?: string;
  reason?: string;
  estimated_minutes?: number;
}>;

const ASSESSMENT_QUEST: QuestTemplate = {
  kind: 'record_assessment',
  title: 'Understand your starting point',
  instructions: 'Enter an existing measurement.',
  reason: 'Record a comfortable assessment.',
  estimated_minutes: 2,
};

/** Oldest first, like the server; equal times keep the order they came in. */
const byTime = (rows: Row[]) =>
  [...rows].sort(
    (a, b) => Date.parse(a.occurred_at ?? '') - Date.parse(b.occurred_at ?? ''),
  );

export function createFakeApi(
  opts: Readonly<{
    /** Milliseconds before answering, per request. Default none. */
    delay?: (method: string, path: string) => number;
  }> = {},
) {
  const byToken = new Map<string, Climber>();
  const calls: FakeCall[] = [];
  /** Quests to assign next, in order; then the assessment quest. */
  const nextQuests: QuestTemplate[] = [];
  let count = 0;
  let offline = false;
  const newId = (kind: string) => `${kind}-${++count}`;

  function assign(climber: Climber): Quest {
    const current = climber.quests.find(q => q.status === 'assigned');
    if (current) {
      return current;
    }
    const template = nextQuests.shift() ?? ASSESSMENT_QUEST;
    const quest: Quest = {
      id: newId('quest'),
      status: 'assigned',
      title: 'Quest',
      instructions: 'Do the thing.',
      reason: 'Because.',
      estimated_minutes: 2,
      evidence_ids: [],
      ...template,
    };
    climber.quests.push(quest);
    return quest;
  }

  type Answer = [status: number, body?: unknown];

  function route(
    method: string,
    path: string,
    body: Record<string, unknown> | undefined,
    climber: Climber | undefined,
  ): Answer {
    if (method === 'POST' && path === '/v1/climbers') {
      const token = newId('token');
      const created: Climber = {
        id: newId('climber'),
        name: String(body?.name),
        goal: String(body?.goal ?? 'general'),
        climbs: [],
        hands: [],
        assessments: [],
        quests: [],
      };
      byToken.set(token, created);
      const { id, name, goal } = created;
      return [201, { id, name, goal, pet_visible: true, token }];
    }
    if (!climber) {
      return [401, { detail: 'Invalid or missing bearer token' }];
    }
    if (method === 'PATCH' && path === '/v1/me') {
      Object.assign(climber, body);
      const { id, name, goal } = climber;
      return [200, { id, name, goal, pet_visible: true }];
    }

    const records = path.match(/^\/v1\/me\/(climbs|hands|assessments)$/);
    if (records) {
      const kind = records[1] as 'climbs' | 'hands' | 'assessments';
      if (method === 'GET') {
        return [200, byTime(climber[kind])];
      }
      const saved = {
        id: newId(kind),
        occurred_at: new Date().toISOString(),
        ...body,
      };
      climber[kind].push(saved);
      return [201, saved];
    }
    const climb = path.match(/^\/v1\/me\/climbs\/([^/]+)$/);
    if (method === 'DELETE' && climb) {
      const before = climber.climbs.length;
      climber.climbs = climber.climbs.filter(c => c.id !== climb[1]);
      return climber.climbs.length < before ? [204] : [404];
    }

    if (path === '/v1/me/quests') {
      return method === 'GET'
        ? [200, climber.quests.map(q => ({ ...q }))]
        : [201, { ...assign(climber) }];
    }
    const action = path.match(/^\/v1\/me\/quests\/([^/]+)\/(complete|skip)$/);
    if (method === 'POST' && action) {
      const [, questId, verb] = action;
      const quest = climber.quests.find(q => q.id === questId);
      if (!quest) {
        return [404, { detail: 'Quest not found' }];
      }
      if (verb === 'skip') {
        if (quest.status === 'completed') {
          return [409, { detail: 'Completed quests cannot be skipped' }];
        }
        quest.status = 'skipped';
        return [200, { ...quest }];
      }
      if (quest.status !== 'completed') {
        if (quest.status !== 'assigned') {
          return [409, { detail: 'Quest is no longer eligible' }];
        }
        quest.status = 'completed';
      }
      const xp =
        10 * climber.quests.filter(q => q.status === 'completed').length;
      return [200, { quest: { ...quest }, pet: { xp } }];
    }
    return [404, { detail: 'Not Found' }];
  }

  const fetch: FetchLike = async (url, init) => {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    const auth = init.headers.Authorization ?? '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : null;
    calls.push({ method: init.method, path, body, token });
    const wait = opts.delay?.(init.method, path) ?? 0;
    if (wait > 0) {
      await new Promise<void>(resolve => setTimeout(() => resolve(), wait));
    }
    if (offline) {
      throw new Error('network down');
    }
    const [status, answer] = route(
      init.method,
      path,
      body,
      token ? byToken.get(token) : undefined,
    );
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (answer === undefined ? '' : JSON.stringify(answer)),
    };
  };

  /** The climber a token belongs to. */
  function climberOf(token: string): Climber {
    const climber = byToken.get(token);
    if (!climber) {
      throw new Error('No climber has that token');
    }
    return climber;
  }

  return {
    fetch,
    /** Every request so far, oldest first. */
    calls,
    climberOf,
    /** The only climber; most tests have one. */
    only(): Climber {
      const [climber, ...others] = [...byToken.values()];
      if (!climber || others.length > 0) {
        throw new Error(`Expected one climber, found ${byToken.size}`);
      }
      return climber;
    },
    /** Quests to assign next, in order. */
    queueQuests: (...templates: QuestTemplate[]) =>
      nextQuests.push(...templates),
    /**
     * What the server does to a quest that no longer fits what was logged:
     * it is paused, completing it answers 409 and the next one is new.
     */
    markStale(questId: string) {
      const quest = [...byToken.values()]
        .flatMap(c => c.quests)
        .find(q => q.id === questId);
      if (quest) {
        quest.status = 'paused';
      }
    },
    /** Forget every climber, like a server whose database was reset. */
    reset: () => byToken.clear(),
    setOffline: (value: boolean) => {
      offline = value;
    },
  };
}

export type FakeApi = ReturnType<typeof createFakeApi>;
