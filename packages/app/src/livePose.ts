import type { CameraSession } from '@hackyeah/platform';
import type { PoseResult } from './api';

export type LiveSocket = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send(data: string | ArrayBuffer): void;
  close(): void;
};
export type LiveOptions = {
  url: string;
  token: string;
  consent: boolean;
  camera: CameraSession;
  socketFactory: (url: string) => LiveSocket;
  onResult: (result: PoseResult) => void;
  onError: (message: string) => void;
  onStopped?: () => void;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => () => void;
};
export function openLivePose(options: LiveOptions) {
  if (!options.consent) {
    throw new Error('Upload consent is required');
  }
  const socket = options.socketFactory(options.url);
  const now = options.now ?? Date.now;
  const schedule =
    options.schedule ??
    ((callback, delay) => {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    });
  let closed = false;
  let opened = false;
  let ready = false;
  let waiting = false;
  let started = 0;
  let lastTimestamp = -1;
  let maxBytes = 8 * 1024 * 1024;
  let maxDuration = 60_000;
  let cancelTimer = () => {};
  let cancelDeadline = () => {};
  const stop = () => {
    if (closed) {
      return;
    }
    closed = true;
    cancelTimer();
    cancelDeadline();
    if (opened) {
      try {
        socket.send(JSON.stringify({ type: 'stop' }));
      } catch {}
    }
    socket.close();
    options.onStopped?.();
  };
  const fail = (message: string) => {
    if (!closed) {
      try {
        options.onError(message);
      } finally {
        stop();
      }
    }
  };
  const armDeadline = () => {
    cancelDeadline();
    cancelDeadline = schedule(() => fail('Live analysis timed out'), 10_000);
  };
  armDeadline();
  const capture = async () => {
    if (closed || waiting) {
      return;
    }
    waiting = true;
    armDeadline();
    let frame;
    try {
      frame = await options.camera.snapshot();
      if (closed) {
        return;
      }
      let bytes = frame.bytes;
      if (!bytes && frame.blob) {
        const blob = frame.blob as unknown as {
          arrayBuffer?: () => Promise<ArrayBuffer>;
        };
        if (!blob.arrayBuffer) {
          throw new Error('Live frame transfer is unavailable');
        }
        bytes = new Uint8Array(await blob.arrayBuffer());
      }
      if (!bytes || bytes.byteLength > maxBytes) {
        throw new Error('Live frame exceeds the server limit');
      }
      if (closed) {
        return;
      }
      lastTimestamp = Math.max(lastTimestamp + 1, Math.trunc(now() - started));
      if (lastTimestamp >= maxDuration) {
        stop();
        return;
      }
      socket.send(
        JSON.stringify({ type: 'frame', timestamp_ms: lastTimestamp }),
      );
      socket.send(new Uint8Array(bytes).buffer as ArrayBuffer);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Live capture failed');
    } finally {
      frame?.release?.();
    }
  };
  socket.onopen = () => {
    if (closed) {
      return;
    }
    opened = true;
    armDeadline();
    socket.send(
      JSON.stringify({
        type: 'start',
        token: options.token,
        upload_consent: true,
      }),
    );
  };
  socket.onmessage = event => {
    if (closed) {
      return;
    }
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'error') {
        fail(message.detail ?? 'Live analysis failed');
        return;
      }
      if (message.type === 'ready' && !ready) {
        ready = true;
        started = now();
        maxBytes = message.max_frame_bytes;
        maxDuration = message.max_duration_ms;
        capture();
        return;
      }
      if (
        message.type === 'result' &&
        waiting &&
        message.timestamp_ms === lastTimestamp
      ) {
        cancelDeadline();
        waiting = false;
        options.onResult(message);
        cancelTimer = schedule(() => {
          capture();
        }, 500);
        return;
      }
      fail('Unexpected live analysis response');
    } catch {
      fail('Invalid live analysis response');
    }
  };
  socket.onerror = () => fail('Could not connect to live analysis');
  socket.onclose = () => {
    if (!closed) {
      fail('Live analysis connection closed');
    }
  };
  return { stop };
}
