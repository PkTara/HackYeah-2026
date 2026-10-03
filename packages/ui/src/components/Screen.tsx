import type { ReactNode } from 'react';
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
              {hero}
              <View
                style={[
                  styles.content,
                  {
                    maxWidth: layout.contentMax + layout.gutter * 2,
                    padding: layout.gutter,
                    paddingTop: hero ? layout.gutter : theme.spacing.lg,
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
});
