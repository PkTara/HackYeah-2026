import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Monkey,
  Panel,
  PixelText,
  useContentWidth,
  useTheme,
} from '@hackyeah/ui';
import { useGame } from '../state/GameProvider';

/**
 * Reward feedback after a quest. Plain XP shows a short toast; a level-up
 * opens a banner that stays until the climber taps it away.
 */
export function CelebrationOverlay() {
  const theme = useTheme();
  const width = useContentWidth();
  const { celebration, dismissCelebration, pet } = useGame();

  useEffect(() => {
    if (celebration && !celebration.level) {
      const id = setTimeout(dismissCelebration, 1800);
      return () => clearTimeout(id);
    }
  }, [celebration, dismissCelebration]);

  if (!celebration) {
    return null;
  }

  if (!celebration.level) {
    return (
      <View style={styles.toastWrap}>
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: theme.colors.primary,
            borderWidth: 3,
            borderColor: theme.colors.outline,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <PixelText
            text={`+${celebration.xp} XP`}
            scale={3}
            color={theme.colors.onPrimary}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.dim]}>
      <View style={{ width: Math.min(width, 420) - 32 }}>
        <Panel variant="banana" title="Level up">
          <View style={{ alignItems: 'center', gap: 12 }}>
            <PixelText
              text={`Level ${celebration.level}`}
              scale={5}
              heading
              shadow={theme.colors.primaryShade}
            />
            <Monkey
              scale={5}
              cosmetics={pet.cosmetics}
              celebrate
              accessibilityLabel="Your monkey, cheering"
            />
            <AppText style={{ textAlign: 'center' }}>
              {celebration.unlocked
                ? `Your monkey found a ${celebration.unlocked.toLowerCase()}. It is wearing it now.`
                : 'Your monkey climbed into a new part of the canopy.'}
            </AppText>
            <Button title="Nice" onPress={dismissCelebration} />
          </View>
        </Panel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  dim: {
    backgroundColor: 'rgba(6, 18, 11, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
