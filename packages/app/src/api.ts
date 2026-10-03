import type { KeyValueStore } from '@hackyeah/platform';
import type { MediaCapture } from '@hackyeah/platform';

declare const __CLIMBING_MONKEY_API_URL__: string | undefined;
export const defaultApiUrl =
  typeof __CLIMBING_MONKEY_API_URL__ === 'string'
    ? __CLIMBING_MONKEY_API_URL__
    : 'http://127.0.0.1:8000';

export type PoseResult = {
  status: 'ok' | 'invalid_capture';
  value: number | null;
  metric: string;
  unit: string;
  confidence: number;
  reason: string | null;
  protocol: string;
  method: 'camera';
};
export type VideoResult = {
  frames: (PoseResult & { timestamp_ms: number })[];
  duration_ms: number;
  sampled_frame_count: number;
  valid_frame_count: number;
};
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export function createClimbingApi(
  storage: KeyValueStore,
  options: { baseUrl?: string; fetcher?: Fetcher } = {},
) {
  const baseUrl = (options.baseUrl ?? defaultApiUrl).replace(/\/$/, '');
  const fetcher = options.fetcher ?? fetch;
  const key = `climbing-monkey.token:${baseUrl}`;
  let pendingToken: Promise<string> | null = null;
  const token = async (): Promise<string> => {
    const saved = await storage.getItem(key);
    if (saved) {
      return saved;
    }
    if (!pendingToken) {
      pendingToken = (async () => {
        const response = await fetcher(`${baseUrl}/v1/climbers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Climbing Monkey', goal: 'technique' }),
        });
        if (!response.ok) {
          throw new Error('Could not connect to your climbing profile.');
        }
        const result = await response.json();
        if (typeof result.token !== 'string' || !result.token) {
          throw new Error('The server did not return profile credentials.');
        }
        await storage.setItem(key, result.token);
        return result.token;
      })();
    }
    try {
      return await pendingToken;
    } finally {
      pendingToken = null;
    }
  };
  const request = async (
    path: string,
    body?: object,
    form?: FormData,
    method = 'POST',
  ) => {
    const credential = await token();
    const response = await fetcher(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${credential}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
    if (response.status === 204) {
      return null;
    }
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        typeof result.detail === 'string'
          ? result.detail
          : 'The capture could not be processed. Check the input and try again.',
      );
    }
    return result;
  };
  const mediaForm = (capture: MediaCapture) => {
    const form = new FormData();
    if (capture.blob) {
      (form.append as (name: string, blob: Blob, filename: string) => void)(
        'file',
        capture.blob,
        capture.filename,
      );
    } else {
      form.append('file', {
        uri: capture.uri,
        type: capture.mimeType,
        name: capture.filename,
      });
    }
    form.append('upload_consent', 'true');
    return form;
  };
  return {
    token,
    async saveHand(
      capture: MediaCapture,
      fields: {
        side: 'left' | 'right';
        view: 'palm' | 'back';
        region: string;
        pain: number;
        note: string;
      },
      consent: boolean,
    ): Promise<{ id: string }> {
      if (!consent) {
        throw new Error('Upload and retention consent are required');
      }
      if (capture.kind !== 'image') {
        throw new Error('Hand journal needs a snapshot');
      }
      const form = mediaForm(capture);
      form.append('retain_consent', 'true');
      form.append('side', fields.side);
      form.append('view', fields.view);
      const photo = await request('/v1/me/photos', undefined, form);
      const { side, region, pain, note } = fields;
      const observation = { side, region, pain, note };
      try {
        return await request('/v1/me/hands', {
          ...observation,
          photo_id: photo.id,
        });
      } catch (error) {
        try {
          await request(
            `/v1/me/photos/${photo.id}`,
            undefined,
            undefined,
            'DELETE',
          );
        } catch {
          /* Preserve the original error if cleanup is unavailable. */
        }
        throw error;
      }
    },
    async saveAssessment(
      result: PoseResult,
      confirmed: boolean,
    ): Promise<{ id: string }> {
      if (!confirmed || result.status !== 'ok' || result.value === null) {
        throw new Error('Confirm a valid measurement before saving');
      }
      const { metric, value, unit, confidence, method, protocol } = result;
      return request('/v1/me/assessments', {
        metric,
        value,
        unit,
        confidence,
        method,
        protocol,
      });
    },
    socketUrl: `${baseUrl.replace(/^http/, 'ws')}/v1/pose/stream`,
    async analyze(
      capture: MediaCapture,
      consent: boolean,
    ): Promise<PoseResult | VideoResult> {
      if (!consent) {
        throw new Error('Upload consent is required');
      }
      return request(
        `/v1/pose/${capture.kind === 'video' ? 'video' : 'image'}`,
        undefined,
        mediaForm(capture),
      );
    },
  };
}
