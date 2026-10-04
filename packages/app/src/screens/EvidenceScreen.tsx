import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  MIN_LOGS,
  explainFocus,
  explainTerrain,
  explainMovement,
  MOVEMENTS,
  TERRAINS,
  ageLabel,
  cellTally,
  shortDate,
  terrainTallies,
  type ClimbLog,
  type Movement,
  type Terrain,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Chip,
  Column,
  Columns,
  Icon,
  PX,
  Panel,
  PixelText,
  Tag,
  useTheme,
} from '@hackyeah/ui';
import { DecisionHelp } from '../components/DecisionHelp';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import {
  MOVEMENT_NAME,
  TERRAIN_ICON,
  TERRAIN_NAME,
  holdsText,
  styleText,
} from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

/**
 * The climbs behind one corner of the terrain triangle, so every statement
 * on the profile can be checked against what was actually logged.
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function EvidenceScreen() {
  const { params, reset } = useNavigation<RouteName>();
  const { state, today, focus } = useGame();
  const [terrain, setTerrain] = useState<Terrain>(
    () => TERRAINS.find(t => t === params.terrain) ?? focus.terrain,
  );

  const name = TERRAIN_NAME[terrain];
  const tally = terrainTallies(state.logs)[terrain];
  const isFocus = focus.terrain === terrain;
  const toGo = MIN_LOGS - tally.logged;
  // Newest first. Logs are stored in the order they were added.
  const climbs = state.logs
    .filter(log => log.terrain === terrain)
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Evidence"
        subtitle="The climbs behind each wall on your profile."
      />

      <View style={styles.switcher}>
        {TERRAINS.map(t => (
          <View key={t} style={styles.grow}>
            <Chip
              tall
              icon={TERRAIN_ICON[t]}
              label={TERRAIN_NAME[t]}
              selected={t === terrain}
              onPress={() => setTerrain(t)}
            />
          </View>
        ))}
      </View>

      {/* Wide screens: the numbers on the left, the climbs behind them on
          the right. */}
      <Columns>
        <Column>
          <Panel
            title={name}
            icon={TERRAIN_ICON[terrain]}
            badge={isFocus ? <Tag text="Your focus" tone="focus" /> : undefined}
          >
            <PixelText
              text={
                tally.logged === 0
                  ? 'None logged'
                  : `${tally.sent} of ${tally.logged} sent`
              }
              scale={4}
            />
            <DecisionHelp
              label={`${name} tally`}
              explanation={explainTerrain(terrain, state.logs)}
            />
            {isFocus ? (
              <DecisionHelp
                label="evidence focus"
                explanation={explainFocus(focus, state.logs)}
              />
            ) : null}
            {tally.rate === null ? (
              <AppText>
                Needs {toGo} more logged {toGo === 1 ? 'climb' : 'climbs'}{' '}
                before it is compared with the other walls.
              </AppText>
            ) : null}
            {isFocus ? (
              <AppText>
                {focus.kind === 'practice'
                  ? 'This is your focus: the lowest share of sends of the three walls.'
                  : 'This is your focus: it has the fewest logged climbs, so the monkey asks for more here first.'}
              </AppText>
            ) : null}
            {climbs.length > 0 ? (
              <AppText variant="caption" muted>
                Last logged {ageLabel(climbs[0].date, today)},{' '}
                {shortDate(climbs[0].date)}.
              </AppText>
            ) : null}
            <AppText variant="caption" muted>
              The focus goes to the wall with the lowest share of sends once
              every wall has at least {MIN_LOGS} logged climbs.
            </AppText>
          </Panel>

          <Panel title="Wall x style">
            <StyleGrid logs={state.logs} selected={terrain} />
            {MOVEMENTS.flatMap(m =>
              TERRAINS.map(t => (
                <DecisionHelp
                  key={`${m}-${t}`}
                  label={`${MOVEMENT_NAME[m]} ${TERRAIN_NAME[t]} cell`}
                  explanation={cellExplanation(t, m, state.logs)}
                />
              )),
            )}
            <AppText variant="caption" muted>
              Each box shows sent / logged. A dash means none logged yet. The
              framed column is {name.toLowerCase()}.
            </AppText>
          </Panel>
        </Column>

        <Column>
          <Panel title="Climbs" icon="log">
            {climbs.length === 0 ? (
              <AppText>No {name.toLowerCase()} climbs logged yet.</AppText>
            ) : (
              climbs.map(log => <ClimbRow key={log.id} log={log} />)
            )}
            <Button
              title="Log a climb"
              icon="log"
              onPress={() => reset('Log')}
            />
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
  );
}

/**
 * Terrain x style grid. Rows are styles, columns are walls, and each box
 * counts sent / logged climbs for that mix. Plain Views: the outline colour
 * shows through 3px gaps, which draws the grid lines.
 */
function StyleGrid({
  logs,
  selected,
}: {
  logs: readonly ClimbLog[];
  selected: Terrain;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.grid, { backgroundColor: c.outline }]}>
      {/* Every box below has its own full label, so the headings are skipped
          by screen readers. */}
      <View
        style={styles.gridRow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={[styles.rowLabel, { backgroundColor: c.surfaceShade }]} />
        {TERRAINS.map(t => {
          const ink = t === selected ? c.onPrimary : c.text;
          return (
            <Cell
              key={t}
              fill={c.surfaceShade}
              selected={t === selected}
              edge="top"
            >
              <Icon name={TERRAIN_ICON[t]} color={ink} />
              <AppText variant="caption" style={{ color: ink }}>
                {TERRAIN_NAME[t]}
              </AppText>
            </Cell>
          );
        })}
      </View>

      {MOVEMENTS.map((m, row) => (
        <View key={m} style={styles.gridRow}>
          <View
            style={[styles.rowLabel, { backgroundColor: c.surfaceShade }]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <AppText variant="caption">{MOVEMENT_NAME[m]}</AppText>
          </View>
          {TERRAINS.map(t => {
            const tally = cellTally(logs, t, m);
            const isSelected = t === selected;
            const ink = isSelected ? c.onPrimary : c.text;
            const what = `${MOVEMENT_NAME[m]} ${TERRAIN_NAME[t].toLowerCase()}`;
            return (
              <Cell
                key={t}
                fill={c.surface}
                selected={isSelected}
                edge={row === MOVEMENTS.length - 1 ? 'bottom' : undefined}
                label={
                  tally.logged === 0
                    ? `${what}: none yet`
                    : `${what}: ${tally.sent} of ${tally.logged} sent`
                }
              >
                {tally.logged === 0 ? (
                  <View
                    style={[
                      styles.empty,
                      { borderColor: isSelected ? c.onPrimary : c.textMuted },
                    ]}
                  >
                    <View
                      style={[
                        styles.dash,
                        {
                          backgroundColor: isSelected
                            ? c.onPrimary
                            : c.textMuted,
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <PixelText
                    text={`${tally.sent}/${tally.logged}`}
                    scale={tally.logged > 9 ? 2 : 3}
                    color={ink}
                    accessible={false}
                  />
                )}
              </Cell>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * One box of the grid. The selected wall's column is banana and also gets a
 * thicker frame, so it does not depend on colour alone.
 */
function Cell({
  fill,
  selected,
  edge,
  label,
  children,
}: {
  fill: string;
  selected: boolean;
  /** Which end of the column this box sits at, for the thick frame. */
  edge?: 'top' | 'bottom';
  /** Screen reader text for the box. */
  label?: string;
  children: ReactNode;
}) {
  const { colors: c } = useTheme();
  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label ? 'text' : undefined}
      accessibilityLabel={label}
      style={[
        styles.cell,
        edge === 'top' ? styles.headCell : styles.dataCell,
        {
          backgroundColor: selected ? c.primary : fill,
          borderColor: c.outline,
        },
        selected && styles.frameSides,
        selected && edge === 'top' && styles.frameTop,
        selected && edge === 'bottom' && styles.frameBottom,
      ]}
    >
      {children}
    </View>
  );
}

function ClimbRow({ log }: { log: ClimbLog }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.climb}>
      <View
        style={[
          styles.grade,
          { backgroundColor: c.surfaceShade, borderColor: c.outline },
        ]}
      >
        <PixelText text={log.grade} scale={3} />
      </View>
      <View style={styles.grow}>
        <AppText>{capitalize(styleText(log.movements))}</AppText>
        {log.holds.length > 0 ? (
          <AppText variant="caption" muted>
            {capitalize(holdsText(log.holds))}
          </AppText>
        ) : null}
        <AppText variant="caption" muted>
          {shortDate(log.date)}
        </AppText>
      </View>
      {/* Wrapped so the tag centres on the row instead of the top edge. */}
      <View>
        <Tag
          text={log.sent ? 'Sent' : 'Not yet'}
          tone={log.sent ? 'new' : 'muted'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  grid: { padding: PX, gap: PX },
  gridRow: { flexDirection: 'row', gap: PX },
  rowLabel: { width: 84, justifyContent: 'center', paddingHorizontal: 8 },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  headCell: { paddingVertical: 8, gap: 4 },
  dataCell: { minHeight: 64 },
  frameSides: { borderLeftWidth: PX, borderRightWidth: PX },
  frameTop: { borderTopWidth: PX },
  frameBottom: { borderBottomWidth: PX },
  empty: {
    width: 36,
    height: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dash: { width: PX * 4, height: PX },
  climb: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grade: {
    width: 48,
    height: 48,
    borderWidth: PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Both filters define a wall/style cell; keep the full matching records. */
function cellExplanation(
  terrain: Terrain,
  movement: Movement,
  logs: readonly ClimbLog[],
) {
  const explanation = explainMovement(
    movement,
    logs.filter(log => log.terrain === terrain),
  );
  return {
    ...explanation,
    summary: `${TERRAIN_NAME[terrain]} / ${MOVEMENT_NAME[movement]}: ${explanation.summary}`,
    rule: `First filter terrain=${terrain}; then ${explanation.rule}`,
  };
}
