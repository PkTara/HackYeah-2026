import { overlayPoints } from '../overlay';
import { shoulder } from '../../testing/livePoseFixture';
test('maps normalized landmarks to a letterboxed mirrored preview', () => {
  const result = {
    ...shoulder(0),
    landmarks: [{ x: 0.25, y: 0, visibility: 1 }],
  };
  expect(
    overlayPoints(
      result,
      { imageWidth: 640, imageHeight: 480, mirrored: true, fit: 'contain' },
      320,
      280,
      0,
    ),
  ).toEqual([{ x: 240, y: 20, index: 0 }]);
});
test('native cover crops outer points and hides stale marks', () => {
  const result = {
    ...shoulder(0),
    landmarks: [
      { x: 0, y: 0.5, visibility: 1 },
      { x: 0.5, y: 0.5, visibility: 1 },
      { x: 0.5, y: 0.7, visibility: 0.1 },
    ],
  };
  const geometry = {
    imageWidth: 640,
    imageHeight: 480,
    mirrored: false,
    fit: 'cover' as const,
  };
  expect(overlayPoints(result, geometry, 280, 280, 0)).toEqual([
    { x: 140, y: 140, index: 1 },
  ]);
  expect(overlayPoints(result, geometry, 280, 280, 1501)).toEqual([]);
});
test('invalid measurements can still mark finite detected points', () => {
  expect(
    overlayPoints(
      {
        ...shoulder(0),
        status: 'invalid_capture',
        value: null,
        left_value: null,
        right_value: null,
        landmarks: [{ x: 0.5, y: 0.5, visibility: 1 }],
      },
      { imageWidth: 640, imageHeight: 480, mirrored: false, fit: 'contain' },
      320,
      280,
      0,
    ),
  ).toEqual([{ x: 160, y: 140, index: 0 }]);
});
test('nonfinite detected geometry clears the entire overlay', () => {
  const result = shoulder(0);
  expect(
    overlayPoints(
      {
        ...result,
        landmarks: result.landmarks!.map((point, index) =>
          index === 0 ? { ...point, visibility: Infinity } : point,
        ),
      },
      { imageWidth: 640, imageHeight: 480, mirrored: false, fit: 'contain' },
      320,
      280,
      0,
    ),
  ).toEqual([]);
});
