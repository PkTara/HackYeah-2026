import { angleDeg, pointOf, verticalOffsetFromLine } from '../geometry';
import {
  BODY_LANDMARKS,
  MEDIAPIPE_POSE_LANDMARKS,
  fromCoco17,
  fromMediaPipeLandmarks,
  mediaPipeLandmarkName,
  type CocoKeypoint,
  type PoseFrame,
} from '../pose';

const mediaPipePoints = (visibility?: number) =>
  MEDIAPIPE_POSE_LANDMARKS.map((_, i) => ({
    x: i / 40,
    y: 1 - i / 40,
    z: 0,
    ...(visibility === undefined ? {} : { visibility }),
  }));

describe('MediaPipe landmarks', () => {
  it('maps all 17 COCO points to the same names, plus the MediaPipe extras', () => {
    expect(MEDIAPIPE_POSE_LANDMARKS).toHaveLength(33);
    const frame = fromMediaPipeLandmarks(mediaPipePoints(0.9), 100, 640, 480);

    BODY_LANDMARKS.forEach(name => expect(frame.landmarks[name]).toBeDefined());
    expect(frame.landmarks.left_heel).toBeDefined();
    expect(frame.landmarks.right_foot_index).toBeDefined();
    // Index 15 is MediaPipe's left wrist.
    expect(frame.landmarks.left_wrist).toEqual({
      x: 15 / 40,
      y: 1 - 15 / 40,
      visibility: 0.9,
    });
    expect(frame).toMatchObject({ t: 100, width: 640, height: 480 });
  });

  it('drops the inner and outer eye points, which have no shared name', () => {
    expect(mediaPipeLandmarkName(1)).toBeNull(); // left_eye_inner
    expect(mediaPipeLandmarkName(6)).toBeNull(); // right_eye_outer
    expect(mediaPipeLandmarkName(2)).toBe('left_eye');
    expect(mediaPipeLandmarkName(99)).toBeNull();
  });

  it('treats points as visible when the runtime reports no visibility at all', () => {
    expect(
      fromMediaPipeLandmarks(mediaPipePoints(), 0, 1, 1).landmarks.nose
        ?.visibility,
    ).toBe(1);
    expect(
      fromMediaPipeLandmarks(mediaPipePoints(0), 0, 1, 1).landmarks.nose
        ?.visibility,
    ).toBe(1);
  });

  it('returns an empty frame when nobody was found', () => {
    expect(fromMediaPipeLandmarks(undefined, 5, 640, 480).landmarks).toEqual(
      {},
    );
    expect(fromMediaPipeLandmarks([], 5, 640, 480).landmarks).toEqual({});
  });
});

describe('COCO-17 keypoints', () => {
  it('reads COCO order and skips the (0, 0) "not visible" marker', () => {
    const keypoints: CocoKeypoint[] = BODY_LANDMARKS.map((_, i) => [
      0.1 + i / 100,
      0.5,
      0.8,
    ]);
    keypoints[9] = [0, 0, 0.9];
    const frame = fromCoco17(keypoints, 0, 1920, 1080);

    expect(frame.landmarks.nose).toEqual({ x: 0.1, y: 0.5, visibility: 0.8 });
    expect(frame.landmarks.left_wrist).toBeUndefined();
    expect(frame.landmarks.right_ankle).toEqual({
      x: 0.26,
      y: 0.5,
      visibility: 0.8,
    });
  });
});

describe('geometry', () => {
  const frameWith = (
    points: Record<string, [number, number]>,
    width: number,
    height: number,
  ): PoseFrame => ({
    t: 0,
    width,
    height,
    landmarks: Object.fromEntries(
      Object.entries(points).map(([name, [x, y]]) => [
        name,
        { x, y, visibility: 1 },
      ]),
    ),
  });

  it('measures angles in pixels, so a portrait frame does not squash them', () => {
    // A right angle in pixels on a 720 x 1280 frame looks skewed in normalised units.
    const frame = frameWith(
      {
        left_shoulder: [0.5, 0.25],
        left_elbow: [0.5, 0.25 + 144 / 1280],
        left_wrist: [0.5 + 144 / 720, 0.25 + 144 / 1280],
      },
      720,
      1280,
    );
    const s = pointOf(frame, 'left_shoulder', 0.5)!;
    const e = pointOf(frame, 'left_elbow', 0.5)!;
    const w = pointOf(frame, 'left_wrist', 0.5)!;
    expect(angleDeg(s, e, w)).toBeCloseTo(90, 5);
  });

  it('ignores points below the visibility threshold', () => {
    const frame: PoseFrame = {
      t: 0,
      width: 100,
      height: 100,
      landmarks: { nose: { x: 0.5, y: 0.5, visibility: 0.2 } },
    };
    expect(pointOf(frame, 'nose', 0.5)).toBeNull();
    expect(pointOf(frame, 'nose', 0.1)).toEqual({ x: 50, y: 50 });
  });

  it('says whether a point is below or above a line', () => {
    expect(
      verticalOffsetFromLine({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 }),
    ).toBe(3);
    expect(
      verticalOffsetFromLine({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 2 }),
    ).toBe(-3);
  });
});
