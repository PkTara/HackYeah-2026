import type { PoseResultDto } from '@hackyeah/data';
export type PreviewGeometry = {
  imageWidth: number;
  imageHeight: number;
  mirrored: boolean;
  fit: 'contain' | 'cover';
};
export type OverlayPoint = { x: number; y: number; index: number };
export function overlayPoints(
  result: PoseResultDto,
  geometry: PreviewGeometry,
  width: number,
  height: number,
  ageMs: number,
): readonly OverlayPoint[] {
  if (
    result.landmarks?.some(
      point =>
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        !Number.isFinite(point.visibility),
    ) ||
    ageMs > 1500 ||
    ageMs < 0 ||
    !geometry.imageWidth ||
    !geometry.imageHeight ||
    !width ||
    !height
  ) {
    return [];
  }
  const scale = (geometry.fit === 'cover' ? Math.max : Math.min)(
    width / geometry.imageWidth,
    height / geometry.imageHeight,
  );
  const dx = (width - geometry.imageWidth * scale) / 2;
  const dy = (height - geometry.imageHeight * scale) / 2;
  return (result.landmarks ?? [])
    .map((point, index) => ({
      index,
      x:
        dx +
        (geometry.mirrored ? 1 - point.x : point.x) *
          geometry.imageWidth *
          scale,
      y: dy + point.y * geometry.imageHeight * scale,
    }))
    .filter(point => {
      const source = result.landmarks![point.index];
      return (
        source.visibility >= 0.5 &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        source.x >= 0 &&
        source.x <= 1 &&
        source.y >= 0 &&
        source.y <= 1 &&
        point.x >= 0 &&
        point.x <= width &&
        point.y >= 0 &&
        point.y <= height
      );
    });
}
