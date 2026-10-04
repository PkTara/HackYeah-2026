import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SessionLog } from '@hackyeah/core';
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
import { useCapabilities } from '../../capabilities';
import { PageHeader } from '../../components/PageHeader';
import { TabScreen } from '../../components/TabScreen';
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { sessionName } from '../../sports';
import { useSport } from '../../state/SportProvider';

/** How long "Saved: ..." stays under the button. */
const CONFIRM_MS = 2500;

type Draft = Omit<SessionLog, 'id' | 'date'>;

/**
 * Post-session check-in, the sport version of the climb log: pick the kind
 * (run type or stroke), where, distance, time and whether it went as
 * planned, then save.
 */
export function SportLogScreen() {
  const { reset } = useNavigation<RouteName>();
  const { haptics } = useCapabilities();
  const { sport, view, state, today, logSession, removeSession } = useSport();

  const [kind, setKind] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [finished, setFinished] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);

  useEffect(() => {
    if (!saved) {
      return;
    }
    const timer = setTimeout(() => setSaved(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [saved]);

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

  const save = () => {
    if (!draft) {
      return;
    }
    logSession(draft);
    haptics.tap();
    setSaved(draft);
    setFinished(null);
  };

  const todays = state.logs.filter(log => log.date === today).reverse();

  return (
    <TabScreen>
      <PageHeader title="Log" subtitle={view.logSubtitle} />

      <Columns>
        <Column>
          <Panel title={`Log a ${view.session}`}>
            <View style={styles.form}>
              <Group label={view.kindLabel}>
                <View style={styles.row}>
                  {sport.kinds.map(k => (
                    <View key={k} style={styles.cell}>
                      <Chip
                        tall
                        icon={view.kindIcon[k]}
                        label={view.kindName[k]}
                        selected={kind === k}
                        onPress={() => setKind(k)}
                      />
                    </View>
                  ))}
                </View>
                <AppText variant="caption" muted>
                  {kind ? view.kindHint[kind] : 'Pick the one that fits best.'}
                </AppText>
              </Group>

              <Group label={view.placeLabel}>
                <View style={styles.row}>
                  {sport.places.map(p => (
                    <View key={p} style={styles.cell}>
                      <Chip
                        icon={view.placeIcon[p]}
                        label={view.placeName[p]}
                        selected={place === p}
                        onPress={() => setPlace(p)}
                      />
                    </View>
                  ))}
                </View>
              </Group>

              <Group label="Distance">
                <View style={[styles.row, styles.wrap]}>
                  {view.distances.map(d => (
                    <View key={d} style={styles.numberCell}>
                      <Chip
                        label={`${d} ${view.unit}`}
                        selected={distance === d}
                        onPress={() => setDistance(d)}
                      />
                    </View>
                  ))}
                </View>
              </Group>

              <Group label="Time">
                <View style={[styles.row, styles.wrap]}>
                  {view.minutes.map(m => (
                    <View key={m} style={styles.numberCell}>
                      <Chip
                        label={`${m} min`}
                        selected={minutes === m}
                        onPress={() => setMinutes(m)}
                      />
                    </View>
                  ))}
                </View>
                <AppText variant="caption" muted>
                  Roughly is fine. The nearest one will do.
                </AppText>
              </Group>

              <Group label="Result">
                <View style={styles.row}>
                  <View style={styles.cell}>
                    <Chip
                      label="Finished"
                      selected={finished === true}
                      onPress={() => setFinished(true)}
                    />
                  </View>
                  <View style={styles.cell}>
                    <Chip
                      label="Cut short"
                      selected={finished === false}
                      onPress={() => setFinished(false)}
                    />
                  </View>
                </View>
                <AppText variant="caption" muted>
                  Finished means you did it as planned. Cutting short is fine,
                  it just tells the {view.pet} what to help with.
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
            <View style={styles.status}>
              <View accessibilityLiveRegion="polite">
                {saved ? (
                  <View style={styles.inline}>
                    <Icon name="check" />
                    <AppText variant="caption">
                      Saved: {sessionName(view, saved)},{' '}
                      {saved.finished ? 'finished' : 'cut short'}.
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
        </Column>

        <Column>
          <Panel title="Today" icon="log">
            {todays.length === 0 ? (
              <AppText>No {view.sessions} logged today yet.</AppText>
            ) : (
              todays.map(log => (
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
                    onPress={() => removeSession(log.id)}
                  />
                </View>
              ))
            )}
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

/** A labelled set of chips inside the form. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <PixelText text={label} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  cell: { flex: 1 },
  // Three per row on any phone width.
  numberCell: { flexBasis: '28%', flexGrow: 1 },
  status: { minHeight: 24, justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 4 },
  grow: { flex: 1 },
});
