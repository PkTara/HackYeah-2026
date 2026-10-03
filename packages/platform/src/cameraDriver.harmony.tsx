import React from 'react';
import { Camera, CameraType } from 'react-native-camera-kit';
import { TurboModuleRegistry, type TurboModule } from 'react-native';
import {
  createHarmonyMediaAdapter,
  type HarmonyMediaModule,
} from './harmonyCamera';
import {
  createNativeCameraPreview,
  type NativeCameraHandle,
  type NativeCameraViewProps,
} from './nativeCamera';

interface CameraPermissionModule extends TurboModule {
  requestDeviceCameraAuthorization(): Promise<boolean>;
}
const CameraView = React.forwardRef<NativeCameraHandle, NativeCameraViewProps>(
  (props, ref) => (
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
  ),
);
interface CameraMediaModule extends TurboModule, HarmonyMediaModule {}
const media = createHarmonyMediaAdapter({
  releaseVideo: uri =>
    TurboModuleRegistry.getEnforcing<CameraMediaModule>(
      'ClimbingCameraMedia',
    ).releaseVideo(uri),
  releaseFrame: uri =>
    TurboModuleRegistry.getEnforcing<CameraMediaModule>('ClimbingCameraMedia')
      .releaseFrame!(uri),
  readFrame: uri =>
    TurboModuleRegistry.getEnforcing<CameraMediaModule>(
      'ClimbingCameraMedia',
    ).readFrame(uri),
  recordVideo: cameraType =>
    TurboModuleRegistry.getEnforcing<CameraMediaModule>(
      'ClimbingCameraMedia',
    ).recordVideo(cameraType),
});
export const CameraPreview = createNativeCameraPreview({
  ...media,
  View: CameraView,
  requiresStarted: true,
  // RNOH's paired camera-kit port provides this permission handshake in ArkTS.
  requestPermission: () =>
    TurboModuleRegistry.getEnforcing<CameraPermissionModule>(
      'RTNCamerakit',
    ).requestDeviceCameraAuthorization(),
});
