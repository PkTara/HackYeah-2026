/**
 * Camera media for the Climbing Monkey API: pose analysis of a photo or a
 * clip, live frames (live.ts), and private hand photos for the journal.
 *
 * Screens do not call this directly. The app hands one MediaClient to the
 * camera screens through context (packages/app/src/media.tsx), the same way
 * it hands the ClimbingBackend to useGame().
 *
 * Identity: the same anonymous climber as the HTTP backend. The token is
 * read from the platform store (API_TOKEN_KEY) on every request, so it
 * follows whatever the backend saved, also after a profile reset. This
 * client never makes a climber: the backend does that when the app loads,
 * before any screen shows.
 *
 * Nothing is sent without consent: every call takes the climber's answer
 * and refuses before touching the network when it is false.
 */
import type {
  CameraSession,
  KeyValueStore,
  MediaCapture,
} from '@hackyeah/platform';
import { API_TOKEN_KEY } from './device';
import { endpoints, type Route } from './endpoints';
import {
  openLivePose,
  type LiveHandlers,
  type LiveSession,
  type LiveSocket,
} from './live';
import {
  toCameraAssessmentBody,
  toHandPhotoReportBody,
  toPoseReading,
  type HandPhotoEntry,
  type PoseReading,
  type PoseResultDto,
  type VideoResultDto,
} from './wire';

/** The part of fetch this uses. Bodies can be FormData, so not only text. */
export type MediaFetch = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: unknown;
    signal?: unknown;
  },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export type MediaClientOptions = Readonly<{
  /** Server root, e.g. "http://127.0.0.1:8000". */
  baseUrl: string;
  /** Platform store that holds the backend's API token. */
  storage: KeyValueStore;
  /** Defaults to the global fetch. */
  fetch?: MediaFetch;
  /** Defaults to the global WebSocket. */
  socketFactory?: (url: string) => LiveSocket;
  /** Give up on an upload after this long. Default 2 minutes (clips). */
  timeoutMs?: number;
  now?: () => Date;
}>;

export interface MediaClient {
  /** Where media goes, shown to the climber before anything is sent. */
  readonly server: string;
  /** Leg spread from a reviewed photo or clip. The server keeps nothing. */
  analyze(capture: MediaCapture, consent: boolean): Promise<PoseReading>;
  /** Saves a valid result the climber reviewed, as their own report. */
  saveAssessment(result: PoseResultDto, confirmed: boolean): Promise<void>;
  /** Keeps the photo privately on the server and adds the journal entry. */
  saveHandPhoto(
    capture: MediaCapture,
    entry: HandPhotoEntry,
    consent: boolean,
  ): Promise<void>;
  /** Sends sampled frames from the camera until stopped. */
  startLive(
    camera: CameraSession,
    consent: boolean,
    handlers: LiveHandlers,
  ): Promise<LiveSession>;
}

/** A failed media call, with a message meant for the climber. */
export class MediaError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when there was no answer. */
    readonly status: number,
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

export const NO_POSE_MODEL =
  'The server cannot analyse poses yet: it has no pose model. Set POSE_MODEL_PATH where the server runs (see docs/camera-video.md).';
const NO_PROFILE =
  'Your profile is not on the server yet. Reload the app and try again.';
const UNKNOWN_DEVICE =
  'The server no longer knows this device. Reload the app to make a new profile.';

type AbortControllerLike = { signal: unknown; abort(): void };
type FormLike = {
  append(name: string, value: unknown, filename?: string): void;
};

/** Multipart form for one capture: a Blob on the web, a file uri natively. */
function mediaForm(capture: MediaCapture): FormLike {
  const FormDataCtor = (globalThis as { FormData?: new () => FormLike })
    .FormData;
  if (!FormDataCtor) {
    throw new MediaError('This device cannot upload files.', 0);
  }
  const form = new FormDataCtor();
  if (capture.blob) {
    form.append('file', capture.blob, capture.filename);
  } else {
    // React Native's FormData reads the file from its uri.
    form.append('file', {
      uri: capture.uri,
      type: capture.mimeType,
      name: capture.filename,
    });
  }
  form.append('upload_consent', 'true');
  return form;
}

function detailOf(text: string): string | null {
  try {
    const detail = JSON.parse(text)?.detail;
    return typeof detail === 'string' ? detail : null;
  } catch {
    return null;
  }
}

export function createMediaClient(opts: MediaClientOptions): MediaClient {
  const base = opts.baseUrl.trim().replace(/\/+$/, '');
  const globals = globalThis as {
    fetch?: MediaFetch;
    WebSocket?: new (url: string) => LiveSocket;
    AbortController?: new () => AbortControllerLike;
  };
  const doFetch = opts.fetch ?? globals.fetch;
  const now = opts.now ?? (() => new Date());
  const socketFactory =
    opts.socketFactory ??
    ((url: string) => {
      if (!globals.WebSocket) {
        throw new MediaError('This device cannot open a live connection.', 0);
      }
      return new globals.WebSocket(url);
    });

  async function savedToken(): Promise<string> {
    const token = await opts.storage.getItem(API_TOKEN_KEY);
    if (!token) {
      throw new MediaError(NO_PROFILE, 401);
    }
    return token;
  }

  async function send(
    route: Route,
    token: string,
    body: (() => FormLike) | object | undefined,
  ) {
    if (!doFetch) {
      throw new MediaError('fetch is not available on this platform.', 0);
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
    let payload: unknown;
    if (typeof body === 'function') {
      payload = (body as () => FormLike)(); // fetch sets the multipart header
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const controller = globals.AbortController
      ? new globals.AbortController()
      : null;
    const timer = setTimeout(
      () => controller?.abort(),
      opts.timeoutMs ?? 120_000,
    );
    try {
      return await doFetch(base + route.path, {
        method: route.method,
        headers,
        body: payload,
        signal: controller?.signal,
      });
    } catch {
      throw new MediaError(`Could not reach the server at ${base}.`, 0);
    } finally {
      clearTimeout(timer);
    }
  }

  /** One request as this device's climber, JSON back. */
  async function api(
    route: Route,
    body?: (() => FormLike) | object,
  ): Promise<unknown> {
    const token = await savedToken();
    let response = await send(route, token, body);
    if (response.status === 401) {
      // The backend may have made a new climber since (after a server or
      // profile reset). Try once more with what the store holds now.
      const latest = await opts.storage.getItem(API_TOKEN_KEY);
      if (!latest || latest === token) {
        throw new MediaError(UNKNOWN_DEVICE, 401);
      }
      response = await send(route, latest, body);
      if (response.status === 401) {
        throw new MediaError(UNKNOWN_DEVICE, 401);
      }
    }
    const text = await response.text();
    if (!response.ok) {
      if (response.status === 503) {
        throw new MediaError(NO_POSE_MODEL, 503);
      }
      throw new MediaError(
        detailOf(text) ?? `The server answered ${response.status}. Try again.`,
        response.status,
      );
    }
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new MediaError(
        'The server sent something unexpected.',
        response.status,
      );
    }
  }

  return {
    server: base,

    async analyze(capture, consent) {
      if (!consent) {
        throw new MediaError('Tick the consent box before sending.', 0);
      }
      const route =
        capture.kind === 'video'
          ? endpoints.analyzeVideo()
          : endpoints.analyzeImage();
      const answer = await api(route, () => mediaForm(capture));
      return toPoseReading(answer as PoseResultDto | VideoResultDto);
    },

    async saveAssessment(result, confirmed) {
      const body = toCameraAssessmentBody(result, now());
      if (!confirmed || !body) {
        throw new MediaError('Review and confirm a valid result first.', 0);
      }
      await api(endpoints.addAssessment(), body);
    },

    async saveHandPhoto(capture, entry, consent) {
      if (!consent) {
        throw new MediaError('Tick the consent box before saving.', 0);
      }
      if (capture.kind !== 'image') {
        throw new MediaError('The hand journal needs a photo.', 0);
      }
      const photo = (await api(endpoints.addPhoto(), () => {
        const form = mediaForm(capture);
        form.append('retain_consent', 'true');
        form.append('side', entry.side);
        form.append('view', entry.view);
        return form;
      })) as { id?: unknown } | null;
      if (typeof photo?.id !== 'string') {
        throw new MediaError('The server kept the photo without an id.', 200);
      }
      try {
        await api(
          endpoints.addHandReport(),
          toHandPhotoReportBody(entry, photo.id, now()),
        );
      } catch (error) {
        // Without its entry the photo means nothing: take it back off the
        // server, keeping the original error if that fails too.
        await api(endpoints.removePhoto(photo.id)).catch(() => {});
        throw error;
      }
    },

    async startLive(camera, consent, handlers) {
      if (!consent) {
        throw new MediaError('Tick the consent box before sending frames.', 0);
      }
      const token = await savedToken();
      return openLivePose({
        ...handlers,
        url: base.replace(/^http/, 'ws') + endpoints.liveStream().path,
        token,
        consent,
        camera,
        socketFactory,
      });
    },
  };
}
