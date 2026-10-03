import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

/**
 * Page container: safe area, background, scrolling and status bar style.
 *
 * Uses React Native's built-in SafeAreaView because RNOH implements it natively
 * on Harmony. If you add react-native-safe-area-context (plus its
 * @react-native-ohos port), switch to it here and every screen follows.
 */
export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
