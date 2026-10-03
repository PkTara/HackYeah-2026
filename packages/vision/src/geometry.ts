/**
 * Geometry on pose landmarks, always in pixels.
 *
 * Landmarks are normalised by width and height separately, so an angle
 * measured on raw normalised numbers is squashed on a portrait frame. Every
 * helper here scales back to pixels first. Only angles and ratios of lengths
 * leave this file, never raw pixel distances, so results do not depend on how
 * far the camera is.
 */
import type { LandmarkName, PoseFrame } from './pose';

export type Point = Readonly<{ x: number; y: number }>;

/** A landmark in pixels, or null when it is missing or less visible than `minVisibility`. */
export function pointOf(
  frame: PoseFrame,
  name: LandmarkName,
  minVisibility: number,
): Point | null {
  const lm = frame.landmarks[name];
  if (!lm || lm.visibility < minVisibility) {
    return null;
  }
  return { x: lm.x * frame.width, y: lm.y * frame.height };
}

/** Visibility of a landmark, 0 when missing. */
export function visibilityOf(frame: PoseFrame, name: LandmarkName): number {
  return frame.landmarks[name]?.visibility ?? 0;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Mean of the points that are present, or null when none are. */
export function meanPoint(points: readonly (Point | null)[]): Point | null {
  const present = points.filter((p): p is Point => p !== null);
  if (present.length === 0) {
    return null;
  }
  return {
    x: present.reduce((sum, p) => sum + p.x, 0) / present.length,
    y: present.reduce((sum, p) => sum + p.y, 0) / present.length,
  };
}

/** The angle at `vertex` between the rays to `a` and `c`, in degrees (0 to 180). */
export function angleDeg(a: Point, vertex: Point, c: Point): number {
  const ux = a.x - vertex.x;
  const uy = a.y - vertex.y;
  const vx = c.x - vertex.x;
  const vy = c.y - vertex.y;
  const lengths = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (lengths === 0) {
    return NaN;
  }
  const cos = Math.min(1, Math.max(-1, (ux * vx + uy * vy) / lengths));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** How far the line from `a` to `b` is tilted away from horizontal, 0 to 90 degrees. */
export function tiltFromHorizontalDeg(a: Point, b: Point): number {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Where `p` sits relative to the straight line through `a` and `c`, measured
 * vertically at p's x. Positive means p is below the line (image y grows
 * downwards). Used for "hips sagging" versus "hips too high" in a plank.
 */
export function verticalOffsetFromLine(a: Point, c: Point, p: Point): number {
  if (c.x === a.x) {
    return 0;
  }
  const lineY = a.y + ((p.x - a.x) * (c.y - a.y)) / (c.x - a.x);
  return p.y - lineY;
}
