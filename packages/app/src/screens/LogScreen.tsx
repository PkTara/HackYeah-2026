import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  MOVEMENTS,
  TERRAINS,
  type ClimbLog,
  type Movement,
  type Terrain,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Chip,
  Icon,
  PX,
  Panel,
  PixelBox,
  PixelText,
  Tag,
  useTheme,
} from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { GRADES, MOVEMENT_NAME, TERRAIN_ICON, TERRAIN_NAME } from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

/** How long "Saved: ..." stays under the button. */
const CONFIRM_MS = 2500;

type Draft = Omit<ClimbLog, 'id' | 'date'>;

/** "V3 vertical" */
function climbName(log: Pick<ClimbLog, 'grade' | 'terrain'>) {
  return `${log.grade} ${TERRAIN_NAME[log.terrain].toLowerCase()}`;
}

/** "V3 vertical, dynamic" */
function describe(log: ClimbLog) {
  return `${climbName(log)}, ${MOVEMENT_NAME[log.movement].toLowerCase()}`;
}

/**
 * Post-session check-in: pick wall, moves, grade and result, then save.
 * The profile builds the terrain triangle and movement tallies from these.
 */
export function LogScreen() {
  const { reset } = useNavigation<RouteName>();
  const { haptics } = useCapabilities();
  const { state, today, logClimb, removeClimb } = useGame();

  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const [movement, setMovement] = useState<Movement | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [sent, setSent] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);

  // Hide the "Saved" line after a moment. Each save restarts the timer.
  useEffect(() => {
    if (!saved) {
      return;
    }
    const timer = setTimeout(() => setSaved(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  const draft: Draft | null =
    terrain && movement && grade && sent !== null
      ? { terrain, movement, grade, sent }
      : null;
  const missing = [
    !terrain && 'wall',
    !movement && 'moves',
    !grade && 'grade',
    sent === null && 'result',
  ].filter(Boolean);

  const save = () => {
    if (!draft) {
      return;
    }
    logClimb(draft);
    haptics.tap();
    setSaved(draft);
    // Wall, moves and grade stay picked: the next climb is often similar.
    setSent(null);
  };

  const todays = state.logs.filter(log => log.date === today).reverse();

  return (
    <TabScreen>
      <PageHeader title="Log" subtitle="Tap through it between climbs." />

      <Panel title="Log a climb">
        <View style={styles.form}>
          <Group label="Wall">
            <View style={styles.row}>
              {TERRAINS.map(t => (
                <WallTile
                  key={t}
                  terrain={t}
                  selected={terrain === t}
                  onPress={() => setTerrain(t)}
                />
              ))}
            </View>
          </Group>

          <Group label="Moves">
            <View style={styles.row}>
              {MOVEMENTS.map(m => (
                <View key={m} style={styles.cell}>
                  <Chip
                    label={MOVEMENT_NAME[m]}
                    selected={movement === m}
                    onPress={() => setMovement(m)}
                  />
                </View>
              ))}
            </View>
            <AppText variant="caption" muted>
              Controlled is steady, hold to hold. Dynamic uses momentum, like
              jumps and dynos.
            </AppText>
          </Group>

          <Group label="Grade">
            <View style={[styles.row, styles.wrap]}>
              {GRADES.map(g => (
                <View key={g} style={styles.gradeCell}>
                  <Chip
                    label={g}
                    selected={grade === g}
                    onPress={() => setGrade(g)}
                  />
                </View>
              ))}
            </View>
          </Group>

          <Group label="Result">
            <View style={styles.row}>
              <View style={styles.cell}>
                <Chip
                  label="Sent"
                  selected={sent === true}
                  onPress={() => setSent(true)}
                />
              </View>
              <View style={styles.cell}>
                <Chip
                  label="Not yet"
                  selected={sent === false}
                  onPress={() => setSent(false)}
                />
              </View>
            </View>
          </Group>
        </View>

        <Button
          title="Save climb"
          icon="check"
          disabled={!draft}
          onPress={save}
          accessibilityHint={
            draft ? undefined : `Still to pick: ${missing.join(', ')}`
          }
        />
        {/* Fixed height, so the list below does not jump as this changes. */}
        <View style={styles.status}>
          {/* Screen readers announce the confirmation when it appears. */}
          <View accessibilityLiveRegion="polite">
            {saved ? (
              <View style={styles.inline}>
                <Icon name="check" />
                <AppText variant="caption">
                  Saved: {climbName(saved)},{' '}
                  {saved.sent ? 'sent' : 'not sent yet'}.
                </AppText>
              </View>
            ) : null}
          </View>
          {!saved && missing.length > 0 ? (
            <AppText variant="caption" muted>
              Still to pick: {missing.join(', ')}.
            </AppText>
          ) : null}
        </View>
      </Panel>

      <Panel title="Today" icon="log">
        {todays.length === 0 ? (
          <AppText>No climbs logged today yet.</AppText>
        ) : (
          todays.map(log => (
            <View key={log.id} style={styles.inline}>
              <Icon name={TERRAIN_ICON[log.terrain]} />
              <View style={styles.rowText}>
                <AppText>{describe(log)}</AppText>
                <Tag
                  text={log.sent ? 'Sent' : 'Not yet'}
                  tone={log.sent ? 'new' : 'muted'}
                />
              </View>
              <Button
                title="Remove"
                variant="secondary"
                small
                accessibilityLabel={`Remove ${describe(log)}`}
                onPress={() => removeClimb(log.id)}
              />
            </View>
          ))
        )}
      </Panel>

      <Panel variant="quiet">
        <View style={styles.inline}>
          <AppText style={styles.grow}>Fingers feeling it?</AppText>
          <Button
            title="Check hands"
            variant="secondary"
            small
            onPress={() => reset('Hands')}
            accessibilityHint="Opens the Hands tab"
          />
        </View>
      </Panel>
    </TabScreen>
  );
}

/** A labelled set of chips inside the form. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <PixelText text={label} />
      {children}
    </View>
  );
}

/**
 * Big wall picture with its name underneath, styled like a Chip. A tall Chip
 * puts the name inside the box, and "Overhang" does not fit in a third of a
 * phone screen.
 */
function WallTile({
  terrain,
  selected,
  onPress,
}: {
  terrain: Terrain;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={TERRAIN_NAME[terrain]}
      aria-selected={selected}
      onPress={onPress}
      style={styles.tile}
    >
      {({ pressed }) => {
        const down = pressed || selected;
        return (
          <>
            <PixelBox
              fill={selected ? colors.primary : colors.surface}
              outline={colors.outline}
              light={selected ? undefined : colors.surfaceLight}
              shade={selected ? undefined : colors.surfaceShade}
              shadow={colors.backgroundDeep}
              lift={down ? 0 : PX}
              style={down ? styles.tileDown : undefined}
              contentStyle={styles.tileBox}
            >
              <Icon
                name={TERRAIN_ICON[terrain]}
                scale={4}
                color={selected ? colors.onPrimary : colors.text}
              />
            </PixelBox>
            <PixelText
              text={TERRAIN_NAME[terrain]}
              accessible={false}
              style={styles.tileLabel}
            />
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  cell: { flex: 1 },
  // Four grades per row on any phone width.
  gradeCell: { flexBasis: '20%', flexGrow: 1 },
  tile: { flex: 1, gap: 6 },
  tileBox: { minHeight: 44, paddingVertical: 10, alignItems: 'center' },
  // Pressed or picked: the box drops onto its shadow, like Chip.
  tileDown: { marginTop: PX },
  tileLabel: { alignSelf: 'center' },
  status: { minHeight: 24, justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 4 },
  grow: { flex: 1 },
});
