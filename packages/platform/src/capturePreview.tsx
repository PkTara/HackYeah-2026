import { Image, StyleSheet, Text } from 'react-native';

export function CaptureMediaPreview({
  capture,
}: {
  capture: import('./camera.types').MediaCapture;
}) {
  return capture.kind === 'image' ? (
    <Image
      accessibilityLabel="Captured photo"
      source={{ uri: capture.uri }}
      style={styles.photo}
    />
  ) : (
    <Text accessibilityLabel="Captured video">
      Video captured. Review the clip in your system camera before analyzing.
    </Text>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 280, resizeMode: 'contain' },
});
