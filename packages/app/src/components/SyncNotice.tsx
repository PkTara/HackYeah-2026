import { StyleSheet, View } from 'react-native';
import { AppText, Button, PixelBox, useTheme, ToneContext } from '@hackyeah/ui';
import { useGame } from '../state/GameProvider';

/** A banner when a change could not be saved to the backend. */
export function SyncNotice() {
  const theme = useTheme();
  const { syncError, dismissSyncError } = useGame();
  if (!syncError) {
    return null;
  }
  return (
    <View style={styles.wrap} accessibilityLiveRegion="assertive">
      <ToneContext.Provider
        value={{ text: theme.colors.text, textMuted: theme.colors.textMuted }}
      >
        <PixelBox
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
  wrap: { position: 'absolute', top: 12, left: 12, right: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1 },
});
