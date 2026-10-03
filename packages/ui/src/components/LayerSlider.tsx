import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
} from 'react-native';
import { PX, useTheme } from '../theme';
import { useTone } from '../tone';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

export type SliderStop<K extends string> = Readonly<{ key: K; label: string }>;

type Props<K extends string> = {
  stops: readonly SliderStop<K>[];
  value: K;
  onChange: (key: K) => void;
  /**
   * While the handle is dragged: where it is between the stops, 0 at the
   * first stop. Null when it is let go. Lets a picture cross-fade.
   */
  onDrag?: (position: number | null) => void;
  /** What the slider picks, for screen readers: "Layer". */
  label: string;
};

/** Where a point on the track lies between the stops, 0 at the first. */
export function positionAt(x: number, width: number, count: number): number {
  if (width <= 0 || count < 2) {
    return 0;
  }
  return Math.min(count - 1, Math.max(0, x / (width / count) - 0.5));
}

/** The stop a position snaps to. */
export function nearestStop(position: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.round(position)));
}

/** The stop after a step: arrow keys and screen reader swipes. */
export function stepStop(index: number, step: number, count: number): number {
  return Math.min(count - 1, Math.max(0, index + step));
}

const TRACK_H = PX * 6;
const HANDLE_W = PX * 10;
const HANDLE_H = PX * 14;
const AREA_H = 56;
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  ArrowRight: 1,
  ArrowUp: 1,
};

/** Pressable state; hovered and focused are only reported on the web. */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/**
 * A chunky pixel slider with a few labelled stops. Drag the handle (touch
 * or mouse), tap the track or a label to jump, or use the arrow keys. It
 * always snaps to a stop. Screen readers get an adjustable control: swipe
 * up or down to change it.
 */
export function LayerSlider<K extends string>({
  stops,
  value,
  onChange,
  onDrag,
  label,
}: Props<K>) {
  const c = useTheme().colors;
  const tone = useTone();
  const count = stops.length;
  const index = Math.max(0, stops.findIndex(s => s.key === value));
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  // The focus ring is for keyboards: touch and mouse use hide it.
  const [pointer, setPointer] = useState(false);

  // The responder is made once, so it reads the latest props from here.
  const latest = useRef({ stops, index, onChange, onDrag, width });
  latest.current = { stops, index, onChange, onDrag, width };
  const startX = useRef(0);

  const responder = useMemo(() => {
    const move = (x: number) => {
      const { width: w, stops: s, onDrag: report } = latest.current;
      const position = positionAt(x, w, s.length);
      setDrag(position);
      report?.(position);
    };
    const end = (x: number) => {
      const { width: w, stops: s, index: now, onChange: change, onDrag: report } =
        latest.current;
      const stop = nearestStop(positionAt(x, w, s.length), s.length);
      setDrag(null);
      report?.(null);
      if (stop !== now) {
        change(s[stop].key);
      }
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture when the page would like to scroll instead.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: e => {
        setPointer(true);
        startX.current = e.nativeEvent.locationX;
        move(startX.current);
      },
      onPanResponderMove: (_, g) => move(startX.current + g.dx),
      onPanResponderRelease: (_, g) => end(startX.current + g.dx),
      onPanResponderTerminate: (_, g) => end(startX.current + g.dx),
    });
  }, []);

  const go = (stop: number) => {
    if (stop !== index) {
      onChange(stops[stop].key);
    }
  };
  const onAction = (e: AccessibilityActionEvent) => {
    const step = { increment: 1, decrement: -1 }[e.nativeEvent.actionName];
    if (step) {
      go(stepStop(index, step, count));
    }
  };
  // Arrow keys, Home and End on the web. Native keyboards use the actions.
  const keys =
    Platform.OS === 'web'
      ? {
          onKeyDown: (e: { key: string; preventDefault: () => void }) => {
            const step = KEY_STEPS[e.key];
            const target =
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? count - 1
                  : step !== undefined
                    ? stepStop(index, step, count)
                    : null;
            if (target !== null) {
              e.preventDefault();
              go(target);
            }
          },
        }
      : {};

  const column = width / Math.max(1, count);
  const position = drag ?? index;
  // The handle moves in whole art pixels, like the rest of the kit.
  const handleX = Math.round((column * (position + 0.5) - HANDLE_W / 2) / PX) * PX;
  const current = stops[index];

  return (
    <View style={styles.root}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 1, max: count, now: index + 1, text: current.label }}
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        aria-valuetext={current.label}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAction}
        focusable
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setPointer(false);
        }}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        {...keys}
        {...responder.panHandlers}
        style={[styles.area, Platform.OS === 'web' ? webTrack : null]}
      >
        {/* Children ignore touches, so a touch always lands on the area
            itself and locationX is measured from its left edge. */}
        <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
          {focused && !pointer ? (
            <View style={[styles.focus, { borderColor: tone.text }]} />
          ) : null}
          {width > 0 ? (
            <>
              <PixelBox
                fill={c.surfaceShade}
                outline={c.outline}
                style={[
                  styles.track,
                  { left: column / 2 - PX * 2, width: column * (count - 1) + PX * 4 },
                ]}
                contentStyle={styles.trackInside}
              />
              {stops.map((s, i) => (
                <View
                  key={s.key}
                  style={[
                    styles.notch,
                    {
                      left: column * (i + 0.5) - PX,
                      backgroundColor: i === index ? c.primaryShade : c.outline,
                    },
                  ]}
                />
              ))}
              <PixelBox
                fill={c.primary}
                outline={c.outline}
                light="#FFE58A"
                shade={c.primaryShade}
                shadow={c.backgroundDeep}
                lift={drag === null ? PX : 0}
                style={[styles.handle, { left: handleX }]}
                contentStyle={styles.handleInside}
              >
                {[0, 1, 2].map(i => (
                  <View key={i} style={[styles.grip, { backgroundColor: c.primaryShade }]} />
                ))}
              </PixelBox>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.labels}>
        {stops.map((s, i) => (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={s.label}
            aria-selected={i === index}
            onPress={() => go(i)}
            style={styles.stop}
          >
            {(state: PressState) => (
              <View
                style={[
                  styles.stopInside,
                  state.focused ? { borderColor: tone.text } : null,
                  state.hovered && i !== index
                    ? { backgroundColor: c.surfaceLight }
                    : null,
                ]}
              >
                <PixelText text={s.label} accessible={false} />
                {/* The chosen stop is underlined, not only coloured. */}
                <View
                  style={[
                    styles.mark,
                    i === index
                      ? { backgroundColor: c.primary, borderColor: c.outline }
                      : styles.markOff,
                  ]}
                />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Web only: stop the browser from scrolling or zooming while dragging.
const webTrack = { touchAction: 'none', cursor: 'pointer' } as const;

const styles = StyleSheet.create({
  root: { gap: 2 },
  passThrough: { pointerEvents: 'none' },
  area: { height: AREA_H, justifyContent: 'center' },
  focus: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: PX - 1,
    borderStyle: 'dashed',
  },
  track: {
    position: 'absolute',
    top: (AREA_H - TRACK_H) / 2,
    height: TRACK_H,
  },
  trackInside: { padding: 0, height: TRACK_H },
  notch: {
    position: 'absolute',
    top: AREA_H / 2 - PX,
    width: PX * 2,
    height: PX * 2,
  },
  handle: {
    position: 'absolute',
    top: (AREA_H - HANDLE_H) / 2 - PX,
    width: HANDLE_W,
  },
  handleInside: {
    padding: 0,
    height: HANDLE_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: PX,
  },
  grip: { width: PX - 1, height: PX * 5 },
  labels: { flexDirection: 'row' },
  stop: { flex: 1, minHeight: 44 },
  stopInside: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: PX * 2,
    paddingVertical: PX,
    borderWidth: PX - 1,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  mark: {
    width: '70%',
    height: PX * 2 + 2,
    borderWidth: 1,
  },
  markOff: { backgroundColor: 'transparent', borderColor: 'transparent' },
});
