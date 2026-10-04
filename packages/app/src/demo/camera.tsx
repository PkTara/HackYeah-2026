import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CameraCapability,
  CameraPreviewProps,
  CameraSession,
  MediaCapture,
} from '@hackyeah/platform';
import type { PoseResultDto } from '@hackyeah/data';
import { AppText, Tag } from '@hackyeah/ui';
import { Markings } from '../capture/Markings';
import { overlayPoints } from '../capture/overlay';
import { demoLivePose, type DemoPoseCamera } from './pose';
function Figure({
  hand = false,
  pose = demoLivePose('leg_spread', 0),
}: {
  hand?: boolean;
  pose?: PoseResultDto;
}) {
  const [width, setWidth] = useState(320);
  const points = overlayPoints(
    pose,
    { imageWidth: 640, imageHeight: 480, mirrored: false, fit: 'contain' },
    width,
    280,
    0,
  );
  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={styles.figure}
    >
      {hand ? (
        <AppText style={styles.hand}>✋</AppText>
      ) : (
        <>
          <Markings points={points} prefix="demo" />
        </>
      )}
      <View style={styles.label}>
        <Tag text="Simulated camera" />
      </View>
      <AppText variant="caption" style={styles.caption}>
        Example input · no webcam permission needed
      </AppText>
    </View>
  );
}
function Preview({ active, mode, onReady, onGeometry }: CameraPreviewProps) {
  const [pose, setPose] = useState(() => demoLivePose('leg_spread', 0));
  const geometry = useRef(onGeometry);
  geometry.current = onGeometry;
  useEffect(() => {
    if (!active) {
      return;
    }
    let current = true;
    let recording = false;
    const capture = (kind: 'image' | 'video'): MediaCapture => ({
      kind,
      uri: `demo:${mode}/${kind}`,
      mimeType: kind === 'image' ? 'image/jpeg' : 'video/webm',
      filename: `demo-${mode}.${kind === 'image' ? 'jpg' : 'webm'}`,
      width: 640,
      height: 480,
    });
    const session: CameraSession & DemoPoseCamera = {
      simulated: true,
      showPose: next => {
        if (current) {
          setPose(next);
        }
      },
      snapshot: async () => {
        if (!current) {
          throw new Error('Camera is closed');
        }
        return capture('image');
      },
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
    };
    geometry.current?.({
      imageWidth: 640,
      imageHeight: 480,
      mirrored: false,
      fit: 'contain',
    });
    onReady(session);
    return () => {
      current = false;
      onReady(null);
    };
  }, [active, mode, onReady]);
  return active ? <Figure hand={mode === 'hand'} pose={pose} /> : null;
}
export const simulatedCamera: CameraCapability = {
  Preview,
  MediaPreview: ({ capture }) => <Figure hand={capture.uri.includes('hand')} />,
};

const styles = StyleSheet.create({
  figure: {
    height: 280,
    width: '100%',
    backgroundColor: '#173628',
    overflow: 'hidden',
  },
  hand: { fontSize: 60, textAlign: 'center', marginTop: 80 },
  label: { position: 'absolute', top: 8, left: 8 },
  caption: { position: 'absolute', bottom: 8, left: 8, color: '#F5D78E' },
});
