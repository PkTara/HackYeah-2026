import type { ReactNode } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../theme';
import { ToneContext } from '../tone';

/** Phones use the full width; wider windows get a phone-sized column. */
export const MAX_WIDTH = 480;

export function useContentWidth(): number {
  return Math.min(useWindowDimensions().width, MAX_WIDTH);
}

type Props = {
  children: ReactNode;
  /** Full-bleed block above the padded content, e.g. the jungle scene. */
  hero?: ReactNode;
  /** Pinned under the scroll area, e.g. the tab bar. */
  footer?: ReactNode;
};

/**
 * Page container: safe area, background, scrolling and status bar style.
 *
 * Uses React Native's built-in SafeAreaView because RNOH implements it natively
 * on Harmony. If you add react-native-safe-area-context (plus its
 * @react-native-ohos port), switch to it here and every screen follows.
 */
export function Screen({ children, hero, footer }: Props) {
  const theme = useTheme();
  const width = useContentWidth();
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.backgroundDeep }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.backgroundDeep}
      />
      <View
        style={[
          styles.column,
          { width, backgroundColor: theme.colors.background },
        ]}
      >
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
              style={{
                padding: theme.spacing.md,
                paddingTop: hero ? theme.spacing.md : theme.spacing.lg,
                gap: theme.spacing.lg,
              }}
            >
              {children}
            </View>
          </ScrollView>
        </ToneContext.Provider>
        {footer}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1 },
});
