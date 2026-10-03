import { View } from 'react-native';
import {
  MOVEMENTS,
  XP_PER_LEVEL,
  XP_PER_QUEST,
  movementTallies,
  shortDate,
  terrainTallies,
  ageLabel,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Gazelle,
  Icon,
  JungleHero,
  Meter,
  Monkey,
  MovementRadar,
  Panel,
  Pips,
  PixelText,
  Tag,
  TerrainTriangle,
  useContentWidth,
  useTheme,
  type MovementAxis,
} from '@hackyeah/ui';
import { TabScreen } from '../components/TabScreen';
import {
  MOVEMENT_NAME,
  TERRAIN_ICON,
  TERRAIN_NAME,
  fingerLabel,
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

  const terrain = terrainTallies(state.logs);
  const moves = movementTallies(state.logs);
  const hasSample = state.logs.some(l => l.sample);
  const questsToGo = STEPS - pet.xpInLevel / XP_PER_QUEST;
  const recent = [...state.logs].reverse().slice(0, 4);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PixelText text={`Lvl ${pet.level}`} scale={4} heading />
          <View style={{ flex: 1, gap: 6 }}>
            <Meter
              value={pet.xpInLevel / XP_PER_QUEST}
              segments={STEPS}
              accessibilityLabel={`${pet.xpInLevel} of ${XP_PER_LEVEL} XP to level ${pet.level + 1}`}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="caption">
                {pet.xpInLevel} / {XP_PER_LEVEL} XP
              </AppText>
              <AppText variant="caption" muted>
                {questsToGo === 1 ? '1 quest to level up' : `${questsToGo} quests to level up`}
              </AppText>
            </View>
          </View>
        </View>
      </Panel>

      {/* The one thing to work on */}
      <Panel variant="banana" title="Your focus">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name={TERRAIN_ICON[focus.terrain]} scale={3} />
          <PixelText text={TERRAIN_NAME[focus.terrain]} scale={4} heading />
        </View>
        {focus.kind === 'practice' ? (
          <AppText>
            You sent {focus.tally.sent} of the {focus.tally.logged}{' '}
            {TERRAIN_NAME[focus.terrain].toLowerCase()} climbs you logged. That
            is your lowest of the three walls.
          </AppText>
        ) : (
          <AppText>
            Only {focus.tally.logged} {TERRAIN_NAME[focus.terrain].toLowerCase()}{' '}
            {focus.tally.logged === 1 ? 'climb' : 'climbs'} logged. Log 3 and
            the monkey can compare it with the other walls.
          </AppText>
        )}
        <AppText variant="caption" muted>
          From your logged climbs only. Not a grade prediction.
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
            <PixelText text={quest.quest.title} scale={3} heading />
            <AppText>{quest.quest.task}</AppText>
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Icon name="clock" />
                <AppText variant="caption">{quest.quest.minutes} min</AppText>
              </View>
              <AppText variant="caption">Needs: {quest.quest.equipment}</AppText>
            </View>
            <AppText variant="caption" muted>
              Why: {quest.quest.why}
            </AppText>
          </>
        ) : (
          <AppText>
            Nothing left for this focus. Log your next session and the monkey
            will find a new quest.
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
          {state.flags.map(f => (
            <AppText key={`${f.side}-${f.finger}`}>
              {fingerLabel(f.side, f.finger)} flagged {ageLabel(f.date, today)}.
            </AppText>
          ))}
          <AppText variant="caption" muted>
            Finger-loading quests are paused. Your climbing profile stays the
            same.
          </AppText>
          <Button
            title="Update hands"
            variant="secondary"
            small
            onPress={() => reset('Hands')}
          />
        </Panel>
      ) : null}

      {/* Terrain triangle */}
      <Panel
        title="Walls"
        badge={hasSample ? <Tag text="Example" /> : undefined}
      >
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

      {/* Movement */}
      <Panel title="Moves">
        {MOVEMENTS.map(m => (
          <View key={m} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <PixelText text={MOVEMENT_NAME[m]} />
              <AppText variant="caption" muted>
                {moves[m].sent} of {moves[m].logged} sent
              </AppText>
            </View>
            <Pips
              results={state.logs.filter(l => l.movement === m).map(l => l.sent)}
              accessibilityLabel={`${MOVEMENT_NAME[m]}: ${moves[m].sent} of ${moves[m].logged} sent`}
            />
          </View>
        ))}
        <AppText variant="caption" muted>
          Two separate skills, not one slider. You can be good at both.
        </AppText>
        <View
          style={{
            height: 3,
            backgroundColor: theme.colors.surfaceShade,
            marginVertical: 4,
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <PixelText text="Movement radar" />
          <Tag text="Example" />
        </View>
        <MovementRadar axes={EXAMPLE_MOVES} example />
        <AppText variant="caption" muted>
          Not scored yet. These axes need movement evidence before they show
          real values.
        </AppText>
      </Panel>

      {/* Recent climbs */}
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
                  {MOVEMENT_NAME[log.movement].toLowerCase()}
                </AppText>
                <AppText variant="caption" muted>
                  {shortDate(log.date)}
                  {log.sample ? ' (example)' : ''}
                </AppText>
              </View>
              <Tag text={log.sent ? 'Sent' : 'Not yet'} tone={log.sent ? 'new' : 'muted'} />
            </View>
          ))
        )}
        <Button title="Log a climb" icon="log" onPress={() => reset('Log')} />
      </Panel>

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
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Icon name="lock" />
              <PixelText text="Gazelle" />
            </View>
            <AppText variant="caption" muted>
              Running mode. Not built yet.
            </AppText>
          </View>
        </View>
      </Panel>
    </TabScreen>
  );
}
