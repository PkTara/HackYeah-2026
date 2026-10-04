import {
  READINESS_LABEL,
  canStart,
  inputReadiness,
  type ReadinessInputs,
} from '../readiness';

const base: ReadinessInputs = {
  media: true,
  camera: true,
  cameraConsent: true,
  photoConsent: true,
  simulatedAnalysis: false,
  simulatedPhotos: false,
  simulatedImports: false,
};

it('manual inputs are always ready on the device', () => {
  expect(inputReadiness({ ...base, media: false, camera: false }).manual).toBe(
    'ready',
  );
});

it('camera assessments say exactly what is missing, server first', () => {
  const camera = (change: Partial<ReadinessInputs>) =>
    inputReadiness({ ...base, ...change }).cameraAssessment;
  expect(camera({})).toBe('ready');
  expect(camera({ media: false, camera: false, cameraConsent: false })).toBe(
    'server',
  );
  expect(camera({ camera: false, cameraConsent: false })).toBe('device');
  expect(camera({ cameraConsent: false })).toBe('permission');
  expect(camera({ simulatedAnalysis: true })).toBe('demo');
});

it('hand photos follow their own permission and simulation', () => {
  const photos = (change: Partial<ReadinessInputs>) =>
    inputReadiness({ ...base, ...change }).handPhotos;
  expect(photos({ media: false })).toBe('server');
  expect(photos({ photoConsent: false, cameraConsent: true })).toBe(
    'permission',
  );
  expect(photos({ simulatedPhotos: true, simulatedAnalysis: false })).toBe(
    'demo',
  );
});

it('health imports are coming later unless the demo simulates them', () => {
  expect(inputReadiness(base).activityImports).toBe('later');
  expect(
    inputReadiness({ ...base, simulatedImports: true }).activityImports,
  ).toBe('demo');
});

it('only ready, demo and permission states can be started', () => {
  expect(
    (Object.keys(READINESS_LABEL) as (keyof typeof READINESS_LABEL)[]).filter(
      canStart,
    ),
  ).toEqual(['ready', 'demo', 'permission']);
  expect(READINESS_LABEL.server).toBe('Needs the server');
  expect(READINESS_LABEL.later).toBe('Coming later');
});
