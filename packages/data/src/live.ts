/**
 * Live analysis over the server's WebSocket (/v1/pose/stream). Frames are
 * sampled from the camera and sent one at a time: the next frame is only
 * taken after the server answered the last one, so a slow server or
 * network never builds up a queue (backpressure). About two frames a
 * second when the server keeps up.
 *
 * Protocol (backend/README.md):
 *   client: {"type":"start","token":"...","upload_consent":true}
 *   server: {"type":"ready","max_frame_bytes":...,"max_duration_ms":...}
 *   client: {"type":"frame","timestamp_ms":n}, then the JPEG bytes
 *   server: {"type":"result","timestamp_ms":n, ...pose result}
 *   client: {"type":"stop"}
 * The token travels in the first message, never in the URL.
 */
import type { CameraSession } from '@hackyeah/platform';
import type { PoseResultDto } from './wire';

/** The part of a WebSocket this uses. Tests pass a fake. */
export type LiveSocket = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send(data: string | ArrayBuffer): void;
  close(): void;
};

export type LiveHandlers = Readonly<{
  /** One analysed frame, valid or not. */
  onResult: (result: PoseResultDto) => void;
  /** The session failed; it is closed already. */
  onError: (message: string) => void;
  /** Called once when the session ends, for any reason. */
  onStopped?: () => void;
}>;

export type LiveOptions = LiveHandlers &
  Readonly<{
    url: string;
    token: string;
    consent: boolean;
    camera: CameraSession;
    socketFactory: (url: string) => LiveSocket;
    now?: () => number;
    /** Runs a callback later; answers a cancel function. */
    schedule?: (callback: () => void, delay: number) => () => void;
  }>;

export type LiveSession = Readonly<{ stop: () => void }>;

/** How long to wait for any answer before giving up. */
export const LIVE_TIMEOUT_MS = 10_000;
/** Pause between an answer and the next frame. */
export const LIVE_FRAME_GAP_MS = 500;

export function openLivePose(options: LiveOptions): LiveSession {
  if (!options.consent) {
    throw new Error('Tick the consent box before sending frames.');
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
  let cancelNext = () => {};
  let cancelDeadline = () => {};

  const stop = () => {
    if (closed) {
      return;
    }
    closed = true;
    cancelNext();
    cancelDeadline();
    if (opened) {
      try {
        socket.send(JSON.stringify({ type: 'stop' }));
      } catch {
        // Already closing; nothing to tell the server.
      }
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
    cancelDeadline = schedule(
      () => fail('Live analysis timed out. Check the server and try again.'),
      LIVE_TIMEOUT_MS,
    );
  };
  armDeadline();

  const sendFrame = async () => {
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
          throw new Error('This device cannot send live frames.');
        }
        bytes = new Uint8Array(await blob.arrayBuffer());
      }
      if (!bytes || bytes.byteLength > maxBytes) {
        throw new Error('A live frame is bigger than the server allows.');
      }
      if (closed) {
        return;
      }
      // Strictly increasing, as the server requires.
      lastTimestamp = Math.max(lastTimestamp + 1, Math.trunc(now() - started));
      if (lastTimestamp >= maxDuration) {
        stop(); // the server's session limit; start again for more
        return;
      }
      socket.send(
        JSON.stringify({ type: 'frame', timestamp_ms: lastTimestamp }),
      );
      socket.send(new Uint8Array(bytes).buffer as ArrayBuffer);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Live capture failed.');
    } finally {
      // The frame was only needed for sending; drop it straight away.
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
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      fail('The server sent something unexpected.');
      return;
    }
    if (message?.type === 'error') {
      fail(
        typeof message.detail === 'string'
          ? message.detail
          : 'Live analysis failed.',
      );
      return;
    }
    if (message?.type === 'ready' && !ready) {
      ready = true;
      started = now();
      maxBytes = message.max_frame_bytes ?? maxBytes;
      maxDuration = message.max_duration_ms ?? maxDuration;
      sendFrame();
      return;
    }
    if (
      message?.type === 'result' &&
      waiting &&
      message.timestamp_ms === lastTimestamp
    ) {
      cancelDeadline();
      waiting = false;
      const result = { ...message };
      delete result.type;
      delete result.timestamp_ms;
      options.onResult(result as PoseResultDto);
      cancelNext = schedule(() => {
        sendFrame();
      }, LIVE_FRAME_GAP_MS);
      return;
    }
    fail('The server sent something unexpected.');
  };
  socket.onerror = () => fail('Could not connect to live analysis.');
  socket.onclose = () => {
    if (!closed) {
      fail('The live analysis connection closed.');
    }
  };
  return { stop };
}
