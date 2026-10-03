import React, { Suspense, useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { CameraPreviewProps } from './camera.types';

// The native camera and permission modules load only after the user starts
// the camera, so an inactive preview never touches them.
const previewStyle = { flex: 1 };

const ActiveCamera = React.lazy(() =>
  Promise.resolve().then(() => ({
    default: require('./cameraDriver')
      .CameraPreview as React.ComponentType<CameraPreviewProps>,
  })),
);
export function CameraPreview(props: CameraPreviewProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  useEffect(() => {
    if (!props.active) {
      callbacks.current.onReady(null);
    }
  }, [props.active]);
  return props.active ? (
    <Suspense fallback={<View style={previewStyle} />}>
      <ActiveCamera {...props} />
    </Suspense>
  ) : (
    <View />
  );
}
