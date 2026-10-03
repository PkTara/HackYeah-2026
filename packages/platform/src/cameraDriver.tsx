import React, { Suspense } from 'react';
import { Camera, CameraType } from 'react-native-camera-kit';
import { Platform, View } from 'react-native';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { readNativeFrameBytes } from './nativeFileBytes';
import {
  createNativeCameraPreview,
  type NativeCameraHandle,
  type NativeCameraViewProps,
} from './nativeCamera';

const previewStyle = { flex: 1 };

const CameraView = React.forwardRef<NativeCameraHandle, NativeCameraViewProps>(
  (props, ref) => (
    <Suspense fallback={<View style={previewStyle} />}>
      <Camera
        onZoom={() => props.onStarted?.()}
        {...props}
        ref={value => {
          if (typeof ref === 'function') {
            ref(value);
          } else if (ref) {
            ref.current = value;
          }
        }}
        cameraType={
          props.cameraType === 'front' ? CameraType.Front : CameraType.Back
        }
      />
    </Suspense>
  ),
);

export const CameraPreview = createNativeCameraPreview({
  View: CameraView,
  requiresStarted: true,
  readBytes: readNativeFrameBytes,
  requestPermission: async () => {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA;
    return (await request(permission)) === RESULTS.GRANTED;
  },
});
