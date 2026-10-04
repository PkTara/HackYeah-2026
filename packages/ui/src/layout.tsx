import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { spacing } from './theme';

/**
 * Responsive layout for phones, tablets and desktop browsers.
 *
 * - Narrow (phones): one column, tab bar at the bottom.
 * - From RAIL_MIN wide: navigation moves to a rail on the left.
 * - Content is always one centred reading column, however wide the window.
 *   Wide screens get margins, not a second column.
 */
export const RAIL_MIN = 760;
export const RAIL_WIDTH = 216;
/** Widest the content column gets; beyond this it is centred. */
export const CONTENT_MAX = 640;

export type Layout = Readonly<{
  /** Navigation is a side rail instead of a bottom tab bar. */
  rail: boolean;
  /**
   * Always 1: every screen is one column. Kept as a field so screens that
   * once laid panels side by side keep compiling.
   */
  columns: 1 | 2;
  /** Width of the scrolling area (window minus the rail). */
  mainWidth: number;
  /** Side padding of the content inside the scrolling area. */
  gutter: number;
  /** Max width of the content column(s). */
  contentMax: number;
}>;

export function layoutFor(windowWidth: number): Layout {
  const rail = windowWidth >= RAIL_MIN;
  const mainWidth = rail ? windowWidth - RAIL_WIDTH : windowWidth;
  const gutter = rail ? spacing.xl : spacing.md;
  return { rail, columns: 1, mainWidth, gutter, contentMax: CONTENT_MAX };
}

export function useLayout(): Layout {
  return layoutFor(useWindowDimensions().width);
}

/** Width of the scrolling area, e.g. for the full-bleed jungle scene. */
export function useContentWidth(): number {
  return useLayout().mainWidth;
}

/**
 * A stack of <Column>s, one after another at every width. Put panels in
 * reading order: first column first.
 */
export function Columns({ children }: { children: ReactNode }) {
  const { columns } = useLayout();
  return (
    <View
      style={{
        flexDirection: columns === 2 ? 'row' : 'column',
        alignItems: columns === 2 ? 'flex-start' : 'stretch',
        gap: spacing.lg,
      }}
    >
      {children}
    </View>
  );
}

export function Column({ children }: { children: ReactNode }) {
  const { columns } = useLayout();
  return (
    <View
      style={[
        { gap: spacing.lg, minWidth: 0 },
        columns === 2 ? { flex: 1 } : null,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * One centred column at every width, for pages read top to bottom such as
 * the evidence behind a decision. Wide screens get margins, not columns.
 */
export function SingleColumn({ children }: { children: ReactNode }) {
  return <View style={styles.single}>{children}</View>;
}

const styles = StyleSheet.create({
  single: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignSelf: 'center',
    gap: spacing.lg,
  },
});
