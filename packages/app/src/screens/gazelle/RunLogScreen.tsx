import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  RUN_TYPES,
  SURFACES,
  paceText,
  type RunLog,
  type RunType,
  type Surface,
} from '@hackyeah/core';
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
import {
  RUN_DISTANCES,
  RUN_MINUTES,
  RUN_TYPE_HINT,
  RUN_TYPE_ICON,
  RUN_TYPE_NAME,
  SURFACE_ICON,
  SURFACE_NAME,
  runName,
} from '../../labels';
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { useRun } from '../../state/RunProvider';

/** How long "Saved: ..." stays under the button. */
const CONFIRM_MS = 2500;

type Draft = Omit<RunLog, 'id' | 'date'>;

/** "5 km easy, road, 6:12 /km" */
function describe(run: Draft) {
  const pace = paceText(run.km, run.minutes);
  return `${runName(run)}, ${SURFACE_NAME[run.surface].toLowerCase()}${
    pace ? `, ${pace}` : ''
  }`;
}

/**
 * Post-run check-in, the gazelle's version of the climb log: pick run type,
 * ground, distance, time and whether it went as planned, then save.
 */
export function RunLogScreen() {
  const { reset } = useNavigation<RouteName>();
  const { haptics } = useCapabilities();
  const { state, today, logRun, removeRun } = useRun();

  const [type, setType] = useState<RunType | null>(null);
  const [surface, setSurface] = useState<Surface | null>(null);
  const [km, setKm] = useState<number | null>(null);
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

  const draft: Draft | null =
    type && surface && km && minutes && finished !== null
      ? { type, surface, km, minutes, finished }
      : null;
  const missing = [
    !type && 'run type',
    !surface && 'ground',
    !km && 'distance',
    !minutes && 'time',
    finished === null && 'result',
  ].filter(Boolean);

  const save = () => {
    if (!draft) {
      return;
    }
    logRun(draft);
    haptics.tap();
    setSaved(draft);
    setFinished(null);
  };

  const todays = state.runs.filter(run => run.date === today).reverse();

  return (
    <TabScreen>
      <PageHeader title="Log" subtitle="Tap it in while you cool down." />

      <Columns>
        <Column>
          <Panel title="Log a run">
            <View style={styles.form}>
              <Group label="Run type">
                <View style={styles.row}>
                  {RUN_TYPES.map(t => (
                    <View key={t} style={styles.cell}>
                      <Chip
                        tall
                        icon={RUN_TYPE_ICON[t]}
                        label={RUN_TYPE_NAME[t]}
                        selected={type === t}
                        onPress={() => setType(t)}
                      />
                    </View>
                  ))}
                </View>
                <AppText variant="caption" muted>
                  {type ? RUN_TYPE_HINT[type] : 'Pick the one that fits best.'}
                </AppText>
              </Group>

              <Group label="Ground">
                <View style={styles.row}>
                  {SURFACES.map(s => (
                    <View key={s} style={styles.cell}>
                      <Chip
                        icon={SURFACE_ICON[s]}
                        label={SURFACE_NAME[s]}
                        selected={surface === s}
                        onPress={() => setSurface(s)}
                      />
                    </View>
                  ))}
                </View>
              </Group>

              <Group label="Distance">
                <View style={[styles.row, styles.wrap]}>
                  {RUN_DISTANCES.map(d => (
                    <View key={d} style={styles.numberCell}>
                      <Chip
                        label={`${d} km`}
                        selected={km === d}
                        onPress={() => setKm(d)}
                      />
                    </View>
                  ))}
                </View>
              </Group>

              <Group label="Time">
                <View style={[styles.row, styles.wrap]}>
                  {RUN_MINUTES.map(m => (
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
                  Finished means you ran it as planned. Cutting short is fine,
                  it just tells the gazelle what to help with.
                </AppText>
              </Group>
            </View>

            <Button
              title="Save run"
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
                      Saved: {runName(saved)},{' '}
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
              <AppText>No runs logged today yet.</AppText>
            ) : (
              todays.map(run => (
                <View key={run.id} style={styles.inline}>
                  <Icon name={RUN_TYPE_ICON[run.type]} />
                  <View style={styles.rowText}>
                    <AppText>{describe(run)}</AppText>
                    <Tag
                      text={run.finished ? 'Finished' : 'Cut short'}
                      tone={run.finished ? 'new' : 'muted'}
                    />
                  </View>
                  <Button
                    title="Remove"
                    variant="secondary"
                    small
                    accessibilityLabel={`Remove ${describe(run)}`}
                    onPress={() => removeRun(run.id)}
                  />
                </View>
              ))
            )}
          </Panel>

          <Panel variant="quiet">
            <View style={styles.inline}>
              <AppText style={styles.grow}>Legs feeling it?</AppText>
              <Button
                title="Check legs"
                variant="secondary"
                small
                onPress={() => reset('Legs')}
                accessibilityHint="Opens the Legs tab"
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
  // Three or four per row on any phone width.
  numberCell: { flexBasis: '28%', flexGrow: 1 },
  status: { minHeight: 24, justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 4 },
  grow: { flex: 1 },
});
