import type { PoseResultDto } from '@hackyeah/data';
export type DemoPoseCamera = { showPose?: (pose: PoseResultDto) => void };
/** The preview uses these exact points, including its resting-to-raised arms. */
export function demoLivePose(
  metric: 'leg_spread' | 'shoulder_reach',
  frame: number,
): PoseResultDto {
  const angle =
    metric === 'shoulder_reach'
      ? frame < 3
        ? 0
        : frame === 3
        ? 90
        : 170
      : 90 + (frame % 3);
  const radians = (angle * Math.PI) / 180;
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0,
  }));
  landmarks[0] = { x: 0.5, y: 0.25, visibility: 1 };
  for (const [side, shoulder, elbow, wrist, hip, knee, ankle] of [
    [-1, 11, 13, 15, 23, 25, 27],
    [1, 12, 14, 16, 24, 26, 28],
  ]) {
    const x = 0.5 + side * 0.1;
    landmarks[shoulder] = { x, y: 0.43, visibility: 1 };
    landmarks[hip] = { x, y: 0.65, visibility: 1 };
    const arm = metric === 'shoulder_reach' ? radians : 0.25;
    landmarks[elbow] = {
      x: x + side * Math.sin(arm) * 0.1125,
      y: 0.43 + Math.cos(arm) * 0.15,
      visibility: 1,
    };
    landmarks[wrist] = {
      x: x + side * Math.sin(arm) * 0.225,
      y: 0.43 + Math.cos(arm) * 0.3,
      visibility: 1,
    };
    const legAngle = ((metric === 'leg_spread' ? angle : 60) * Math.PI) / 360;
    const footX = 0.5 + (side * Math.sin(legAngle) * 150) / 640;
    const footY = 0.65 + (Math.cos(legAngle) * 150) / 480;
    landmarks[knee] = {
      x: (x + footX) / 2,
      y: (0.65 + footY) / 2,
      visibility: 1,
    };
    landmarks[ankle] = { x: footX, y: footY, visibility: 1 };
  }
  return {
    status: 'ok',
    metric,
    value: angle,
    unit: 'degrees',
    confidence: 0.94,
    reason: null,
    method: 'camera',
    protocol:
      metric === 'shoulder_reach'
        ? 'front-facing-overhead-reach-v1'
        : 'front-facing-leg-spread-v1',
    ...(metric === 'shoulder_reach'
      ? { left_value: angle, right_value: angle }
      : {}),
    landmarks,
    image_width: 640,
    image_height: 480,
    timestamp_ms: frame * 500,
  };
}
