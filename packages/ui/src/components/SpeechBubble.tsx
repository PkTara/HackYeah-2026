import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion, useTicker } from '../hooks';
import { PX, useTheme } from '../theme';
import { ToneContext } from '../tone';
import { AppText } from './AppText';
import { PixelArt } from './PixelArt';
import { PixelBox } from './PixelBox';

/** Typing speed: CHARS_PER_TICK letters every TYPE_MS, about 50 a second. */
const TYPE_MS = 40;
const CHARS_PER_TICK = 2;
/**
 * The live region is filled a moment after the line changes. Screen readers
 * announce changes to a live region, not what it held when it appeared.
 */
const ANNOUNCE_MS = 120;

/**
 * Tail pointing up at the speaker. 'O' is outline, 'F' is fill. The last two
 * rows lie over the bubble's top edge and bevel, which opens the edge up.
 */
const TAIL = [
  '...O...',
  '..OFO..',
  '..OFO..',
  '.OFFFO.',
  '.OFFFO.',
  'OFFFFFO',
  '.FFFFF.',
];
const TAIL_WIDTH = TAIL[0].length * PX;
/** How far the tail sticks out above the bubble, in px. */
export const TAIL_HEIGHT = (TAIL.length - 2) * PX;

type Props = {
  text: string;
  /** Who is talking. Screen readers hear "Monkey says: ...". */
  speaker?: string;
  /** Where the tail points, in px from the bubble's left edge. No tail if left out. */
  tailX?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A pixel speech bubble. The line types out letter by letter like an old
 * game; a tap shows all of it. With reduced motion it shows the whole line at
 * once. Screen readers get the whole line in one go from a live region.
 */
export function SpeechBubble({ text, speaker, tailX, style }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const reduced = useReducedMotion();

  // Letters shown so far, for the text they belong to. A new text starts
  // from zero in the same render, so the old count never flashes.
  const [typed, setTyped] = useState({ text, count: 0 });
  const count = reduced
    ? text.length
    : typed.text === text
      ? typed.count
      : 0;
  const tick = useTicker(TYPE_MS, count < text.length);
  useEffect(() => {
    if (tick === 0) {
      return;
    }
    setTyped(t => ({
      text,
      count: Math.min(
        text.length,
        (t.text === text ? t.count : 0) + CHARS_PER_TICK,
      ),
    }));
  }, [tick, text]);

  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    const line = speaker ? `${speaker} says: ${text}` : text;
    const timer = setTimeout(() => {
      setSpoken(line);
      // iOS has no live regions; Android and the web use the one below.
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(line);
      }
    }, ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [speaker, text]);

  const tone = useMemo(
    () => ({ text: c.text, textMuted: c.textMuted }),
    [c.text, c.textMuted],
  );
  const tailColors = useMemo(
    () => ({ O: c.outline, F: c.surface }),
    [c.outline, c.surface],
  );

  const tailRoom = { paddingTop: tailX === undefined ? 0 : TAIL_HEIGHT };
  return (
    <View accessibilityLiveRegion="polite" style={[tailRoom, style]}>
      <Pressable
        accessible
        accessibilityLabel={spoken}
        accessibilityHint={count < text.length ? 'Shows the whole line' : undefined}
        onPress={() => setTyped({ text, count: text.length })}
      >
        <ToneContext.Provider value={tone}>
          <PixelBox
            fill={c.surface}
            outline={c.outline}
            light={c.surfaceLight}
            shade={c.surfaceShade}
            shadow={c.backgroundDeep}
            lift={PX * 2}
            contentStyle={styles.box}
          >
            {/* Hidden from screen readers, so they never hear it letter
                by letter. */}
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {/* The rest of the line is laid out but invisible, so the
                  bubble keeps its size and words never jump to the next
                  line while they type. */}
              <AppText>
                {text.slice(0, count)}
                <AppText style={styles.unseen}>{text.slice(count)}</AppText>
              </AppText>
            </View>
            {/* The whole line as real text for web screen readers, which
                may skip a label on a plain box. Native ones read the label
                above, so it is hidden from them. */}
            <AppText
              style={styles.offscreen}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {spoken}
            </AppText>
          </PixelBox>
        </ToneContext.Provider>
        {tailX === undefined ? null : (
          <PixelArt
            rows={TAIL}
            colors={tailColors}
            scale={PX}
            style={[styles.tail, { left: Math.round(tailX - TAIL_WIDTH / 2) }]}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: 12, paddingHorizontal: 14 },
  tail: { position: 'absolute', top: -TAIL_HEIGHT },
  unseen: { color: 'transparent' },
  offscreen: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});
