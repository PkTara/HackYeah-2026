import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FINGERS, type Finger, type Side } from '@hackyeah/core';
import {
  AppText,
  HAND_HEIGHT,
  HAND_WIDTH,
  LEFT_HAND_FINGERS,
  PixelArt,
  PixelText,
  SPRITE_COLORS,
  handRows,
  spacing,
  useTheme,
} from '@hackyeah/ui';
import { SIDE_NAME, fingerLabel } from '../labels';

// Four art pixels per finger at scale 11 makes every target at least 44px.
// Targets meet at their edges rather than overlapping adjacent fingers.
const SCALE = 11;
function fingerArea(side: Side, finger: Finger) {
  const index = FINGERS.indexOf(finger);
  const region = LEFT_HAND_FINGERS[finger];
  const left = index * 4;
  const top = Math.max(0, region.y0 - 1);
  return {
    left: (side === 'left' ? left : HAND_WIDTH - left - 4) * SCALE,
    top: top * SCALE,
    width: 4 * SCALE,
    height: (region.y1 + 2 - top) * SCALE,
  };
}

type Props = Readonly<{
  side: Side;
  sore: readonly Finger[];
  onOpen: (finger: Finger) => void;
}>;

/** The drawing itself is the control; its art is decorative, its buttons are not. */
export function HandDiagram({ side, sore, onOpen }: Props) {
  const c = useTheme().colors;
  const [focused, setFocused] = useState<Finger | null>(null);
  return (
    <View style={styles.hand}>
      <PixelText text={`${SIDE_NAME[side]} hand`} heading />
      <View style={styles.diagram}>
        <View aria-hidden importantForAccessibility="no-hide-descendants">
          <PixelArt
            rows={handRows(side, sore)}
            colors={SPRITE_COLORS}
            scale={SCALE}
          />
        </View>
        {FINGERS.map(finger => {
          const flagged = sore.includes(finger);
          return (
            <Pressable
              key={finger}
              accessible
              focusable
              accessibilityRole="button"
              accessibilityLabel={fingerLabel(side, finger)}
              aria-label={`${fingerLabel(side, finger)}, ${
                flagged ? 'flagged' : 'not flagged'
              }`}
              accessibilityHint={
                flagged
                  ? 'Flagged. Open to edit sore spots.'
                  : 'Not flagged. Open to mark sore spots.'
              }
              accessibilityState={{ selected: flagged }}
              onFocus={() => setFocused(finger)}
              onBlur={() => setFocused(null)}
              onPress={() => onOpen(finger)}
              style={({
                pressed,
                hovered,
              }: {
                pressed: boolean;
                hovered?: boolean;
              }) => [
                styles.area,
                fingerArea(side, finger),
                {
                  borderColor:
                    focused === finger || pressed || hovered
                      ? c.text
                      : flagged
                      ? c.danger
                      : c.info,
                  borderStyle:
                    flagged || focused === finger || pressed || hovered
                      ? 'solid'
                      : 'dotted',
                  borderWidth: focused === finger || pressed ? 3 : 2,
                },
              ]}
            >
              {flagged ? (
                <View
                  aria-hidden
                  importantForAccessibility="no-hide-descendants"
                  style={[styles.marker, { backgroundColor: c.danger }]}
                >
                  <AppText style={[styles.markerText, { color: c.onDanger }]}>
                    !
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hand: { alignItems: 'center', gap: spacing.md },
  diagram: { width: HAND_WIDTH * SCALE, height: HAND_HEIGHT * SCALE },
  area: { position: 'absolute', alignItems: 'center' },
  markerText: { fontWeight: '800' },
  marker: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
