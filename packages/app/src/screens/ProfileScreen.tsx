import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import {
  MOVEMENTS,
  explainFocus,
  explainQuest,
  explainPause,
  explainTerrain,
  explainMovement,
  TERRAINS,
  XP_PER_LEVEL,
  XP_PER_QUEST,
  movementTallies,
  shortDate,
  terrainTallies,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Column,
  Columns,
  Disclosure,
  Icon,
  JungleHero,
  Meter,
  MovementRadar,
  PX,
  Panel,
  Pips,
  PixelText,
  SampleMark,
  Tag,
  TerrainTriangle,
  WarningSign,
  spacing,
  useContentWidth,
  useLayout,
  useTheme,
  type MovementAxis,
} from '@hackyeah/ui';
import {
  explainXP,
  explainExampleRadar,
} from '../components/resultExplanations';
import { DecisionHelp } from '../components/DecisionHelp';
import { DataRow } from '../components/DataRow';
import { TabScreen } from '../components/TabScreen';
import {
  MOVEMENT_NAME,
  TERRAIN_ICON,
  TERRAIN_NAME,
  fingerLabel,
  flagText,
} from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';
import { ActivitySummary } from './ActivityScreen';
import { AssessmentSummary } from '../components/AssessmentSummary';
import { PetsPanel } from '../components/PetsPanel';
import { StateLabel } from '../components/StateLabel';

const STEPS = XP_PER_LEVEL / XP_PER_QUEST;

// Illustrative values; their provenance is available in the radar explanation.
const EXAMPLE_MOVES: readonly MovementAxis[] = [
  { label: 'Footwork', value: 0.45 },
  { label: 'Balance', value: 0.75 },
  { label: 'Tension', value: 0.55 },
  { label: 'Stamina', value: 0.6 },
  { label: 'Dynos', value: 0.35 },
];

export function ProfileScreen() {
  const theme = useTheme();
  const width = useContentWidth();
  const { navigate, reset } = useNavigation<RouteName>();
  const { state, today, focus, quest, pet, completeQuest, skipQuest } =
    useGame();
  const wide = useLayout().columns === 2;

  const terrain = terrainTallies(state.logs);
  const moves = movementTallies(state.logs);
  const questsToGo = STEPS - pet.xpInLevel / XP_PER_QUEST;
  const recent = [...state.logs].reverse().slice(0, 4);

  // Recent climbs. Wide screens show them under the quest, so both columns
  // end at about the same height. Phones keep them after Style.
  const recentPanel = (
    <Panel title="Your records" icon="log">
      <AppText variant="caption" muted>
        What this profile is built from. Add more on the Data tab.
      </AppText>
      <View>
        <DataRow
          title="Recent climbs"
          subtitle={
            recent.length
              ? `${state.logs.length} climbs. Latest ${
                  recent[0].grade
                } ${TERRAIN_NAME[recent[0].terrain].toLowerCase()}, ${shortDate(
                  recent[0].date,
                )}`
              : 'No climbs logged yet.'
          }
          accessibilityLabel="Open climbing log"
          onPress={() => reset('Log')}
        />
        <AssessmentSummary
          compact
          onOpen={metric => navigate('MeasurementDetail', { metric })}
          records={state.assessments}
          metrics={[
            'leg_spread',
            'shoulder_reach_left',
            'shoulder_reach_right',
            'finger_force',
          ]}
        />
        <ActivitySummary hideUnavailable divider={false} />
      </View>
      <Button
        title="Add data"
        variant="secondary"
        small
        onPress={() => reset('Data')}
      />
    </Panel>
  );

  return (
    <TabScreen
      hero={
        <JungleHero
          width={width}
          title={'Climbing\nMonkey'}
          step={pet.xpInLevel / XP_PER_QUEST}
          steps={STEPS}
          cosmetics={pet.cosmetics}
          cheerKey={pet.xp}
        />
      }
    >
      {/* Monkey level and XP */}
      <Panel variant="wood">
        <DecisionHelp
          label="XP and level"
          explanation={explainXP(state.completed)}
        >
          <PixelText text={`Lvl ${pet.level}`} scale={4} heading />
        </DecisionHelp>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Meter
              value={pet.xpInLevel / XP_PER_QUEST}
              segments={STEPS}
              accessibilityLabel={`${
                pet.xpInLevel
              } of ${XP_PER_LEVEL} XP to level ${pet.level + 1}`}
            />
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <AppText variant="caption">
                {pet.xpInLevel} / {XP_PER_LEVEL} XP
              </AppText>
              <AppText variant="caption" muted>
                {questsToGo === 1
                  ? '1 quest to level up'
                  : `${questsToGo} quests to level up`}
              </AppText>
            </View>
          </View>
        </View>
      </Panel>

      {/* Wide screens: what to do next on the left, the climbing profile on
          the right. Phones stack the left column first, so the order there
          stays the same. */}
      <Columns>
        <Column>
          {/* The one thing to work on */}
          <Panel variant="banana" title="Your focus">
            <DecisionHelp
              label="Focus"
              explanation={explainFocus(focus, state.logs)}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Icon name={TERRAIN_ICON[focus.terrain]} scale={3} />
                <PixelText
                  text={TERRAIN_NAME[focus.terrain]}
                  scale={4}
                  heading
                />
              </View>
            </DecisionHelp>

            {focus.kind === 'practice' ? (
              <AppText>
                You sent {focus.tally.sent} of the {focus.tally.logged}{' '}
                {TERRAIN_NAME[focus.terrain].toLowerCase()} climbs you logged.
                That is your lowest of the three walls.
              </AppText>
            ) : (
              <AppText>
                Only {focus.tally.logged}{' '}
                {TERRAIN_NAME[focus.terrain].toLowerCase()}{' '}
                {focus.tally.logged === 1 ? 'climb' : 'climbs'} logged. Log 3
                and the monkey can compare it with the other walls.
              </AppText>
            )}
            <AppText variant="caption" muted>
              {state.assigned !== undefined
                ? 'From your logged climbs only. Independent of server quest selection, so the quest below can differ.'
                : 'From your logged climbs only. Not a grade prediction.'}
            </AppText>
            <Button
              title="View evidence"
              variant="secondary"
              small
              onPress={() => navigate('Evidence', { terrain: focus.terrain })}
            />
          </Panel>

          {/* Quest from the monkey */}
          <Panel
            title="Quest"
            icon="banana"
            badge={<Tag text={`+${XP_PER_QUEST} XP`} tone="new" />}
          >
            {quest.quest ? (
              <>
                {/* Server quests can have long titles, so they wrap. */}
                <DecisionHelp
                  label="Quest"
                  title={quest.quest.title}
                  takeaway={quest.quest.why}
                  explanation={explainQuest(
                    quest.quest,
                    focus,
                    state.logs,
                    state.flags,
                    { completed: state.completed, skipped: state.skipped },
                  )}
                >
                  <PixelText text={quest.quest.title} scale={3} heading wrap />
                </DecisionHelp>
                <AppText>{quest.quest.task}</AppText>
                <View
                  style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <Icon name="clock" />
                    <AppText variant="caption">
                      {quest.quest.minutes} min
                    </AppText>
                  </View>
                  <AppText variant="caption">
                    Needs: {quest.quest.equipment}
                  </AppText>
                </View>
                <AppText variant="caption" muted>
                  Why: {quest.quest.why}
                </AppText>

              </>
            ) : (
              <AppText>
                Nothing left for this focus. Log your next session and the
                monkey will find a new quest.
              </AppText>
            )}

            {quest.paused.length > 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.dangerSoft,
                  borderWidth: 3,
                  borderColor: theme.colors.outline,
                  padding: 10,
                  gap: 6,
                }}
              >
                <Tag text="Paused" tone="paused" />
                <DecisionHelp
                  label="Paused quests"
                  explanation={explainPause(state.flags)}
                >
                  <AppText variant="caption">
                    {quest.paused.map(q => q.title).join(', ')} waits until your
                    flagged finger is cleared. Climbing loads your fingers.
                  </AppText>
                </DecisionHelp>
              </View>
            ) : null}

            {quest.quest ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Done"
                    icon="check"
                    onPress={() => completeQuest(quest.quest!.id)}
                    accessibilityHint={`Marks the quest done and gives your monkey ${XP_PER_QUEST} XP`}
                  />
                </View>
                {quest.options.length > 1 ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Swap"
                      variant="secondary"
                      onPress={() => skipQuest(quest.quest!.id)}
                      accessibilityHint="Shows a different quest"
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Panel>

          {/* Active hand flags change what the monkey suggests */}
          <Panel
            variant={state.flags.length > 0 ? 'alert' : 'quiet'}
            title="Hands"
            icon="flag"
          >
            {state.flags.map(f => (
              <View
                key={`${f.side}-${f.finger}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <AppText style={{ flex: 1 }}>{flagText(f, today)}</AppText>
                <Button
                  title="Edit"
                  variant="secondary"
                  small
                  accessibilityLabel={`Edit ${fingerLabel(
                    f.side,
                    f.finger,
                  ).toLowerCase()}`}
                  onPress={() =>
                    navigate('Finger', { side: f.side, finger: f.finger })
                  }
                />
              </View>
            ))}
            {state.flags.length > 0 ? (
              <DecisionHelp
                label="Finger pause rule"
                explanation={explainPause(state.flags)}
              >
                <AppText variant="caption" muted>
                  Finger-loading quests are paused. Your climbing profile stays
                  the same.
                </AppText>
              </DecisionHelp>
            ) : (
              <AppText variant="caption" muted>
                Nothing flagged. If a finger is sore, mark it on Hands and
                finger-loading quests wait.
              </AppText>
            )}
            <Button
              title={state.flags.length > 0 ? 'Update hands' : 'Open Hands'}
              variant="secondary"
              small
              onPress={() => reset('Hands')}
            />
          </Panel>

          {wide ? recentPanel : null}
        </Column>

        <Column>
          {/* Terrain triangle */}
          <Panel title="Walls">
            <TerrainTriangle
              stats={terrain}
              focus={focus.terrain}
              onSelect={t => navigate('Evidence', { terrain: t })}
            />
            <AppText variant="caption" muted>
              Each corner grows with the share of logged climbs you sent on that
              wall. Tap a corner to see the climbs.
            </AppText>
            {state.logs.some(l => l.sample) ? (
              <SampleMark text="Includes sample climbs." />
            ) : null}
            <Disclosure title="How was this data created?">
              <AppText variant="caption">
                Made only from the climbs you log. Two things count: the wall,
                and whether you sent it. Tap a ? for the climbs behind a corner.
              </AppText>
              {TERRAINS.map(t => (
                <DecisionHelp
                  key={t}
                  label={`${TERRAIN_NAME[t]} tally`}
                  explanation={explainTerrain(t, state.logs)}
                >
                  <View style={styles.tallyRow}>
                    <Icon name={TERRAIN_ICON[t]} />
                    <PixelText text={TERRAIN_NAME[t]} />
                    <AppText variant="caption" muted>
                      {terrain[t].sent} of {terrain[t].logged} sent
                    </AppText>
                  </View>
                </DecisionHelp>
              ))}
              <AppText variant="caption" muted>
                A wall needs 3 logged climbs before its corner is filled in.
              </AppText>
            </Disclosure>
          </Panel>

          {/* Each style is counted separately, including multi-style climbs. */}
          <Panel title="Style">
            {MOVEMENTS.map(m => (
              <View key={m} style={{ gap: 6 }}>
                <DecisionHelp
                  label={`${MOVEMENT_NAME[m]} tally`}
                  explanation={explainMovement(m, state.logs)}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <PixelText text={MOVEMENT_NAME[m]} />
                    <AppText variant="caption" muted>
                      {moves[m].sent} of {moves[m].logged} sent
                    </AppText>
                  </View>
                </DecisionHelp>
                <Pips
                  results={state.logs
                    .filter(l => l.movements.includes(m))
                    .map(l => l.sent)}
                  accessibilityLabel={`${MOVEMENT_NAME[m]}: ${moves[m].sent} of ${moves[m].logged} sent`}
                />
              </View>
            ))}
            <AppText variant="caption" muted>
              A climb can use several styles. Each selected style counts here.
            </AppText>
            <View
              style={{
                height: 3,
                backgroundColor: theme.colors.surfaceShade,
                marginVertical: 4,
              }}
            />
            <View style={styles.radarHead}>
              <DecisionHelp
                label="Movement radar"
                explanation={explainExampleRadar(EXAMPLE_MOVES)}
              >
                <PixelText text="Movement radar" />
              </DecisionHelp>
              <StateLabel state="later" />
            </View>
            <MovementRadar axes={EXAMPLE_MOVES} example />
            <AppText variant="caption" muted>
              Not scored yet. It needs movement evidence before it shows real
              values.
            </AppText>
          </Panel>

          {wide ? null : recentPanel}

          <PetsPanel />
        </Column>
      </Columns>

      <ResetProfile />
    </TabScreen>
  );
}

/**
 * Moves keyboard and screen reader focus to something that just appeared.
 * focus() moves the web page's focus (the element needs tabIndex -1), and
 * the accessibility event moves the screen reader on Android and iOS. Each
 * does nothing where it does not apply, so no platform check is needed.
 */
function focusOn(node: View | null) {
  if (node) {
    node.focus();
    AccessibilityInfo.sendAccessibilityEvent?.(node, 'focus');
  }
}

/**
 * Deletes the whole profile, after an "Are you sure?" step in the same tray.
 * The step is part of the screen rather than a system pop-up, which browsers
 * can block. Not the demo reset: no example data comes back.
 */
function ResetProfile() {
  const { backendKind, resetProfile } = useGame();
  const { colors: c } = useTheme();
  const wide = useLayout().columns === 2;
  const [asking, setAsking] = useState(false);
  const warning = useRef<View>(null);
  const question = useRef<View>(null);

  // Keyboard and screen reader users land on the question.
  useEffect(() => {
    if (asking) {
      focusOn(question.current);
    }
  }, [asking]);

  return (
    <Panel variant="alert">
      <View style={wide ? styles.side : styles.stack}>
        {/* One stop for screen readers, and where focus goes back to. */}
        <View
          ref={warning}
          accessible
          tabIndex={-1}
          style={[styles.note, styles.grow]}
        >
          <WarningSign />
          <View style={[styles.grow, styles.lines]}>
            <AppText>
              Resetting deletes your climbs, finger flags, quest progress and
              the monkey's level, your reach, home test results and setup
              answers. It cannot be undone.
            </AppText>
            <AppText variant="caption" muted>
              Setup runs again and your profile starts empty.
              {/* Only the on-device demo has example data to put back. */}
              {backendKind === 'local'
                ? ' To put the example data back instead, use Reset demo in Demo controls (Data).'
                : ''}
            </AppText>
          </View>
        </View>
        <Button
          title="Reset profile"
          icon="bin"
          variant="danger"
          disabled={asking}
          onPress={() => setAsking(true)}
          accessibilityHint="Asks before anything is deleted"
        />
      </View>

      {asking ? (
        <>
          {/* A red rule: the kit's Divider is drawn in sign colours, which
              read as a green line on the night theme's red tray. */}
          <View style={[styles.rule, { backgroundColor: c.danger }]} />
          <View style={wide ? styles.side : styles.stack}>
            <View style={[styles.grow, styles.lines]}>
              <View
                ref={question}
                accessible
                accessibilityRole="header"
                accessibilityLabel="Are you sure?"
                tabIndex={-1}
              >
                <PixelText
                  text="Are you sure?"
                  scale={3}
                  heading
                  accessible={false}
                />
              </View>
              <AppText>
                Your whole profile is deleted and setup starts again.
              </AppText>
            </View>
            <View style={wide ? styles.choicesSide : styles.choices}>
              <Button
                title="Yes, reset my profile"
                variant="danger"
                onPress={() => {
                  setAsking(false);
                  resetProfile();
                }}
              />
              <Button
                title="Keep my profile"
                variant="secondary"
                onPress={() => {
                  setAsking(false);
                  focusOn(warning.current);
                }}
              />
            </View>
          </View>
        </>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  // Phones: text, then a full-width button. Wide screens: buttons on the right.
  stack: { gap: spacing.md },
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 4 },
  lines: { gap: spacing.sm },
  grow: { flex: 1 },
  rule: { height: PX },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  choices: { gap: spacing.sm + 2 },
  choicesSide: { flexDirection: 'row', gap: spacing.sm + 2 },
});
