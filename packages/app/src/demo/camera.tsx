import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type {
  CameraCapability,
  CameraPreviewProps,
  MediaCapture,
} from '@hackyeah/platform';
import { AppText, Tag } from '@hackyeah/ui';

function Figure({
  moving = false,
  hand = false,
}: {
  moving?: boolean;
  hand?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!moving) {
      return;
    }
    const timer = setInterval(() => setFrame(old => old + 1), 400);
    return () => clearInterval(timer);
  }, [moving]);
  return (
    <View
      style={{
        flex: 1,
        minHeight: 220,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#173628',
        gap: 8,
      }}
    >
      <Tag text="Simulated camera" />
      {hand ? (
        <AppText style={{ color: '#F5D78E', fontSize: 60 }}>✋</AppText>
      ) : (
        <View style={{ width: 150, height: 145 }}>
          <View
            style={{
              position: 'absolute',
              left: 60,
              top: 0,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#F5D78E',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 70,
              top: 30,
              width: 10,
              height: 60,
              backgroundColor: '#F5D78E',
            }}
          />
          {[-1, 1].map(side => (
            <View key={side}>
              <View
                style={{
                  position: 'absolute',
                  left: 70 + side * 20,
                  top: 35,
                  width: 8,
                  height: 45,
                  backgroundColor: '#F5D78E',
                  transform: [
                    { rotate: `${side * (40 + (frame % 3) * 5)}deg` },
                  ],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: 70 + side * 23,
                  top: 82,
                  width: 8,
                  height: 60,
                  backgroundColor: '#F5D78E',
                  transform: [
                    { rotate: `${side * (38 + (frame % 3) * 4)}deg` },
                  ],
                }}
              />
            </View>
          ))}
        </View>
      )}
      <AppText style={{ color: '#F5D78E' }} variant="caption">
        Example input · no webcam permission needed
      </AppText>
    </View>
  );
}

function Preview({ active, mode, onReady }: CameraPreviewProps) {
  useEffect(() => {
    if (!active) {
      return;
    }
    let recording = false;
    const capture = (kind: 'image' | 'video'): MediaCapture => ({
      kind,
      uri: `demo:${mode}/${kind}`,
      mimeType: kind === 'image' ? 'image/jpeg' : 'video/webm',
      filename: `demo-${mode}.${kind === 'image' ? 'jpg' : 'webm'}`,
      width: 640,
      height: 480,
    });
    onReady({
      snapshot: async () => capture('image'),
      startRecording: async () => {
        recording = true;
      },
      stopRecording: async () => {
        if (!recording) {
          throw new Error('Start recording first.');
        }
        recording = false;
        return capture('video');
      },
    });
    return () => onReady(null);
  }, [active, mode, onReady]);
  return active ? <Figure moving hand={mode === 'hand'} /> : null;
}

export const simulatedCamera: CameraCapability = {
  Preview,
  MediaPreview: ({ capture }) => (
    <Figure
      moving={capture.kind === 'video'}
      hand={capture.uri.includes('hand')}
    />
  ),
};
