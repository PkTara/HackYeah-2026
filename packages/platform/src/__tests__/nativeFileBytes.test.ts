import { readNativeFrameBytes } from '../nativeFileBytes';
test('reads native local camera files through Blob and FileReader for live analysis', async () => {
  const blob = { size: 3 };
  const fetchFile = jest.fn().mockResolvedValue({ blob: async () => blob });
  const originalFetch = globalThis.fetch;
  const originalReader = globalThis.FileReader;
  class Reader {
    result = new Uint8Array([255, 216, 255]).buffer;
    onload: (() => void) | null = null;
    readAsArrayBuffer(input: unknown) {
      expect(input).toBe(blob);
      this.onload?.();
    }
  }
  globalThis.fetch = fetchFile;
  globalThis.FileReader = Reader as unknown as typeof FileReader;
  try {
    await expect(
      readNativeFrameBytes('file:///cache/frame.jpg'),
    ).resolves.toEqual(new Uint8Array([255, 216, 255]));
    expect(fetchFile).toHaveBeenCalledWith('file:///cache/frame.jpg');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.FileReader = originalReader;
  }
});
test('refuses oversized files before allocating a live frame buffer', async () => {
  const originalFetch = globalThis.fetch;
  const originalReader = globalThis.FileReader;
  class Reader {
    result = new ArrayBuffer(0);
    onload: (() => void) | null = null;
    readAsArrayBuffer() {
      this.onload?.();
    }
  }
  globalThis.FileReader = Reader as unknown as typeof FileReader;
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({ blob: async () => ({ size: 8 * 1024 * 1024 + 1 }) });
  try {
    await expect(
      readNativeFrameBytes('file:///cache/frame.jpg'),
    ).rejects.toThrow('Camera frame exceeds the 8 MiB limit.');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.FileReader = originalReader;
  }
});
