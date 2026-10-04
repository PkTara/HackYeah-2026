import type { PoseResultDto } from '@hackyeah/data';
const landmarks = Array.from({ length: 33 }, () => ({
  x: 0.5,
  y: 0.5,
  visibility: 1,
}));
landmarks[15] = { x: 0.4, y: 0.8, visibility: 1 };
landmarks[16] = { x: 0.6, y: 0.8, visibility: 1 };
export const shoulder = (time: number, angle = 10): PoseResultDto => ({
  status: 'ok',
  metric: 'shoulder_reach',
  value: angle,
  left_value: angle,
  right_value: angle,
  timestamp_ms: time,
  confidence: 0.95,
  unit: 'degrees',
  method: 'camera',
  protocol: 'front-facing-overhead-reach-v1',
  reason: null,
  landmarks,
  image_width: 640,
  image_height: 480,
});
