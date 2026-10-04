import { StyleSheet, View } from 'react-native';
import {
  SURFACES,
  XP_PER_LEVEL,
  XP_PER_QUEST,
  paceText,
  runTallies,
  shortDate,
  surfaceTallies,
  weekKm,
  type RunType,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Column,
  Columns,
  Gazelle,
  Icon,
  Meter,
  Monkey,
  Panel,
  Pips,
  PixelText,
  RateTriangle,
  SavannaHero,
  Tag,
  useContentWidth,
  useLayout,
  useTheme,
  type TriangleCorner,
  type TriangleStat,
} from '@hackyeah/ui';
import { TabScreen } from '../../components/TabScreen';
import {
  RUN_TYPE_ICON,
  RUN_TYPE_NAME,
  SURFACE_ICON,
  SURFACE_NAME,
  legFlagText,
  runName,
} from '../../labels';
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { useGame } from '../../state/GameProvider';
import { useRun } from '../../state/RunProvider';

const STEPS = XP_PER_LEVEL / XP_PER_QUEST;

// Clockwise from the top, like the monkey's walls.
const CORNERS: readonly [
  TriangleCorner<RunType>,
  TriangleCorner<RunType>,
  TriangleCorner<RunType>,
] = [
  { key: 'easy', name: 'Easy', icon: 'easy' },
  { key: 'tempo', name: 'Tempo', icon: 'tempo' },
  { key: 'long', name: 'Long', icon: 'long' },
];

/**
 * Gazelle mode's profile, laid out like the monkey's: level, then the one
 * focus and one quest on the left, the running profile on the right.
 */
export function GazelleProfileScreen() {
  const theme = useTheme();
  const width = useContentWidth();
  const { navigate, reset } = useNavigation<RouteName>();
  const { state, today, focus, quest, pet, completeQuest, skipQuest } =
    useRun();
  const wide = useLayout().columns === 2;

  const types = runTallies(state.runs);
  const surfaces = surfaceTallies(state.runs);
  const stats = Object.fromEntries(
    CORNERS.map(({ key }) => [
      key,
      {
        logged: types[key].logged,
        done: types[key].finished,
        rate: types[key].rate,
      },
    ]),
  ) as Record<RunType, TriangleStat>;
  const hasSample = state.runs.some(r => r.sample);
  const questsToGo = STEPS - pet.xpInLevel / XP_PER_QUEST;
  const recent = [...state.runs].reverse().slice(0, 4);
  const focusName = RUN_TYPE_NAME[focus.type].toLowerCase();

  const recentPanel = (
    <Panel title="Recent" icon="log">
      {recent.length === 0 ? (
        <AppText>No runs logged yet.</AppText>
      ) : (
        recent.map(run => (
          <View key={run.id} style={styles.inline}>
            <Icon name={RUN_TYPE_ICON[run.type]} />
            <View style={styles.grow}>
              <AppText>
                {runName(run)}, {SURFACE_NAME[run.surface].toLowerCase()}
              </AppText>
              <AppText variant="caption" muted>
                {shortDate(run.date)}
                {paceText(run.km, run.minutes)
                  ? `, ${paceText(run.km, run.minutes)}`
                  : ''}
                {run.sample ? ' (example)' : ''}
              </AppText>
            </View>
            <Tag
              text={run.finished ? 'Finished' : 'Cut short'}
              tone={run.finished ? 'new' : 'muted'}
            />
          </View>
        ))
      )}
      <Button title="Log a run" icon="log" onPress={() => reset('RunLog')} />
    </Panel>
  );

  return (
    <TabScreen
      hero={
        <SavannaHero
          width={width}
          title={'Running\nGazelle'}
          step={pet.xpInLevel / XP_PER_QUEST}
          steps={STEPS}
          cosmetics={pet.cosmetics}
          cheerKey={pet.xp}
        />
      }
    >
      {/* Gazelle level and XP */}
      <Panel variant="wood">
        <View style={styles.inlineWide}>
          <PixelText text={`Lvl ${pet.level}`} scale={4} heading />
          <View style={styles.meter}>
            <Meter
              value={pet.xpInLevel / XP_PER_QUEST}
              segments={STEPS}
              accessibilityLabel={`${
                pet.xpInLevel
              } of ${XP_PER_LEVEL} XP to level ${pet.level + 1}`}
            />
            <View style={styles.between}>
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

      <Columns>
        <Column>
          {/* The one thing to work on */}
          <Panel variant="banana" title="Your focus">
            <View style={styles.inline}>
              <Icon name={RUN_TYPE_ICON[focus.type]} scale={3} />
              <PixelText text={RUN_TYPE_NAME[focus.type]} scale={4} heading />
            </View>
            {focus.kind === 'practice' ? (
              <AppText>
                You finished {focus.tally.finished} of the {focus.tally.logged}{' '}
                {focusName} runs you logged as planned. That is your lowest of
                the three run types.
              </AppText>
            ) : (
              <AppText>
                Only {focus.tally.logged} {focusName}{' '}
                {focus.tally.logged === 1 ? 'run' : 'runs'} logged. Log 3 and
                the gazelle can compare it with the other run types.
              </AppText>
            )}
            <AppText variant="caption" muted>
              From your logged runs only. Not a race time prediction.
            </AppText>
            <Button
              title="View evidence"
              variant="secondary"
              small
              onPress={() => navigate('RunEvidence', { type: focus.type })}
            />
          </Panel>

          {/* Quest from the gazelle */}
          <Panel
            title="Quest"
            icon="shoe"
            badge={<Tag text={`+${XP_PER_QUEST} XP`} tone="new" />}
          >
            {quest.quest ? (
              <>
                <PixelText text={quest.quest.title} scale={3} heading wrap />
                <AppText>{quest.quest.task}</AppText>
                <View style={styles.facts}>
                  <View style={styles.fact}>
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
                Nothing left for this focus. Log your next run and the gazelle
                will find a new quest.
              </AppText>
            )}

            {quest.paused.length > 0 ? (
              <View
                style={[
                  styles.paused,
                  {
                    backgroundColor: theme.colors.dangerSoft,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Tag text="Paused" tone="paused" />
                <AppText variant="caption">
                  {quest.paused.map(q => q.title).join(', ')} waits until your
                  flagged leg is cleared. Running loads your legs.
                </AppText>
              </View>
            ) : null}

            {quest.quest ? (
              <View style={styles.choices}>
                <View style={styles.grow}>
                  <Button
                    title="Done"
                    icon="check"
                    onPress={() => completeQuest(quest.quest!.id)}
                    accessibilityHint={`Marks the quest done and gives your gazelle ${XP_PER_QUEST} XP`}
                  />
                </View>
                {quest.options.length > 1 ? (
                  <View style={styles.grow}>
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

          {/* Active leg flags change what the gazelle suggests */}
          {state.legFlags.length > 0 ? (
            <Panel variant="alert" title="Legs" icon="flag">
              {state.legFlags.map(f => (
                <AppText key={`${f.side}-${f.part}`}>
                  {legFlagText(f, today)}
                </AppText>
              ))}
              <AppText variant="caption" muted>
                Running quests are paused. Your running profile stays the same.
              </AppText>
              <Button
                title="Update legs"
                variant="secondary"
                small
                onPress={() => reset('Legs')}
              />
            </Panel>
          ) : null}

          {wide ? recentPanel : null}
        </Column>

        <Column>
          {/* Run type triangle */}
          <Panel
            title="Runs"
            badge={hasSample ? <Tag text="Example" /> : undefined}
          >
            <RateTriangle
              corners={CORNERS}
              stats={stats}
              verb="finished"
              unit="runs"
              focus={focus.type}
              onSelect={t => navigate('RunEvidence', { type: t })}
            />
            <AppText variant="caption" muted>
              Each corner grows with the share of logged runs you finished as
              planned. Tap a corner to see the runs.
            </AppText>
          </Panel>

          {/* Distance and surfaces */}
          <Panel title="Ground">
            <View style={styles.between}>
              <PixelText text="This week" />
              <AppText variant="caption" muted>
                {weekKm(state.runs, today)} km in 7 days
              </AppText>
            </View>
            {SURFACES.map(s => (
              <View key={s} style={styles.surface}>
                <View style={styles.between}>
                  <View style={styles.fact}>
                    <Icon name={SURFACE_ICON[s]} />
                    <PixelText text={SURFACE_NAME[s]} />
                  </View>
                  <AppText variant="caption" muted>
                    {surfaces[s].finished} of {surfaces[s].logged} finished,{' '}
                    {surfaces[s].km} km
                  </AppText>
                </View>
                <Pips
                  results={state.runs
                    .filter(r => r.surface === s)
                    .map(r => r.finished)}
                  accessibilityLabel={`${SURFACE_NAME[s]}: ${surfaces[s].finished} of ${surfaces[s].logged} finished`}
                />
              </View>
            ))}
            <AppText variant="caption" muted>
              Where you ran, one square per run. Filled squares were finished as
              planned.
            </AppText>
          </Panel>

          {wide ? null : recentPanel}

          <PetsPanel />
        </Column>
      </Columns>

      <ResetRuns />
    </TabScreen>
  );
}

/** One pet per sport. The gazelle is active here; tap to go back to the monkey. */
function PetsPanel() {
  const { pet: monkey } = useGame();
  const { pet, setMode } = useRun();
  return (
    <Panel title="Pets">
      <View style={styles.pets}>
        <View style={styles.pet}>
          <View style={styles.petArt}>
            <Monkey scale={2} cosmetics={monkey.cosmetics} still />
          </View>
          <PixelText text="Monkey" />
          <AppText variant="caption" muted>
            Climbing, level {monkey.level}
          </AppText>
          <Button
            title="Climb"
            variant="secondary"
            small
            onPress={() => setMode('monkey')}
            accessibilityLabel="Switch to monkey mode"
          />
        </View>
        <View style={styles.pet}>
          <View style={styles.petArt}>
            <Gazelle scale={2} cosmetics={pet.cosmetics} still />
          </View>
          <PixelText text="Gazelle" />
          <AppText variant="caption" muted>
            Running, level {pet.level}
          </AppText>
          {/* Wrapped so the tag centres like the rest of the column. */}
          <View>
            <Tag text="Active" tone="new" />
          </View>
        </View>
      </View>
    </Panel>
  );
}

/** Clears gazelle mode only, in one tap; the monkey's profile is untouched. */
function ResetRuns() {
  const { resetRuns } = useRun();
  return (
    <Panel variant="quiet">
      <View style={styles.inline}>
        <AppText variant="caption" style={styles.grow}>
          Start the gazelle over: deletes your runs, leg flags and gazelle
          quests. The monkey keeps everything.
        </AppText>
        <Button
          title="Reset runs"
          icon="bin"
          variant="secondary"
          small
          onPress={resetRuns}
        />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineWide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meter: { flex: 1, gap: 6 },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  grow: { flex: 1 },
  facts: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  fact: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  paused: { borderWidth: 3, padding: 10, gap: 6 },
  choices: { flexDirection: 'row', gap: 10 },
  surface: { gap: 6 },
  pets: { flexDirection: 'row', gap: 12 },
  pet: { flex: 1, alignItems: 'center', gap: 6 },
  petArt: { height: 60, justifyContent: 'flex-end' },
});
