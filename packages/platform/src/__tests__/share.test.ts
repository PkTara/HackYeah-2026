import { Share } from 'react-native';
import { nativeShare } from '../share';
import {
  createWebShare,
  hostDownloads,
  type BrowserShareEnv,
} from '../share.web';

const FILE = {
  name: 'climbing-monkey-doctor-run-2026-10-04.txt',
  mimeType: 'text/plain',
  text: 'Running record for my doctor',
};

describe('native share', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the share sheet with the title and text', async () => {
    const spy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });
    await expect(nativeShare.share({ title: 'T', text: 'body' })).resolves.toBe(
      'shared',
    );
    expect(spy).toHaveBeenCalledWith(
      { title: 'T', message: 'body' },
      expect.objectContaining({ subject: 'T' }),
    );
  });

  it('maps a dismissed sheet and an error', async () => {
    jest
      .spyOn(Share, 'share')
      .mockResolvedValueOnce({ action: Share.dismissedAction })
      .mockRejectedValueOnce(new Error('no'));
    await expect(nativeShare.share({ title: 'T', text: 'b' })).resolves.toBe(
      'dismissed',
    );
    await expect(nativeShare.share({ title: 'T', text: 'b' })).resolves.toBe(
      'failed',
    );
    expect(nativeShare.canCopy).toBe(false);
  });
});

function fakeEnv(navigator?: BrowserShareEnv['navigator']) {
  const calls = {
    blobs: [] as [string, string][],
    clicked: [] as [string, string][],
    revoked: [] as string[],
    printed: [] as string[],
  };
  const env: BrowserShareEnv = {
    navigator,
    createBlob: (text, type) => {
      calls.blobs.push([text, type]);
      return { text, type };
    },
    createFile: (parts, name, type) => ({ parts, name, type }),
    createUrl: () => 'blob:1',
    revokeUrl: url => calls.revoked.push(url),
    clickDownload: (url, name) => calls.clicked.push([url, name]),
    printHtml: async html => {
      calls.printed.push(html);
    },
    later: run => run(),
  };
  return { env, calls };
}

describe('web share', () => {
  it('uses the Web Share sheet, with the file when it can', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    const { env } = fakeEnv({ share, canShare: () => true });
    await expect(
      createWebShare(env).share({ title: 'T', text: 'body', file: FILE }),
    ).resolves.toBe('shared');
    expect(share.mock.calls[0][0]).toMatchObject({
      title: 'T',
      text: 'body',
      files: [{ name: FILE.name }],
    });
  });

  it('shares text alone when files cannot go, and maps a closed sheet', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    const share = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(abort);
    const web = createWebShare(fakeEnv({ share, canShare: () => false }).env);
    await web.share({ title: 'T', text: 'b', file: FILE });
    expect(share.mock.calls[0][0]).toEqual({ title: 'T', text: 'b' });
    await expect(web.share({ title: 'T', text: 'b' })).resolves.toBe(
      'dismissed',
    );
  });

  it('says unavailable without a share sheet', async () => {
    await expect(
      createWebShare(fakeEnv({}).env).share({ title: 'T', text: 'b' }),
    ).resolves.toBe('unavailable');
  });

  it('copies, and reports a blocked clipboard as false', async () => {
    const ok = createWebShare(
      fakeEnv({ clipboard: { writeText: async () => {} } }).env,
    );
    expect(ok.canCopy).toBe(true);
    await expect(ok.copy('x')).resolves.toBe(true);
    const blocked = createWebShare(
      fakeEnv({
        clipboard: {
          writeText: () => Promise.reject(new Error('not allowed')),
        },
      }).env,
    );
    await expect(blocked.copy('x')).resolves.toBe(false);
    expect(createWebShare(fakeEnv({}).env).canCopy).toBe(false);
  });

  it('downloads a typed blob with the file name, then lets the URL go', async () => {
    const { env, calls } = fakeEnv({});
    await expect(createWebShare(env).download!(FILE)).resolves.toBe('saved');
    expect(calls.blobs[0]).toEqual([FILE.text, 'text/plain;charset=utf-8']);
    expect(calls.clicked).toEqual([['blob:1', FILE.name]]);
    expect(calls.revoked).toEqual(['blob:1']);
  });

  it('prints the page it is given', async () => {
    const { env, calls } = fakeEnv({});
    await expect(createWebShare(env).print!('<p>x</p>')).resolves.toBe(true);
    expect(calls.printed).toEqual(['<p>x</p>']);
  });
});

describe('host save hook', () => {
  const g = globalThis as { claude?: unknown };
  afterEach(() => {
    delete g.claude;
  });

  it('is null when the page has no hook', async () => {
    await expect(hostDownloads()).resolves.toBeNull();
  });

  it('saves through the hook first and skips the link download', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const use = jest.fn().mockResolvedValue({ save });
    g.claude = { use };
    const { env, calls } = fakeEnv({});
    await expect(createWebShare(env).download!(FILE)).resolves.toBe('saved');
    expect(use).toHaveBeenCalledWith('downloads');
    expect(save).toHaveBeenCalledWith({ filename: FILE.name, data: FILE.text });
    expect(calls.clicked).toEqual([]);
  });

  it('stays quiet when the person declines', async () => {
    const declined = Object.assign(new Error('declined'), { code: 'declined' });
    g.claude = { use: async () => ({ save: () => Promise.reject(declined) }) };
    const { env, calls } = fakeEnv({});
    await expect(createWebShare(env).download!(FILE)).resolves.toBe(
      'dismissed',
    );
    expect(calls.clicked).toEqual([]);
  });

  it('falls back to the link download on any other failure', async () => {
    g.claude = {
      use: async () => ({ save: () => Promise.reject(new Error('broken')) }),
    };
    const { env, calls } = fakeEnv({});
    await expect(createWebShare(env).download!(FILE)).resolves.toBe('saved');
    expect(calls.clicked).toEqual([['blob:1', FILE.name]]);
  });

  it('falls back when the hook itself is missing or throws', async () => {
    g.claude = { use: async () => null };
    await expect(hostDownloads()).resolves.toBeNull();
    g.claude = {
      use: () => {
        throw new Error('no such hook');
      },
    };
    await expect(hostDownloads()).resolves.toBeNull();
  });
});
