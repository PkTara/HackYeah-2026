import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PetMode } from '@hackyeah/core';
import {
  AppText,
  Button,
  Dolphin,
  Gazelle,
  Monkey,
  Panel,
  PixelText,
  Tag,
} from '@hackyeah/ui';
import { useGame } from '../state/GameProvider';
import { useSport } from '../state/SportProvider';

type PetEntry = Readonly<{
  mode: PetMode;
  name: string;
  activity: string;
  /** Short button title: what you do with this pet. */
  verb: string;
  Art: ComponentType<{
    scale?: number;
    cosmetics?: readonly string[];
    still?: boolean;
  }>;
}>;

const PETS: readonly PetEntry[] = [
  {
    mode: 'monkey',
    name: 'Monkey',
    activity: 'Climbing',
    verb: 'Climb',
    Art: Monkey,
  },
  {
    mode: 'gazelle',
    name: 'Gazelle',
    activity: 'Running',
    verb: 'Run',
    Art: Gazelle,
  },
  {
    mode: 'dolphin',
    name: 'Dolphin',
    activity: 'Swimming',
    verb: 'Swim',
    Art: Dolphin,
  },
];

/**
 * One pet per sport, on every profile. The active pet is tagged; tapping
 * another switches the whole app to its sport and world.
 */
export function PetsPanel() {
  const { pet: monkey } = useGame();
  const { mode, setMode, pets } = useSport();
  const statusOf = (m: PetMode) =>
    m === 'monkey' ? monkey : m === 'gazelle' ? pets.run : pets.swim;

  return (
    <Panel title="Pets">
      <View style={styles.row}>
        {PETS.map(({ mode: m, name, activity, verb, Art }) => {
          const status = statusOf(m);
          return (
            <View key={m} style={styles.pet}>
              <View style={styles.art}>
                <Art scale={2} cosmetics={status.cosmetics} still />
              </View>
              <PixelText text={name} />
              <AppText variant="caption" muted style={styles.center}>
                {activity}
                {'\n'}Level {status.level}
              </AppText>
              {m === mode ? (
                // Wrapped so the tag centres like the rest of the column.
                <View>
                  <Tag text="Active" tone="new" />
                </View>
              ) : (
                <Button
                  title={verb}
                  variant="secondary"
                  small
                  onPress={() => setMode(m)}
                  accessibilityLabel={`Switch to ${name.toLowerCase()} mode`}
                />
              )}
            </View>
          );
        })}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pet: { flex: 1, alignItems: 'center', gap: 6 },
  art: { height: 60, justifyContent: 'flex-end' },
  center: { textAlign: 'center' },
});
