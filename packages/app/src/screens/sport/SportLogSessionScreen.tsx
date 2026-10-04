import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { talliesBy, type SessionLog, type SportFocus } from '@hackyeah/core';
import { AppText, Button, Chip, Panel, PixelText } from '@hackyeah/ui';
import { sessionSaved } from '../../afterSave';
import { useCapabilities } from '../../capabilities';
import { Crumbs } from '../../components/Crumbs';
import { PageHeader } from '../../components/PageHeader';
import { SavedNote } from '../../components/SavedNote';
import { TabScreen } from '../../components/TabScreen';
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { sessionName } from '../../sports';
import { useSport } from '../../state/SportProvider';

type Draft = Omit<SessionLog, 'id' | 'date'>;

/**
 * Log > Log a run (or swim). Post-session check-in, the sport version of
 * Log a climb: pick the kind (run type or stroke), where, distance, time
 * and whether it went as planned, then save. Like the climb form, a save
 * leaves a note on what it changed until the next session is started.
 */
export function SportLogSessionScreen() {
  const { reset, openTrail } = useNavigation<RouteName>();
  const { haptics } = useCapabilities();
  const { sport, view, state, focus, logSession } = useSport();

  const [kind, setKind] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [finished, setFinished] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<{
    id: string;
    draft: Draft;
    before: SportFocus;
  } | null>(null);

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
    const id = logSession(draft);
    haptics.tap();
    setSaved({ id, draft, before: focus });
    setFinished(null);
  };

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
    <TabScreen single>
      <Crumbs />
      <PageHeader title={`Log a ${view.session}`} subtitle={view.logSubtitle} />

      <Panel title={`This ${view.session}`}>
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
        {saved && message ? (
          <SavedNote
            title={message.title}
            lines={message.lines}
            next={[
              {
                title: `See your ${view.sessions}`,
                onPress: () =>
                  openTrail([
                    { route: 'SportLog', params: { saved: saved.id } },
                  ]),
              },
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
});
