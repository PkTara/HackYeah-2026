import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  HOLD_TYPES,
  MOVEMENTS,
  TERRAINS,
  type ClimbLog,
  type Focus,
  type HoldType,
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
  useTheme,
} from '@hackyeah/ui';
import { climbSaved } from '../afterSave';
import { useCapabilities } from '../capabilities';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { SavedNote } from '../components/SavedNote';
import { TabScreen } from '../components/TabScreen';
import {
  GRADES,
  HOLD_ICON,
  HOLD_NAME,
  MOVEMENT_HINT,
  MOVEMENT_NAME,
  TERRAIN_ICON,
  TERRAIN_NAME,
} from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

type Draft = Omit<ClimbLog, 'id' | 'date'>;

/** Adds the item if missing, removes it if present. */
function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter(x => x !== item) : [...list, item];
}

/**
 * Log > Log a climb. Post-session check-in: pick wall, style, holds, grade
 * and result, then save. The profile builds the terrain triangle and style
 * tallies from these. After a save, a note says what changed and points to
 * your climbs, with the new one framed, and to the profile; it stays until
 * the next climb is started.
 */
export function LogClimbScreen() {
  const { haptics } = useCapabilities();
  const { reset, openTrail } = useNavigation<RouteName>();
  const { state, focus, logClimb } = useGame();

  const [terrain, setTerrain] = useState<Terrain | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [lastStyle, setLastStyle] = useState<Movement | null>(null);
  const [holds, setHolds] = useState<HoldType[]>([]);
  const [grade, setGrade] = useState<string | null>(null);
  const [sent, setSent] = useState<boolean | null>(null);
  // The last save and the focus before it, until the next climb starts.
  const [saved, setSaved] = useState<{
    id: string;
    draft: Draft;
    before: Focus;
  } | null>(null);

  const draft: Draft | null =
    terrain && movements.length > 0 && grade && sent !== null
      ? { terrain, movements, holds, grade, sent }
      : null;
  const missing = [
    !terrain && 'wall',
    movements.length === 0 && 'style',
    !grade && 'grade',
    sent === null && 'result',
  ].filter(Boolean);

  /** Any change starts the next climb, so the last save's note goes. */
  const change = (apply: () => void) => {
    setSaved(null);
    apply();
  };

  const save = () => {
    if (!draft) {
      return;
    }
    const id = logClimb(draft);
    haptics.tap();
    setSaved({ id, draft, before: focus });
    // Everything but the result stays picked: the next climb is often similar.
    setSent(null);
  };

  const message = saved
    ? climbSaved(saved.draft, state.logs, saved.before, focus)
    : null;

  return (
    <TabScreen single>
      <Crumbs />
      <PageHeader
        title="Log a climb"
        subtitle="One climb at a time. Each one updates your walls, styles and focus."
      />

      <Panel title="This climb">
        <View style={styles.form}>
          <Group label="Wall" need="Pick one">
            <View style={styles.row}>
              {TERRAINS.map(t => (
                <WallTile
                  key={t}
                  terrain={t}
                  selected={terrain === t}
                  onPress={() => change(() => setTerrain(t))}
                />
              ))}
            </View>
          </Group>

          <Group label="Style" need="Pick all that apply">
            <View style={[styles.row, styles.wrap]}>
              {MOVEMENTS.map(m => (
                <View key={m} style={styles.styleCell}>
                  <Chip
                    label={MOVEMENT_NAME[m]}
                    selected={movements.includes(m)}
                    onPress={() =>
                      change(() => {
                        setLastStyle(m);
                        setMovements(list => toggle(list, m));
                      })
                    }
                  />
                </View>
              ))}
            </View>
            <AppText variant="caption" muted>
              {lastStyle
                ? MOVEMENT_HINT[lastStyle]
                : 'Tap a style to see what it means.'}
            </AppText>
          </Group>

          <Group label="Holds" need="Optional">
            <View style={[styles.row, styles.wrap]}>
              {HOLD_TYPES.map(h => (
                <View key={h} style={styles.holdCell}>
                  <Chip
                    label={HOLD_NAME[h]}
                    icon={HOLD_ICON[h]}
                    selected={holds.includes(h)}
                    onPress={() =>
                      change(() => setHolds(list => toggle(list, h)))
                    }
                  />
                </View>
              ))}
            </View>
          </Group>

          <Group label="Grade" need="Pick one">
            <View style={[styles.row, styles.wrap]}>
              {GRADES.map(g => (
                <View key={g} style={styles.gradeCell}>
                  <Chip
                    label={g}
                    selected={grade === g}
                    onPress={() => change(() => setGrade(g))}
                  />
                </View>
              ))}
            </View>
          </Group>

          <Group label="Result" need="Pick one">
            <View style={styles.row}>
              <View style={styles.cell}>
                <Chip
                  label="Sent"
                  selected={sent === true}
                  onPress={() => change(() => setSent(true))}
                />
              </View>
              <View style={styles.cell}>
                <Chip
                  label="Not yet"
                  selected={sent === false}
                  onPress={() => change(() => setSent(false))}
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
        {saved && message ? (
          <SavedNote
            title={message.title}
            lines={message.lines}
            next={[
              {
                title: 'See your climbs',
                onPress: () =>
                  openTrail([{ route: 'Log', params: { saved: saved.id } }]),
              },
              {
                title: 'See profile',
                accessibilityLabel: 'See your profile',
                onPress: () => reset('Profile'),
              },
            ]}
          />
        ) : (
          <AppText variant="caption" muted>
            {missing.length > 0
              ? `Still to pick: ${missing.join(', ')}.`
              : 'Ready to save.'}
          </AppText>
        )}
      </Panel>
    </TabScreen>
  );
}

/** A labelled set of chips inside the form, with how many to pick. */
function Group({
  label,
  need,
  children,
}: {
  label: string;
  need: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <PixelText text={label} />
        <AppText variant="caption" muted>
          {need}
        </AppText>
      </View>
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
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  cell: { flex: 1 },
  // Two styles per row, leaving room for the longer names.
  styleCell: { flexBasis: '40%', flexGrow: 1 },
  // Four grades per row on any phone width.
  gradeCell: { flexBasis: '20%', flexGrow: 1 },
  // Two hold types per row: "Volume" plus its icon needs the room.
  holdCell: { flexBasis: '40%', flexGrow: 1 },
  tile: { flex: 1, gap: 6 },
  tileBox: { minHeight: 44, paddingVertical: 10, alignItems: 'center' },
  // Pressed or picked: the box drops onto its shadow, like Chip.
  tileDown: { marginTop: PX },
  tileLabel: { alignSelf: 'center' },
});
