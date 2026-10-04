/**
 * Sharing in the browser: the Web Share sheet where there is one, the
 * clipboard, a file save and a print view. Browser objects come in through
 * an environment, so this runs in tests without a DOM (like webMusic.ts).
 */
import type { ShareCapability, ShareFile, ShareOutcome } from './types';

type ShareData = { title?: string; text?: string; files?: unknown[] };

export type BrowserShareEnv = Readonly<{
  navigator?: {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
    clipboard?: { writeText(text: string): Promise<void> };
  };
  createBlob(text: string, type: string): unknown;
  createFile?(parts: unknown[], name: string, type: string): unknown;
  createUrl(blob: unknown): string;
  revokeUrl(url: string): void;
  /** Clicks a temporary link with a download name. */
  clickDownload(url: string, name: string): void;
  /** Prints a standalone page from a hidden frame. */
  printHtml(html: string): Promise<void>;
  /** One-off timer. */
  later(run: () => void, ms: number): void;
}>;

/** A save hook some hosts offer in place of link downloads. */
export type HostDownloads = {
  save(file: { filename: string; data: string }): Promise<unknown>;
};

type HostGlobals = {
  claude?: { use?: (name: string) => unknown };
};

/**
 * Some embedding hosts block anchor downloads and expose a save hook instead.
 * Returns that hook, or null where the page has none.
 */
export async function hostDownloads(): Promise<HostDownloads | null> {
  try {
    const host = (globalThis as HostGlobals).claude;
    const downloads =
      host && typeof host.use === 'function'
        ? await host.use('downloads')
        : null;
    return downloads &&
      typeof (downloads as Partial<HostDownloads>).save === 'function'
      ? (downloads as HostDownloads)
      : null;
  } catch {
    return null;
  }
}

const errorName = (error: unknown) =>
  (error as { name?: unknown } | null)?.name;
const errorCode = (error: unknown) =>
  (error as { code?: unknown } | null)?.code;

export function createWebShare(env: BrowserShareEnv): ShareCapability {
  const nav = env.navigator;
  const typed = (file: ShareFile) => `${file.mimeType};charset=utf-8`;

  const blobDownload = (file: ShareFile): ShareOutcome => {
    try {
      const url = env.createUrl(env.createBlob(file.text, typed(file)));
      env.clickDownload(url, file.name);
      // Give the browser a moment to start the save before letting go.
      env.later(() => env.revokeUrl(url), 1000);
      return 'saved';
    } catch {
      return 'failed';
    }
  };

  return {
    async share({ title, text, file }) {
      if (!nav?.share) {
        return 'unavailable';
      }
      const files =
        file && env.createFile
          ? [env.createFile([file.text], file.name, typed(file))]
          : undefined;
      let data: ShareData = { title, text };
      try {
        if (files && nav.canShare?.({ files })) {
          data = { title, text, files };
        }
      } catch {
        // canShare can throw on odd input; share the text alone.
      }
      try {
        await nav.share(data);
        return 'shared';
      } catch (error) {
        return errorName(error) === 'AbortError' ? 'dismissed' : 'failed';
      }
    },
    canCopy: !!nav?.clipboard,
    async copy(text) {
      try {
        if (!nav?.clipboard) {
          return false;
        }
        await nav.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    },
    async download(file) {
      const saver = await hostDownloads();
      if (saver) {
        try {
          await saver.save({ filename: file.name, data: file.text });
          return 'saved';
        } catch (error) {
          if (errorCode(error) === 'declined') {
            return 'dismissed';
          }
          // Anything else: fall back to a normal download below.
        }
      }
      return blobDownload(file);
    },
    async print(html) {
      try {
        await env.printHtml(html);
        return true;
      } catch {
        return false;
      }
    },
  };
}

// Typed locally so shared code doesn't need the DOM lib in its tsconfig.
type WindowLike = {
  print(): void;
  focus(): void;
  addEventListener(name: string, run: () => void): void;
};
type ElementLike = {
  style: { cssText: string };
  remove(): void;
};
type FrameLike = ElementLike & {
  srcdoc: string;
  onload: (() => void) | null;
  contentWindow: WindowLike | null;
};
type AnchorLike = ElementLike & {
  href: string;
  download: string;
  rel: string;
  click(): void;
};
type DocumentLike = {
  createElement(tag: string): unknown;
  body: { appendChild(node: unknown): void };
};
type BrowserGlobals = {
  document?: DocumentLike;
  navigator?: BrowserShareEnv['navigator'];
  Blob?: new (parts: unknown[], options: { type: string }) => unknown;
  File?: new (
    parts: unknown[],
    name: string,
    options: { type: string },
  ) => unknown;
  URL?: {
    createObjectURL?(blob: unknown): string;
    revokeObjectURL(url: string): void;
  };
  setTimeout: (run: () => void, ms: number) => unknown;
};

/** The real browser, or null outside one. */
export function browserShareEnvironment(): BrowserShareEnv | null {
  const g = globalThis as unknown as BrowserGlobals;
  const doc = g.document;
  const BlobCtor = g.Blob;
  const url = g.URL;
  const createObjectURL = url?.createObjectURL;
  if (!doc || !BlobCtor || !url || !createObjectURL) {
    return null;
  }
  const FileCtor = g.File;
  return {
    navigator: g.navigator,
    createBlob: (text, type) => new BlobCtor([text], { type }),
    createFile: FileCtor
      ? (parts, name, type) => new FileCtor(parts, name, { type })
      : undefined,
    createUrl: blob => createObjectURL.call(url, blob),
    revokeUrl: href => url.revokeObjectURL(href),
    clickDownload: (href, name) => {
      const a = doc.createElement('a') as AnchorLike;
      a.href = href;
      a.download = name;
      a.rel = 'noopener';
      a.style.cssText = 'display:none';
      doc.body.appendChild(a);
      a.click();
      a.remove();
    },
    printHtml: html =>
      new Promise<void>((resolve, reject) => {
        const frame = doc.createElement('iframe') as FrameLike;
        frame.style.cssText =
          'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        frame.onload = () => {
          const win = frame.contentWindow;
          if (!win) {
            frame.remove();
            reject(new Error('No print view'));
            return;
          }
          // Remove the frame after printing, or after a minute at most.
          let done = false;
          const clean = () => {
            if (!done) {
              done = true;
              frame.remove();
            }
          };
          win.addEventListener('afterprint', clean);
          g.setTimeout(clean, 60_000);
          try {
            win.focus();
            win.print();
            resolve();
          } catch (error) {
            clean();
            reject(error);
          }
        };
        frame.srcdoc = html;
        doc.body.appendChild(frame);
      }),
    later: (run, ms) => {
      g.setTimeout(run, ms);
    },
  };
}

const environment = browserShareEnvironment();

/** What capabilities.web.ts wires in. */
export const platformShare: ShareCapability | undefined = environment
  ? createWebShare(environment)
  : undefined;
