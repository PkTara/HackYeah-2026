import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { talliesBy, type SessionLog, type SportFocus } from '@hackyeah/core';
import {
  AppText,
  Button,
  Chip,
  Column,
  Columns,
  Icon,
  Panel,
  PixelText,
  Tag,
} from '@hackyeah/ui';
import { sessionSaved } from '../../afterSave';
import { useCapabilities } from '../../capabilities';
import { PageHeader } from '../../components/PageHeader';
import { SavedNote } from '../../components/SavedNote';
import { TabScreen } from '../../components/TabScreen';
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { sessionName } from '../../sports';
import { useSport } from '../../state/SportProvider';

type Draft = Omit<SessionLog, 'id' | 'date'>;

/**
 * Post-session check-in, the sport version of the climb log: pick the kind
 * (run type or stroke), where, distance, time and whether it went as
 * planned, then save. Like the climb log, a save leaves a note on what it
 * changed until the next session is started, and today's list starts folded.
 */
export function SportLogScreen() {
  const { reset } = useNavigation<RouteName>();
  const { haptics } = useCapabilities();
  const { sport, view, state, today, focus, logSession, removeSession } =
    useSport();

  const [kind, setKind] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [finished, setFinished] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<{
    draft: Draft;
    before: SportFocus;
  } | null>(null);
  const [showToday, setShowToday] = useState(false);

  /** "5 km easy, road, 6:12 /km" */
  const describe = (log: Draft) => {
    const pace = sport.pace(log.distance, log.minutes);
    return `${sessionName(view, log)}, ${view.placeName[
      log.place
    ].toLowerCase()}${pace ? `, ${pace}` : ''}`;
  };

  const draft: Draft | null =
    kind && place && distance && minutes && finished !== null
      ? { kind, place, distance, minutes, finished }
      : null;
  const missing = [
    !kind && view.kindLabel.toLowerCase(),
    !place && view.placeLabel.toLowerCase(),
    !distance && 'distance',
    !minutes && 'time',
    finished === null && 'result',
  ].filter(Boolean);

  /** Any change starts the next session, so the last save's note goes. */
  const change = (apply: () => void) => {
    setSaved(null);
    apply();
  };

  const save = () => {
    if (!draft) {
      return;
    }
    logSession(draft);
    haptics.tap();
    setSaved({ draft, before: focus });
    setFinished(null);
  };

  const todays = state.logs.filter(log => log.date === today).reverse();
  const message = saved
    ? sessionSaved(
        sessionName(view, saved.draft),
        saved.draft.finished,
        view.kindName[saved.draft.kind],
        talliesBy(state.logs, 'kind', sport.kinds)[saved.draft.kind],
        saved.before,
        focus,
        view.kindName,
        view.pet,
      )
    : null;

  return (
    <TabScreen>
      <PageHeader title="Log" subtitle={view.logSubtitle} />

      <Columns>
        <Column>
          <Panel title={`Log a ${view.session}`}>
            <View style={styles.form}>
              <Group label={view.kindLabel} need="Pick one">
                <View style={styles.row}>
                  {sport.kinds.map(k => (
                    <View key={k} style={styles.cell}>
                      <Chip
                        tall
                        icon={view.kindIcon[k]}
                        label={view.kindName[k]}
                        selected={kind === k}
                        onPress={() => change(() => setKind(k))}
                      />
                    </View>
                  ))}
                </View>
                <AppText variant="caption" muted>
                  {kind ? view.kindHint[kind] : 'Pick the one that fits best.'}
                </AppText>
              </Group>

              <Group label={view.placeLabel} need="Pick one">
                <View style={styles.row}>
                  {sport.places.map(p => (
                    <View key={p} style={styles.cell}>
                      <Chip
                        icon={view.placeIcon[p]}
                        label={view.placeName[p]}
                        selected={place === p}
                        onPress={() => change(() => setPlace(p))}
                      />
                    </View>
                  ))}
                </View>
              </Group>

              <Group label="Distance" need="Nearest">
                <View style={[styles.row, styles.wrap]}>
                  {view.distances.map(d => (
                    <View key={d} style={styles.numberCell}>
                      <Chip
                        label={`${d} ${view.unit}`}
                        selected={distance === d}
                        onPress={() => change(() => setDistance(d))}
                      />
                    </View>
                  ))}
                </View>
              </Group>

              <Group label="Time" need="Nearest">
                <View style={[styles.row, styles.wrap]}>
                  {view.minutes.map(m => (
                    <View key={m} style={styles.numberCell}>
                      <Chip
                        label={`${m} min`}
                        selected={minutes === m}
                        onPress={() => change(() => setMinutes(m))}
                      />
                    </View>
                  ))}
                </View>
              </Group>

              <Group label="Result" need="Pick one">
                <View style={styles.row}>
                  <View style={styles.cell}>
                    <Chip
                      label="Finished"
                      selected={finished === true}
                      onPress={() => change(() => setFinished(true))}
                    />
                  </View>
                  <View style={styles.cell}>
                    <Chip
                      label="Cut short"
                      selected={finished === false}
                      onPress={() => change(() => setFinished(false))}
                    />
                  </View>
                </View>
                <AppText variant="caption" muted>
                  Finished means as planned. Cutting short is fine; it tells the{' '}
                  {view.pet} what to help with.
                </AppText>
              </Group>
            </View>

            <Button
              title={`Save ${view.session}`}
              icon="check"
              disabled={!draft}
              onPress={save}
              accessibilityHint={
                draft ? undefined : `Still to pick: ${missing.join(', ')}`
              }
            />
            {message ? (
              <SavedNote
                title={message.title}
                lines={message.lines}
                next={[
                  {
                    title: 'See profile',
                    accessibilityLabel: 'See your profile',
                    onPress: () => reset('SportProfile'),
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
        </Column>

        <Column>
          <Panel title="Today" icon="log">
            <View style={styles.inline}>
              <AppText style={styles.grow}>
                {todays.length === 0
                  ? `No ${view.sessions} logged today yet.`
                  : `${todays.length} ${
                      todays.length === 1 ? view.session : view.sessions
                    } logged today.`}
              </AppText>
              {todays.length > 0 ? (
                <Button
                  title={showToday ? 'Hide' : 'Show'}
                  variant="secondary"
                  small
                  accessibilityLabel={
                    showToday
                      ? `Hide today's ${view.sessions}`
                      : `Show today's ${view.sessions}`
                  }
                  onPress={() => setShowToday(!showToday)}
                />
              ) : null}
            </View>
            {showToday
              ? todays.map(log => (
                  <View key={log.id} style={styles.inline}>
                    <Icon name={view.kindIcon[log.kind]} />
                    <View style={styles.rowText}>
                      <AppText>{describe(log)}</AppText>
                      <Tag
                        text={log.finished ? 'Finished' : 'Cut short'}
                        tone={log.finished ? 'new' : 'muted'}
                      />
                    </View>
                    <Button
                      title="Remove"
                      variant="secondary"
                      small
                      accessibilityLabel={`Remove ${describe(log)}`}
                      onPress={() => change(() => removeSession(log.id))}
                    />
                  </View>
                ))
              : null}
          </Panel>

          <Panel variant="quiet">
            <View style={styles.inline}>
              <AppText style={styles.grow}>Anything sore?</AppText>
              <Button
                title={`Check ${view.bodyTab.toLowerCase()}`}
                variant="secondary"
                small
                onPress={() => reset('SportBody')}
                accessibilityHint={`Opens the ${view.bodyTab} tab`}
              />
            </View>
          </Panel>
        </Column>
      </Columns>
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
  // Three per row on any phone width.
  numberCell: { flexBasis: '28%', flexGrow: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 4 },
  grow: { flex: 1 },
});
