import { StyleSheet, View } from 'react-native';
import { AppText, Button, PixelBox, useTheme, ToneContext } from '@hackyeah/ui';
import { useGame } from '../state/GameProvider';
import { useRun } from '../state/RunProvider';

/** A banner when a change could not be saved to the backend. */
export function SyncNotice() {
  const theme = useTheme();
  const game = useGame();
  const run = useRun();
  // The active mode's notice; the other pet's screens are not showing.
  const { syncError, dismissSyncError } = run.mode === 'gazelle' ? run : game;
  if (!syncError) {
    return null;
  }
  return (
    <View style={styles.wrap} accessibilityLiveRegion="assertive">
      <ToneContext.Provider
        value={{ text: theme.colors.text, textMuted: theme.colors.textMuted }}
      >
        <PixelBox
          style={styles.box}
          fill={theme.colors.dangerSoft}
          outline={theme.colors.outline}
          shadow={theme.colors.backgroundDeep}
          lift={6}
          contentStyle={styles.row}
        >
          <AppText variant="caption" style={styles.text}>
            {syncError}
          </AppText>
          <Button title="OK" small variant="secondary" onPress={dismissSyncError} />
        </PixelBox>
      </ToneContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  box: { width: '100%', maxWidth: 520 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1 },
});
