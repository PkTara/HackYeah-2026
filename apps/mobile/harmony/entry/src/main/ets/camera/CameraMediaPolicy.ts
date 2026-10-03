export function cameraFramePath(uri: string, cacheDir: string): string {
  const prefix = `file://${cacheDir}/climbing-camera/`;
  const filename = uri.slice(prefix.length);
  if (!uri.startsWith(prefix) || !/^[0-9]+\.jpeg$/.test(filename)) {
    throw new Error('Only captured camera frames can be read.');
  }
  return uri.slice('file://'.length);
}
export function assertCameraFrameSize(size: number): void {
  if (size > 8 * 1024 * 1024) {
    throw new Error('Camera frame exceeds the 8 MiB limit.');
  }
  if (size < 1) {
    throw new Error('Camera frame is empty.');
  }
}
export function cameraVideoPath(uri: string, cacheDir: string): string {
  const prefix = `file://${cacheDir}/climbing-camera/`;
  const filename = uri.slice(prefix.length);
  if (!uri.startsWith(prefix) || !/^climbing-[0-9]+\.mp4$/.test(filename)) {
    throw new Error('Only recorded camera videos can be removed.');
  }
  return uri.slice('file://'.length);
}
export function assertCameraVideoSize(size: number): void {
  if (size < 1) {
    throw new Error('The system camera returned an empty video.');
  }
  if (size > 32 * 1024 * 1024) {
    throw new Error(
      'Video exceeds the 32 MiB upload limit. Record a shorter clip.',
    );
  }
}
