/**
 * HarmonyOS keypoints: Core Vision Kit skeleton detection.
 *
 * `skeletonDetection` in `@kit.CoreVisionKit` (since API 12, so available on
 * our API 20 target) finds people in one PixelMap and returns 17 points per
 * person, in COCO order (NOSE = 0 ... RIGHT_ANKLE = 16), with pixel
 * coordinates and a 0 to 1 score per point. Documented limits that matter:
 *   - phones, tablets and PC/2-in-1 only; the kit does not run on the emulator;
 *   - the docs list it as available in mainland China only, so check it on
 *     the demo device before relying on it;
 *   - one image per call, and no concurrent calls to the same feature from
 *     one app, so a live loop must wait for each result (drop frames meanwhile);
 *   - input between 100 and 10000 px a side, 720p or more recommended.
 *
 * Nothing native is built yet. The plan is a TurboModule in
 * apps/mobile/harmony that grabs camera preview frames as PixelMaps, calls
 * `SkeletonDetector.process()`, and sends `{ t, width, height, skeletons }`
 * to JS unchanged. This file turns that payload into PoseFrames, so the
 * mapping is tested now and the native side stays thin.
 */
import {
  BODY_LANDMARKS,
  type Landmark,
  type LandmarkName,
  type PoseFrame,
} from './pose';
import type { KeypointSourceInfo } from './sources';

/** `skeletonDetection.SkeletonPoint`. `point` is in image pixels. */
export type HarmonySkeletonPoint = Readonly<{
  point: Readonly<{ x: number; y: number }>;
  score: number;
  /** `skeletonDetection.SkeletonPointType`, 0 to 16 in COCO order. */
  type: number;
}>;

/** `skeletonDetection.Skeleton`. */
export type HarmonySkeleton = Readonly<{
  score: number;
  points: readonly HarmonySkeletonPoint[];
  boundingBox?: Readonly<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
}>;

export const HARMONY_SKELETON_SOURCE: KeypointSourceInfo = {
  id: 'harmony-core-vision',
  model: 'Core Vision Kit skeletonDetection',
  modelVersion: 'HarmonyOS system model (API 12+)',
  landmarkSet: 'coco-17',
  runsOn: 'device',
  simulated: false,
};

const area = (s: HarmonySkeleton) =>
  s.boundingBox ? s.boundingBox.width * s.boundingBox.height : 0;

/** The most confident person (larger box on a tie), as a PoseFrame. */
export function fromHarmonySkeletons(
  skeletons: readonly HarmonySkeleton[],
  t: number,
  width: number,
  height: number,
): PoseFrame {
  const landmarks: Partial<Record<LandmarkName, Landmark>> = {};
  const best = [...skeletons].sort(
    (a, b) => b.score - a.score || area(b) - area(a),
  )[0];
  if (best && width > 0 && height > 0) {
    best.points.forEach(p => {
      const lmName = BODY_LANDMARKS[p.type];
      if (
        lmName === undefined ||
        !Number.isFinite(p.point.x) ||
        !Number.isFinite(p.point.y)
      ) {
        return;
      }
      landmarks[lmName] = {
        x: p.point.x / width,
        y: p.point.y / height,
        visibility: Math.min(1, Math.max(0, p.score)),
      };
    });
  }
  return { t, width, height, landmarks };
}
