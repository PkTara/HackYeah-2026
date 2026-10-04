import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Dolphin,
  Gazelle,
  Monkey,
  Panel,
  PixelText,
  useContentWidth,
  useTheme,
} from '@hackyeah/ui';
import { useGame } from '../state/GameProvider';
import { useSport } from '../state/SportProvider';

/**
 * Reward feedback after a quest. Plain XP shows a short toast; a level-up
 * opens a banner that stays until the climber taps it away.
 */
export function CelebrationOverlay() {
  const theme = useTheme();
  const width = useContentWidth();
  const game = useGame();
  const sport = useSport();
  const monkey = sport.mode === 'monkey';
  const { celebration, dismissCelebration, pet } = monkey ? game : sport;
  const petName = monkey ? 'monkey' : sport.view.pet;

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
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.dim,
        monkey ? null : { backgroundColor: DIM[sport.view.world] },
      ]}
    >
      <View style={{ width: Math.min(width, 420) - 32 }}>
        <Panel variant="banana" title="Level up">
          <View style={{ alignItems: 'center', gap: 12 }}>
            <PixelText
              text={`Level ${celebration.level}`}
              scale={5}
              heading
              shadow={theme.colors.primaryShade}
            />
            {sport.mode === 'gazelle' ? (
              <Gazelle
                scale={5}
                cosmetics={pet.cosmetics}
                celebrate
                accessibilityLabel="Your gazelle, leaping"
              />
            ) : sport.mode === 'dolphin' ? (
              <Dolphin
                scale={4}
                cosmetics={pet.cosmetics}
                celebrate
                accessibilityLabel="Your dolphin, leaping"
              />
            ) : (
              <Monkey
                scale={5}
                cosmetics={pet.cosmetics}
                celebrate
                accessibilityLabel="Your monkey, cheering"
              />
            )}
            <AppText style={{ textAlign: 'center' }}>
              {celebration.unlocked
                ? `Your ${petName} found a ${celebration.unlocked.toLowerCase()}. It is wearing it now.`
                : monkey
                ? 'Your monkey climbed into a new part of the canopy.'
                : sport.view.levelUp}
            </AppText>
            <Button title="Nice" onPress={dismissCelebration} />
          </View>
        </Panel>
      </View>
    </View>
  );
}

/** The level-up backdrop in each sport's world (the jungle's is in styles). */
const DIM = {
  savanna: 'rgba(20, 11, 6, 0.72)',
  ocean: 'rgba(4, 18, 30, 0.72)',
} as const;

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
