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
  Gazelle,
  Icon,
  JungleHero,
  Meter,
  Monkey,
  MovementRadar,
  PX,
  Panel,
  Pips,
  PixelText,
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
import { TabScreen } from '../components/TabScreen';
import {
  MOVEMENT_NAME,
  TERRAIN_ICON,
  TERRAIN_NAME,
  fingerLabel,
  flagText,
  styleText,
} from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

const STEPS = XP_PER_LEVEL / XP_PER_QUEST;

// Not scored yet: shown striped and labelled EXAMPLE until real evidence exists.
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
  const hasSample = state.logs.some(l => l.sample);
  const questsToGo = STEPS - pet.xpInLevel / XP_PER_QUEST;
  const recent = [...state.logs].reverse().slice(0, 4);

  // Recent climbs. Wide screens show them under the quest, so both columns
  // end at about the same height. Phones keep them after Style.
  const recentPanel = (
    <Panel title="Recent" icon="log">
      {recent.length === 0 ? (
        <AppText>No climbs logged yet.</AppText>
      ) : (
        recent.map(log => (
          <View
            key={log.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Icon name={TERRAIN_ICON[log.terrain]} />
            <View style={{ flex: 1 }}>
              <AppText>
                {log.grade} {TERRAIN_NAME[log.terrain].toLowerCase()},{' '}
                {styleText(log.movements)}
              </AppText>
              <AppText variant="caption" muted>
                {shortDate(log.date)}
                {log.sample ? ' (example)' : ''}
              </AppText>
            </View>
            <Tag
              text={log.sent ? 'Sent' : 'Not yet'}
              tone={log.sent ? 'new' : 'muted'}
            />
          </View>
        ))
      )}
      <Button title="Log a climb" icon="log" onPress={() => reset('Log')} />
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
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PixelText text={`Lvl ${pet.level}`} scale={4} heading />
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
              label="your focus"
              explanation={explainFocus(focus, state.logs)}
            />
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Icon name={TERRAIN_ICON[focus.terrain]} scale={3} />
              <PixelText text={TERRAIN_NAME[focus.terrain]} scale={4} heading />
            </View>
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
              Local rule from logged climbs only. Independent of server quest
              selection. Not a grade prediction.
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
                <PixelText text={quest.quest.title} scale={3} heading wrap />
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
                <DecisionHelp
                  label="your quest"
                  explanation={explainQuest(
                    quest.quest,
                    focus,
                    state.logs,
                    state.flags,
                    { completed: state.completed, skipped: state.skipped },
                  )}
                />
                <AppText variant="caption" muted>
                  {state.assigned !== undefined
                    ? 'The server selected this quest. Its saved decision is separate from the local wall focus.'
                    : 'Selected on this device from logged climbs, finger flags and quest progress.'}
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
                  label="paused quests"
                  explanation={explainPause(state.flags)}
                />
                <AppText variant="caption">
                  {quest.paused.map(q => q.title).join(', ')} waits until your
                  flagged finger is cleared. Climbing loads your fingers.
                </AppText>
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
          {state.flags.length > 0 ? (
            <Panel variant="alert" title="Hands" icon="flag">
              <DecisionHelp
                label="finger pause rule"
                explanation={explainPause(state.flags)}
              />
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
              <AppText variant="caption" muted>
                Finger-loading quests are paused. Your climbing profile stays
                the same.
              </AppText>
              <Button
                title="Update hands"
                variant="secondary"
                small
                onPress={() => reset('Hands')}
              />
            </Panel>
          ) : null}

          {wide ? recentPanel : null}
        </Column>

        <Column>
          {/* Terrain triangle */}
          <Panel
            title="Walls"
            badge={hasSample ? <Tag text="Example" /> : undefined}
          >
            {TERRAINS.map(t => (
              <DecisionHelp
                key={t}
                label={`${TERRAIN_NAME[t]} tally`}
                explanation={explainTerrain(t, state.logs)}
              />
            ))}
            <TerrainTriangle
              stats={terrain}
              focus={focus.terrain}
              onSelect={t => navigate('Evidence', { terrain: t })}
            />
            <AppText variant="caption" muted>
              Each corner grows with the share of logged climbs you sent on that
              wall. Tap a corner to see the climbs.
            </AppText>
          </Panel>

          {/* Style: controlled and dynamic, counted separately */}
          <Panel title="Style">
            {MOVEMENTS.map(m => (
              <View key={m} style={{ gap: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <PixelText text={MOVEMENT_NAME[m]} />
                  <AppText variant="caption" muted>
                    {moves[m].sent} of {moves[m].logged} sent
                  </AppText>
                </View>
                <DecisionHelp
                  label={`${MOVEMENT_NAME[m]} tally`}
                  explanation={explainMovement(m, state.logs)}
                />
                <Pips
                  results={state.logs
                    .filter(l => l.movements.includes(m))
                    .map(l => l.sent)}
                  accessibilityLabel={`${MOVEMENT_NAME[m]}: ${moves[m].sent} of ${moves[m].logged} sent`}
                />
              </View>
            ))}
            <AppText variant="caption" muted>
              Styles can overlap. A climb can count in both.
            </AppText>
            <View
              style={{
                height: 3,
                backgroundColor: theme.colors.surfaceShade,
                marginVertical: 4,
              }}
            />
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <PixelText text="Movement radar" />
              <Tag text="Example" />
            </View>
            <DecisionHelp
              label="movement radar"
              explanation={explainExampleRadar(EXAMPLE_MOVES)}
            />
            <MovementRadar axes={EXAMPLE_MOVES} example />
            <AppText variant="caption" muted>
              Not scored yet. These axes need movement evidence before they show
              real values.
            </AppText>
          </Panel>

          {wide ? null : recentPanel}

          {/* One pet per sport */}
          <Panel title="Pets">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Monkey scale={2} cosmetics={pet.cosmetics} still />
                <PixelText text="Monkey" />
                <AppText variant="caption" muted>
                  Climbing, level {pet.level}
                </AppText>
              </View>
              <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ height: 56, justifyContent: 'flex-end' }}>
                  <Gazelle scale={2} locked />
                </View>
                <View
                  style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}
                >
                  <Icon name="lock" />
                  <PixelText text="Gazelle" />
                </View>
                <AppText variant="caption" muted>
                  Running mode. Not built yet.
                </AppText>
              </View>
            </View>
          </Panel>
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
                ? ' To put the example data back instead, use Reset demo data in Tests.'
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
  choices: { gap: spacing.sm + 2 },
  choicesSide: { flexDirection: 'row', gap: spacing.sm + 2 },
});
