import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { textWidth } from '../pixel/font';
import { art } from '../pixel/raster';
import { useUiSound } from '../sound';
import { PX, useTheme } from '../theme';
import { useTone } from '../tone';
import { PixelArt } from './PixelArt';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

export type Crumb = Readonly<{
  label: string;
  /** A shorter label for narrow screens: "Right ring" for "Right ring finger". */
  short?: string;
  /** Goes back to this level. The last crumb, the page you are on, has none. */
  onPress?: () => void;
}>;

const SCALE = 2;
/** Space a sign adds around its label: padding and outline, both sides. */
const SIGN = 10 * 2 + PX * 2;
const GAP = 6;
const CHEVRON = art(`
  ##...
  .##..
  ..##.
  ...##
  ..##.
  .##..
  ##...
`);
/** Room one chevron takes, with the gaps on both sides. */
const SEPARATOR = CHEVRON[0].length * SCALE + GAP * 2;

function trailWidth(labels: readonly string[]): number {
  return labels.reduce(
    (sum, label, i) =>
      sum +
      textWidth(label) * SCALE +
      (i < labels.length - 1 ? SIGN + SEPARATOR : 0),
    0,
  );
}

/** Cuts a label down to `chars` characters and marks the cut with "..". */
function cut(label: string, chars: number): string {
  return label.length <= chars ? label : `${label.slice(0, Math.max(1, chars)).trimEnd()}..`;
}

/**
 * The labels that fit in `room` px on one line. First the full labels, then
 * the short labels of the crumbs in the middle, then those cut down, and
 * the current page's label last of all.
 */
export function fitCrumbs(crumbs: readonly Crumb[], room: number): string[] {
  let labels = crumbs.map(c => c.label);
  if (room <= 0 || trailWidth(labels) <= room) {
    return labels;
  }
  const middle = (i: number) => i > 0 && i < crumbs.length - 1;
  labels = crumbs.map((c, i) => (middle(i) ? c.short ?? c.label : c.label));
  const last = crumbs.length - 1;
  // Cut the longest middle label first, then the current page's.
  for (let guard = 0; trailWidth(labels) > room && guard < 200; guard++) {
    let longest = -1;
    labels.forEach((label, i) => {
      if (middle(i) && label.length > 4 && (longest < 0 || label.length > labels[longest].length)) {
        longest = i;
      }
    });
    const target = longest >= 0 ? longest : labels[last].length > 6 ? last : -1;
    if (target < 0) {
      break;
    }
    const plain = labels[target].replace(/\.\.$/, '');
    labels = labels.map((l, i) => (i === target ? cut(plain, plain.length - 1) : l));
  }
  return labels;
}

/** Pressable state; hovered and focused are only reported on the web. */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/**
 * Breadcrumbs for pushed screens: where this page sits, from its tab down.
 * Earlier levels are wooden signs that go straight back there; the last
 * one is the page itself. Always on one line: on narrow screens middle
 * crumbs get shorter instead of wrapping.
 */
export function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  const c = useTheme().colors;
  const tone = useTone();
  const playSound = useUiSound();
  const [room, setRoom] = useState(0);
  const labels = fitCrumbs(crumbs, room);
  const chevronColors = useMemo(() => ({ '#': tone.textMuted }), [tone.textMuted]);

  return (
    <View
      role="navigation"
      aria-label="Breadcrumb"
      onLayout={e => setRoom(e.nativeEvent.layout.width)}
      style={styles.row}
    >
      {crumbs.map((crumb, i) => {
        const label = labels[i] ?? crumb.label;
        const press = crumb.onPress;
        return (
          <View key={`${i}-${crumb.label}`} style={styles.item}>
            {i > 0 ? (
              <PixelArt
                rows={CHEVRON}
                colors={chevronColors}
                scale={SCALE}
                style={styles.chevron}
              />
            ) : null}
            {press ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Back to ${crumb.label}`}
                onPress={() => {
                  playSound('tap');
                  press();
                }}
                hitSlop={4}
                style={styles.target}
              >
                {(state: PressState) => (
                  <PixelBox
                    fill={state.hovered ? '#8A5A33' : c.bark}
                    outline={state.focused ? c.primary : c.outline}
                    light={state.pressed ? undefined : '#8A5A33'}
                    shade={c.barkDark}
                    shadow={c.backgroundDeep}
                    lift={state.pressed ? 0 : PX}
                    style={state.pressed ? styles.sunk : null}
                    contentStyle={styles.sign}
                  >
                    <PixelText text={label} color="#FFF4DC" accessible={false} />
                  </PixelBox>
                )}
              </Pressable>
            ) : (
              <View style={styles.here}>
                <PixelText text={label} accessible={false} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  item: { flexDirection: 'row', alignItems: 'center' },
  chevron: { marginHorizontal: GAP },
  target: { minHeight: 44, justifyContent: 'center' },
  sign: {
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  here: { minHeight: 44, justifyContent: 'center' },
  sunk: { marginTop: PX },
});
