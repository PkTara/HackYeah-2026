/**
 * Can this input be used right now? One quiet state per item on the Data
 * hub and its detail pages, so a feature that cannot run here never looks
 * like one that can.
 */
import { useCapabilities } from './capabilities';
import { useDemo } from './demo/DemoProvider';
import { useMedia } from './media';
import { usePrivacy } from './privacy/PrivacyProvider';

export type Readiness =
  /** Works now, on this device. */
  | 'ready'
  /** Works now, with simulated input or results (demo mode). */
  | 'demo'
  /** Works after one switch in Settings. */
  | 'permission'
  /** This device has no camera. */
  | 'device'
  /** Needs the Climbing Monkey server, which this build is not using. */
  | 'server'
  /** Not built yet. */
  | 'later';

export const READINESS_LABEL: Readonly<Record<Readiness, string>> = {
  ready: 'Ready',
  demo: 'Demo',
  permission: 'Needs permission',
  device: 'Needs a camera',
  server: 'Needs the server',
  later: 'Coming later',
};

/** Ready, demo and permission can be started from here; the rest cannot. */
export function canStart(state: Readiness): boolean {
  return state === 'ready' || state === 'demo' || state === 'permission';
}

export type ReadinessInputs = Readonly<{
  /** A media client exists: a server is set, or demo media stands in. */
  media: boolean;
  camera: boolean;
  /** The saved camera-analysis permission. */
  cameraConsent: boolean;
  /** The saved hand-photo permission. */
  photoConsent: boolean;
  /** Demo mode is on and simulates pose analysis. */
  simulatedAnalysis: boolean;
  /** Demo mode is on and simulates hand-photo storage. */
  simulatedPhotos: boolean;
  /** Demo mode is on with at least one simulated health provider. */
  simulatedImports: boolean;
}>;

export type InputReadiness = Readonly<{
  /** Typed measurements, stopwatch and counter: always on the device. */
  manual: Readiness;
  /** Live leg spread and shoulder reach from the camera. */
  cameraAssessment: Readiness;
  handPhotos: Readiness;
  /** Workouts and sleep from health apps. */
  activityImports: Readiness;
}>;

export function inputReadiness(i: ReadinessInputs): InputReadiness {
  const camera = (consent: boolean, simulated: boolean): Readiness =>
    !i.media
      ? 'server'
      : !i.camera
      ? 'device'
      : !consent
      ? 'permission'
      : simulated
      ? 'demo'
      : 'ready';
  return {
    manual: 'ready',
    cameraAssessment: camera(i.cameraConsent, i.simulatedAnalysis),
    // Photos are kept by the server, so a camera alone is not enough.
    handPhotos: camera(i.photoConsent, i.simulatedPhotos),
    activityImports: i.simulatedImports ? 'demo' : 'later',
  };
}

/** The readiness of every input in the running app. */
export function useInputReadiness(): InputReadiness {
  const media = useMedia();
  const { camera } = useCapabilities();
  const privacy = usePrivacy();
  const demo = useDemo().settings;
  return inputReadiness({
    media: Boolean(media),
    camera: Boolean(camera),
    cameraConsent: privacy.choices.cameraAnalysis,
    photoConsent: privacy.choices.handPhotos,
    simulatedAnalysis: demo.enabled && demo.analysis,
    simulatedPhotos: demo.enabled && demo.handPhotos,
    simulatedImports:
      demo.enabled && Object.values(demo.connections).some(Boolean),
  });
}
