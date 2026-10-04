import { createContext, useContext, type ReactNode } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useLayout } from '../layout';
import { useTheme } from '../theme';
import { ToneContext } from '../tone';
import { ICON_BUTTON_SIZE } from './IconButton';

/**
 * Something the app pins to the top-right corner of every page, the same on
 * every screen: the music button. Null for none. It scrolls with the page,
 * so it never sits on top of content further down.
 */
export const ScreenCornerContext = createContext<ReactNode>(null);

/** Gap between the corner control and the right edge, in px. */
const CORNER_INSET = 4;

/**
 * Width to keep free at the right end of a hero's top row, so nothing goes
 * under the corner control. 0 when there is none.
 */
export function useCornerReserve(): number {
  return useContext(ScreenCornerContext) ? ICON_BUTTON_SIZE + CORNER_INSET : 0;
}

type Props = {
  children: ReactNode;
  /** Full-bleed block above the padded content, e.g. the jungle scene. */
  hero?: ReactNode;
  /** Bottom navigation, shown on phones and narrow windows. */
  footer?: ReactNode;
  /** Side navigation, shown instead of the footer on wide screens. */
  rail?: ReactNode;
};

/**
 * Page container: safe area, background, scrolling, status bar style and the
 * phone or desktop frame (bottom tab bar or side rail, see layout.tsx).
 *
 * Uses React Native's built-in SafeAreaView, which needs no extra native
 * dependency. If you add react-native-safe-area-context, switch to it here and
 * every screen follows.
 */
export function Screen({ children, hero, footer, rail }: Props) {
  const theme = useTheme();
  const layout = useLayout();
  const showRail = layout.rail && rail;
  const corner = useContext(ScreenCornerContext);
  // Pages without a hero start with their title; push it below the corner
  // control so a long title or trail never runs under it.
  const top = hero
    ? layout.gutter
    : corner
      ? Math.max(theme.spacing.lg, ICON_BUTTON_SIZE + CORNER_INSET)
      : theme.spacing.lg;
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.backgroundDeep}
      />
      <View style={[styles.frame, showRail ? styles.row : null]}>
        {showRail ? rail : null}
        <View style={styles.main}>
          <ToneContext.Provider
            value={{
              text: theme.colors.onBackground,
              textMuted: theme.colors.onBackgroundMuted,
            }}
          >
            <ScrollView
              contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
            >
              {/* First in reading and tab order, drawn above the hero. */}
              {corner ? <View style={styles.corner}>{corner}</View> : null}
              {hero}
              <View
                style={[
                  styles.content,
                  {
                    maxWidth: layout.contentMax + layout.gutter * 2,
                    padding: layout.gutter,
                    paddingTop: top,
                    gap: theme.spacing.lg,
                  },
                ]}
              >
                {children}
              </View>
            </ScrollView>
          </ToneContext.Provider>
          {showRail ? null : footer}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { flex: 1 },
  row: { flexDirection: 'row' },
  main: { flex: 1 },
  content: { width: '100%', alignSelf: 'center' },
  corner: { position: 'absolute', top: 0, right: CORNER_INSET, zIndex: 1 },
});
