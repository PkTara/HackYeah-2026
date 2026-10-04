import { StyleSheet, View } from 'react-native';
import {
  XP_PER_LEVEL,
  XP_PER_QUEST,
  explainSportFocus,
  explainSportQuest,
  shortDate,
  talliesBy,
  weekDistance,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Column,
  Columns,
  Icon,
  Meter,
  Panel,
  Pips,
  PixelText,
  RateTriangle,
  SampleMark,
  SportHero,
  Tag,
  useContentWidth,
  useLayout,
  useTheme,
  type TriangleCorner,
  type TriangleStat,
} from '@hackyeah/ui';
import { DecisionHelp } from '../../components/DecisionHelp';
import { PetsPanel } from '../../components/PetsPanel';
import { TabScreen } from '../../components/TabScreen';
import { useNavigation } from '../../navigation/Navigator';
import { trailFor } from '../../navigation/trail';
import type { RouteName } from '../../navigation/routes';
import { bodyFlagText, sessionName } from '../../sports';
import { useSport } from '../../state/SportProvider';

const STEPS = XP_PER_LEVEL / XP_PER_QUEST;

/**
 * A sport mode's profile (the gazelle's or the dolphin's), laid out like the
 * monkey's: level, then the one focus and one quest on the left, the profile
 * built from logged sessions on the right.
 */
export function SportProfileScreen() {
  const theme = useTheme();
  const width = useContentWidth();
  const { navigate, reset, openTrail } = useNavigation<RouteName>();
  const {
    sport,
    view,
    state,
    today,
    focus,
    quest,
    pet,
    completeQuest,
    skipQuest,
  } = useSport();
  const wide = useLayout().columns === 2;

  const kinds = talliesBy(state.logs, 'kind', sport.kinds);
  const places = talliesBy(state.logs, 'place', sport.places);
  const corner = (k: string): TriangleCorner<string> => ({
    key: k,
    name: view.kindName[k],
    icon: view.kindIcon[k],
  });
  const [top, right, left] = sport.kinds;
  const corners = [corner(top), corner(right), corner(left)] as const;
  const stats: Record<string, TriangleStat> = Object.fromEntries(
    sport.kinds.map(k => [
      k,
      { logged: kinds[k].logged, done: kinds[k].finished, rate: kinds[k].rate },
    ]),
  );
  const hasSample = state.logs.some(l => l.sample);
  const questsToGo = STEPS - pet.xpInLevel / XP_PER_QUEST;
  const recent = [...state.logs].reverse().slice(0, 4);
  const focusName = view.kindName[focus.sessionKind].toLowerCase();

  const recentPanel = (
    <Panel title="Recent" icon="log">
      {recent.length === 0 ? (
        <AppText>No {view.sessions} logged yet.</AppText>
      ) : (
        recent.map(log => {
          const pace = sport.pace(log.distance, log.minutes);
          return (
            <View key={log.id} style={styles.inline}>
              <Icon name={view.kindIcon[log.kind]} />
              <View style={styles.grow}>
                <AppText>
                  {sessionName(view, log)},{' '}
                  {view.placeName[log.place].toLowerCase()}
                </AppText>
                <AppText variant="caption" muted>
                  {shortDate(log.date)}
                  {pace ? `, ${pace}` : ''}
                  {log.sample ? ' (example)' : ''}
                </AppText>
              </View>
              <Tag
                text={log.finished ? 'Finished' : 'Cut short'}
                tone={log.finished ? 'new' : 'muted'}
              />
            </View>
          );
        })
      )}
      <Button
        title={`Log a ${view.session}`}
        icon="log"
        onPress={() =>
          openTrail(trailFor('SportLogSession', { session: view.session }))
        }
      />
    </Panel>
  );

  return (
    <TabScreen
      hero={
        <SportHero
          world={view.world}
          width={width}
          title={view.title}
          step={pet.xpInLevel / XP_PER_QUEST}
          steps={STEPS}
          cosmetics={pet.cosmetics}
          cheerKey={pet.xp}
        />
      }
    >
      {/* Pet level and XP */}
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
            <DecisionHelp
              label="Focus"
              explanation={explainSportFocus(
                focus,
                state.logs,
                sport.kinds,
                view,
              )}
            >
              <View style={styles.inline}>
                <Icon name={view.kindIcon[focus.sessionKind]} scale={3} />
                <PixelText
                  text={view.kindName[focus.sessionKind]}
                  scale={4}
                  heading
                />
              </View>
            </DecisionHelp>
            {focus.kind === 'practice' ? (
              <AppText>
                You finished {focus.tally.finished} of the {focus.tally.logged}{' '}
                {focusName} {view.sessions} you logged as planned. That is your
                lowest of the three {view.kindPlural}.
              </AppText>
            ) : (
              <AppText>
                Only {focus.tally.logged} {focusName}{' '}
                {focus.tally.logged === 1 ? view.session : view.sessions}{' '}
                logged. Log 3 and the {view.pet} can compare it with the others.
              </AppText>
            )}
            <AppText variant="caption" muted>
              From your logged {view.sessions} only. {view.notA}
            </AppText>
            <Button
              title="View evidence"
              variant="secondary"
              small
              onPress={() =>
                navigate('SportEvidence', { kind: focus.sessionKind })
              }
            />
          </Panel>

          {/* Quest from the pet */}
          <Panel
            title="Quest"
            icon={view.questIcon}
            badge={<Tag text={`+${XP_PER_QUEST} XP`} tone="new" />}
          >
            {quest.quest ? (
              <>
                <DecisionHelp
                  label="Quest"
                  title={quest.quest.title}
                  takeaway={quest.quest.why}
                  explanation={explainSportQuest(
                    quest.quest,
                    focus,
                    state,
                    sport.quests,
                    sport.kinds,
                    view,
                  )}
                >
                  <PixelText text={quest.quest.title} scale={3} heading wrap />
                </DecisionHelp>
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
                Nothing left for this focus. Log your next {view.session} and
                the {view.pet} will find a new quest.
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
                  flagged spot is cleared. {view.loadNote}
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
                    accessibilityHint={`Marks the quest done and gives your ${view.pet} ${XP_PER_QUEST} XP`}
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

          {/* Active flags change what the pet suggests */}
          {state.flags.length > 0 ? (
            <Panel variant="alert" title={view.bodyTab} icon="flag">
              {state.flags.map(f => (
                <AppText key={`${f.side}-${f.part}`}>
                  {bodyFlagText(view, f, today)}
                </AppText>
              ))}
              <AppText variant="caption" muted>
                Quests that load it are paused. Your profile stays the same.
              </AppText>
              <Button
                title={`Update ${view.bodyTab.toLowerCase()}`}
                variant="secondary"
                small
                onPress={() => reset('SportBody')}
              />
            </Panel>
          ) : null}

          {wide ? recentPanel : null}
        </Column>

        <Column>
          {/* Kind triangle */}
          <Panel
            title={
              view.sessions.charAt(0).toUpperCase() + view.sessions.slice(1)
            }
          >
            <RateTriangle
              corners={corners}
              stats={stats}
              verb="finished"
              unit={view.sessions}
              focus={focus.sessionKind}
              onSelect={k => navigate('SportEvidence', { kind: k })}
            />
            <AppText variant="caption" muted>
              Each corner grows with the share of logged {view.sessions} you
              finished as planned. Tap a corner to see them.
            </AppText>
            {hasSample ? (
              <SampleMark text={`Includes sample ${view.sessions}.`} />
            ) : null}
          </Panel>

          {/* Distance and places */}
          <Panel title={view.placeLabel}>
            <View style={styles.between}>
              <PixelText text="This week" />
              <AppText variant="caption" muted>
                {weekDistance(state.logs, today)} {view.unit} in 7 days
              </AppText>
            </View>
            {sport.places.map(p => (
              <View key={p} style={styles.place}>
                <View style={styles.between}>
                  <View style={styles.fact}>
                    <Icon name={view.placeIcon[p]} />
                    <PixelText text={view.placeName[p]} />
                  </View>
                  <AppText variant="caption" muted>
                    {places[p].finished} of {places[p].logged} finished,{' '}
                    {places[p].distance} {view.unit}
                  </AppText>
                </View>
                <Pips
                  results={state.logs
                    .filter(l => l.place === p)
                    .map(l => l.finished)}
                  accessibilityLabel={`${view.placeName[p]}: ${places[p].finished} of ${places[p].logged} finished`}
                />
              </View>
            ))}
            <AppText variant="caption" muted>
              One square per {view.session}. Filled squares were finished as
              planned.
            </AppText>
          </Panel>

          {wide ? null : recentPanel}

          <PetsPanel />
        </Column>
      </Columns>

      <ResetSport />
    </TabScreen>
  );
}

/** Clears this pet only, in one tap; the other pets keep everything. */
function ResetSport() {
  const { view, resetSport } = useSport();
  return (
    <Panel variant="quiet">
      <View style={styles.inline}>
        <AppText variant="caption" style={styles.grow}>
          Start the {view.pet} over: deletes your {view.sessions}, flagged spots
          and {view.pet} quests. The other pets keep everything.
        </AppText>
        <Button
          title={`Reset ${view.sessions}`}
          icon="bin"
          variant="secondary"
          small
          onPress={resetSport}
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
  place: { gap: 6 },
});
