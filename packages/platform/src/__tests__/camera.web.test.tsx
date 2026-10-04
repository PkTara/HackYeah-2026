import { act, create } from 'react-test-renderer';
import { CameraPreview } from '../camera.web';
import type { CameraSession } from '../camera.types';

test('web preview connects a live stream and releases it on unmount', async () => {
  const track = {
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  const stream = { getTracks: () => [track] };
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => stream } },
  });
  let session: CameraSession | null = null;
  const onGeometry = jest.fn();
  let renderer!: ReturnType<typeof create>;
  try {
    await act(async () => {
      renderer = create(
        <CameraPreview
          active
          onGeometry={onGeometry}
          mode="assessment"
          onReady={value => {
            session = value;
          }}
          onError={message => {
            throw new Error(message);
          }}
        />,
        {
          createNodeMock: () => ({
            srcObject: null,
            videoWidth: 640,
            videoHeight: 480,
            play: async () => {},
          }),
        },
      );
    });
    expect(session).not.toBeNull();
    expect(onGeometry).toHaveBeenCalledWith({
      imageWidth: 640,
      imageHeight: 480,
      mirrored: false,
      fit: 'contain',
    });
    await act(async () => renderer.unmount());
    expect(track.stopped).toBe(true);
    expect(session).toBeNull();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'navigator', original);
    } else {
      Reflect.deleteProperty(globalThis, 'navigator');
    }
  }
});
