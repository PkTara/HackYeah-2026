import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { spacing } from './theme';

/**
 * Responsive layout for phones, tablets and desktop browsers.
 *
 * - Narrow (phones): one column, tab bar at the bottom.
 * - From RAIL_MIN wide: navigation moves to a rail on the left.
 * - When the area next to the rail fits two readable columns, screens that
 *   use <Columns> put their panels side by side.
 */
export const RAIL_MIN = 760;
export const RAIL_WIDTH = 216;
/** Narrowest a column of panels may get (fits the terrain triangle). */
const COLUMN_MIN = 360;
/** Widest the content gets; beyond this it is centred. */
export const CONTENT_MAX = 1180;
const SINGLE_MAX = 640;

export type Layout = Readonly<{
  /** Navigation is a side rail instead of a bottom tab bar. */
  rail: boolean;
  /** 1 on phones and narrow windows, 2 on wide ones. */
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
  const usable = Math.min(mainWidth, CONTENT_MAX) - gutter * 2;
  const columns = rail && usable >= COLUMN_MIN * 2 + spacing.lg ? 2 : 1;
  return {
    rail,
    columns,
    mainWidth,
    gutter,
    contentMax: columns === 2 ? CONTENT_MAX : SINGLE_MAX,
  };
}

export function useLayout(): Layout {
  return layoutFor(useWindowDimensions().width);
}

/** Width of the scrolling area, e.g. for the full-bleed jungle scene. */
export function useContentWidth(): number {
  return useLayout().mainWidth;
}

/**
 * Side-by-side <Column>s on wide screens, one stack on phones. On phones the
 * columns simply follow each other, so put panels in the order a phone
 * should show them: left column first.
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
