export async function readNativeFrameBytes(uri: string): Promise<Uint8Array> {
  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > 8 * 1024 * 1024) {
    throw new Error('Camera frame exceeds the 8 MiB limit.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Camera frame could not be read.'));
      }
    };
    reader.onerror = () => reject(new Error('Camera frame could not be read.'));
    reader.readAsArrayBuffer(blob);
  });
}
