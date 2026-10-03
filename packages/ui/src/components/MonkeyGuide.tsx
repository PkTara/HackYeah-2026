import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { PixelCanvas } from '../pixel/raster';
import { SCENE_COLORS } from '../pixel/scene';
import { monkeyRows, SPRITE_COLORS, type MonkeyPose } from '../pixel/sprites';
import { useTheme } from '../theme';
import { PixelArt } from './PixelArt';
import { SpeechBubble } from './SpeechBubble';

/** Height of the jungle strip in art pixels. */
export const GUIDE_HEIGHT = 48;

/**
 * The guide monkey is the companion sprite without its climbing hold: it
 * grips the vines instead. Sprite columns 24 and 25 are the middle of its
 * fist, where the vine runs.
 */
export const GRIP_X = 24;
/** Rows above the fist that only held the hold. */
const HOLD_ROWS = 3;
/** The fist, in sprite columns. Everything else in its rows was the hold. */
const FIST = { from: 22, to: 27 };
/** Columns of the head that share the fist's last row. */
const HEAD_TO = 15;
/** The sprite reaches this far left and right of the grip column. */
const REACH_LEFT = GRIP_X - 2;
const REACH_RIGHT = FIST.to - GRIP_X;
/** Sprite column of the face, where the bubble's tail points. */
const FACE_X = 13;

/**
 * Fist row for each perch, so the vines hang to different lengths. High
 * enough that the feet dangle well above the bushes.
 */
const GRIP_ROWS = [10, 12, 8, 11, 9, 12, 10];

/** A hop is HOP_FRAMES steps of HOP_MS. */
export const HOP_FRAMES = 10;
const HOP_MS = 55;
const IDLE_MS = 160;
/** Jumping for joy, in art pixels (negative is up). */
const BOUNCE = [0, -3, -5, -3, 0, -2, 0, 0];

/** Where the monkey holds a vine: x is the vine's left column, y the fist's top row. */
export type Perch = Readonly<{ x: number; y: number }>;

/** The companion sprite without its hold, cropped to start at the fist. */
export function guideMonkeyRows(pose: MonkeyPose): string[] {
  return monkeyRows(pose)
    .slice(HOLD_ROWS)
    .map((row, y) =>
      y > 3
        ? row
        : [...row]
            .map((key, x) =>
              (x >= FIST.from && x <= FIST.to) || (y === 3 && x <= HEAD_TO)
                ? key
                : '.',
            )
            .join(''),
    );
}

/**
 * Perches spread evenly between art columns `left` and `right`, far enough
 * in that the whole monkey stays inside.
 */
export function perchLayout(count: number, left: number, right: number): Perch[] {
  const lo = left + REACH_LEFT;
  const hi = Math.max(lo, right - REACH_RIGHT - 1);
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    x: Math.round(count < 2 ? (lo + hi) / 2 : lo + ((hi - lo) * i) / (count - 1)),
    y: GRIP_ROWS[i % GRIP_ROWS.length],
  }));
}

/**
 * Position `frame` steps into a hop from one perch to another: x moves
 * evenly, y rises and falls in an arc. Whole pixels only.
 */
export function hopPoint(from: Perch, to: Perch, frame: number): Perch {
  const t = Math.min(1, Math.max(0, frame / HOP_FRAMES));
  // Longer hops go higher, but never out of the top of the strip.
  const lift = Math.max(
    0,
    Math.min(
      9,
      Math.min(from.y, to.y) - 1,
      5 + Math.round(Math.abs(to.x - from.x) / 8),
    ),
  );
  return {
    x: Math.round(from.x + (to.x - from.x) * t),
    y: Math.round(from.y + (to.y - from.y) * t - lift * 4 * t * (1 - t)),
  };
}

/** Park-Miller, so the strip looks the same on every render and device. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * A short jungle for the guide: sky, sun or moon, canopy, a vine for each
 * perch and a few more for decoration, bushes and grass. Uses the same
 * palette keys as the profile's jungle (SCENE_COLORS).
 */
export function guideStrip(
  cols: number,
  height: number,
  night: boolean,
  perches: readonly Perch[],
): string[] {
  const c = new PixelCanvas(cols, height);
  const rand = seeded(20261004);
  const sky = seeded(1004);
  const stepped = (v: number) => 2 * Math.round(v / 2);

  const band2 = Math.round(height * 0.42);
  const band3 = band2 + Math.round(height * 0.3);
  c.rect(0, 0, cols, band2, '1');
  c.rect(0, band2, cols, band3 - band2, '2');
  c.rect(0, band3, cols, height - band3, '3');

  const sx = Math.round(cols * 0.16);
  const sy = Math.round(height * 0.52);
  for (let y = -5; y <= 5; y++) {
    for (let x = -5; x <= 5; x++) {
      if (x * x + y * y <= 26) {
        c.set(sx + x, sy + y, 'u');
      }
    }
  }
  if (night) {
    for (let i = 0; i < Math.round(cols / 6); i++) {
      c.set(Math.floor(sky() * cols), 6 + Math.floor(sky() * height * 0.3), 'u');
    }
  }

  // Far trees and canopy, then nearer leaves and bushes. Heights change in
  // steps of two pixels, which keeps the number of drawn rectangles low.
  for (let x = 0; x < cols; x++) {
    const hill = stepped(9 + 3 * Math.sin(x / 6) + 2 * Math.sin(x / 2.7 + 1));
    c.rect(x, height - hill, 1, hill, 'f');
    const drop = stepped(5 + 2 * Math.sin(x / 4.5 + 1) + Math.sin(x / 1.9));
    c.rect(x, 0, 1, drop, 'f');
    const top = stepped(3 + 1.5 * Math.sin(x / 3.3 + 2));
    c.rect(x, 0, 1, top, 'm');
    const bush = stepped(5 + 2 * Math.sin(x / 4 + 0.5));
    c.rect(x, height - bush, 1, bush, 'm');
  }

  // Thin vines for decoration, kept clear of the perches.
  for (let x = 3; x < cols - 1; x += 9 + Math.floor(rand() * 5)) {
    if (perches.some(p => Math.abs(p.x - x) < 9)) {
      continue;
    }
    const length = 8 + Math.floor(rand() * 12);
    for (let y = 2; y < length; y++) {
      c.set(x + (Math.floor(y / 7) % 2), y, 'v');
      if (y % 4 === 1) {
        c.set(x + (y % 8 < 4 ? 2 : -1), y, 'l');
      }
    }
  }

  // A thick vine for each perch, ending in a leafy tuft under the fist.
  perches.forEach((p, i) => {
    const end = p.y + 4;
    for (let y = 1; y < end; y++) {
      c.rect(p.x, y, 2, 1, 'v');
      if (y > 3 && y % 4 === i % 4) {
        c.set(y % 8 < 4 ? p.x + 2 : p.x - 1, y, 'l');
      }
    }
    c.rect(p.x - 1, end, 4, 1, 'l');
    c.rect(p.x, end + 1, 2, 1, 'l');
  });

  c.rect(0, height - 2, cols, 2, 'g');
  for (let x = 1; x < cols; x += 3 + Math.floor(rand() * 4)) {
    c.set(x, height - 3, 'G');
    c.set(x + 1, height - 4, 'G');
  }

  if (night) {
    for (let i = 0; i < Math.round(cols / 10); i++) {
      c.set(
        Math.floor(sky() * cols),
        Math.floor(height * 0.35 + sky() * height * 0.45),
        'y',
      );
    }
  }
  return c.rows();
}

type Props = {
  /** What the monkey says. It types out in the speech bubble. */
  line: string;
  /** The perch for this moment, 0 to spots - 1. Change it to make the monkey hop. */
  spot: number;
  /** How many perches the strip has. */
  spots: number;
  /**
   * Perch to hop in from when the guide first appears, e.g. the previous
   * step's perch when each step mounts its own guide.
   */
  from?: number;
  /** Cheer and bounce, e.g. when the last step is reached. */
  celebrate?: boolean;
  /** Width of the strip in px (full bleed). */
  width: number;
  /**
   * Width of the speech bubble, centred under the strip. The perches spread
   * over the same span, so the tail can always point at the monkey.
   */
  columnWidth?: number;
};

/**
 * The monkey that guides you through a flow: a strip of jungle with a vine
 * for each perch, the monkey hanging from one, and its speech bubble below.
 * When `spot` changes it lets go and hops to the new vine in a pixel arc,
 * then hangs there and idles. Reduced motion places it without the hop.
 */
export function MonkeyGuide({
  line,
  spot,
  spots,
  from,
  celebrate = false,
  width,
  columnWidth,
}: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const night = theme.scheme === 'dark';

  // Chunkier pixels on wide screens, like the profile's jungle.
  const scale = width >= 700 ? 4 : 3;
  const cols = Math.ceil(width / scale);
  const column = Math.min(columnWidth ?? width, width);
  const left = Math.round((width - column) / 2 / scale);
  const right = Math.floor((width + column) / 2 / scale) - 1;

  const perches = useMemo(
    () => perchLayout(spots, left, right),
    [spots, left, right],
  );
  const strip = useMemo(
    () => guideStrip(cols, GUIDE_HEIGHT, night, perches),
    [cols, night, perches],
  );

  const clamp = (s: number) => Math.max(0, Math.min(perches.length - 1, s));
  const target = clamp(spot);

  // The hop: which perch it left and the hop tick it left at.
  const [hop, setHop] = useState<{ from: number; start: number } | null>(null);
  const hopping = hop !== null && !reduced;
  const hopTick = useTicker(HOP_MS, hopping);
  const hopTickRef = useRef(hopTick);
  hopTickRef.current = hopTick;
  const perchRef = useRef(from === undefined ? target : clamp(from));

  useEffect(() => {
    if (perchRef.current === target) {
      return;
    }
    const origin = perchRef.current;
    perchRef.current = target;
    setHop({ from: origin, start: hopTickRef.current });
  }, [target]);

  const frame = hop ? hopTick - hop.start : 0;
  const inAir = hopping && frame < HOP_FRAMES;
  useEffect(() => {
    if (hop && (reduced || frame >= HOP_FRAMES)) {
      setHop(null);
    }
  }, [hop, frame, reduced]);

  const idleTick = useTicker(IDLE_MS, !reduced);
  const pos =
    inAir && hop
      ? hopPoint(perches[clamp(hop.from)], perches[target], frame)
      : perches[target];

  const cheering = inAir || celebrate;
  const pose: MonkeyPose = cheering
    ? 'cheer'
    : !reduced && idleTick > 0 && idleTick % 24 === 0
      ? 'blink'
      : 'idle';
  const dy =
    reduced || inAir
      ? 0
      : celebrate
        ? BOUNCE[idleTick % BOUNCE.length]
        : Math.floor(idleTick / 4) % 2;
  const sprite = useMemo(() => guideMonkeyRows(pose), [pose]);

  // The bubble's tail follows the monkey, hop by hop.
  const faceX = (pos.x - GRIP_X + FACE_X) * scale - (width - column) / 2;
  const tailX = Math.max(24, Math.min(column - 24, faceX));

  return (
    <View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width, height: GUIDE_HEIGHT * scale, overflow: 'hidden' }}
      >
        <PixelArt
          rows={strip}
          colors={night ? SCENE_COLORS.night : SCENE_COLORS.day}
          scale={scale}
        />
        {/* Only this wrapper moves; the sprite itself is memoised. */}
        <View
          style={{
            position: 'absolute',
            left: (pos.x - GRIP_X) * scale,
            top: (pos.y + dy) * scale,
          }}
        >
          <PixelArt rows={sprite} colors={SPRITE_COLORS} scale={scale} />
        </View>
      </View>
      <SpeechBubble
        text={line}
        speaker="Monkey"
        tailX={tailX}
        style={{ width: column, alignSelf: 'center', marginTop: -6 }}
      />
    </View>
  );
}
