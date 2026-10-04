import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  MIN_RUNS,
  RUN_TYPES,
  SURFACES,
  ageLabel,
  paceText,
  runTallies,
  shortDate,
  surfaceTallies,
  type RunLog,
  type RunType,
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
import { Crumbs } from '../../components/Crumbs';
import { PageHeader } from '../../components/PageHeader';
import { TabScreen } from '../../components/TabScreen';
import {
  RUN_TYPE_ICON,
  RUN_TYPE_NAME,
  SURFACE_ICON,
  SURFACE_NAME,
} from '../../labels';
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { useRun } from '../../state/RunProvider';

/**
 * The runs behind one corner of the run triangle, so every statement on the
 * gazelle profile can be checked against what was actually logged.
 */
export function RunEvidenceScreen() {
  const { params, reset } = useNavigation<RouteName>();
  const { state, today, focus } = useRun();
  const [type, setType] = useState<RunType>(
    () => RUN_TYPES.find(t => t === params.type) ?? focus.type,
  );

  const name = RUN_TYPE_NAME[type];
  const tally = runTallies(state.runs)[type];
  const isFocus = focus.type === type;
  const toGo = MIN_RUNS - tally.logged;
  const ofType = state.runs.filter(run => run.type === type);
  const ground = surfaceTallies(ofType);
  // Newest first. Runs are stored in the order they were added.
  const runs = [...ofType]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Evidence"
        subtitle="The runs behind each corner of your profile."
      />

      <View style={styles.switcher}>
        {RUN_TYPES.map(t => (
          <View key={t} style={styles.grow}>
            <Chip
              tall
              icon={RUN_TYPE_ICON[t]}
              label={RUN_TYPE_NAME[t]}
              selected={t === type}
              onPress={() => setType(t)}
            />
          </View>
        ))}
      </View>

      <Columns>
        <Column>
          <Panel
            title={name}
            icon={RUN_TYPE_ICON[type]}
            badge={isFocus ? <Tag text="Your focus" tone="focus" /> : undefined}
          >
            <PixelText
              text={
                tally.logged === 0
                  ? 'None logged'
                  : `${tally.finished} of ${tally.logged} finished`
              }
              scale={4}
            />
            {tally.rate === null ? (
              <AppText>
                Needs {toGo} more logged {toGo === 1 ? 'run' : 'runs'} before it
                is compared with the other run types.
              </AppText>
            ) : null}
            {isFocus ? (
              <AppText>
                {focus.kind === 'practice'
                  ? 'This is your focus: the lowest share of runs finished as planned.'
                  : 'This is your focus: it has the fewest logged runs, so the gazelle asks for more here first.'}
              </AppText>
            ) : null}
            {runs.length > 0 ? (
              <AppText variant="caption" muted>
                {tally.km} km in total. Last logged{' '}
                {ageLabel(runs[0].date, today)}, {shortDate(runs[0].date)}.
              </AppText>
            ) : null}
            <AppText variant="caption" muted>
              The focus goes to the run type with the lowest share of finished
              runs once every type has at least {MIN_RUNS} logged runs.
            </AppText>
          </Panel>

          <Panel title="Ground">
            {SURFACES.map(s => (
              <View key={s} style={styles.inline}>
                <Icon name={SURFACE_ICON[s]} />
                <AppText style={styles.grow}>{SURFACE_NAME[s]}</AppText>
                <AppText variant="caption" muted>
                  {ground[s].logged === 0
                    ? 'none yet'
                    : `${ground[s].finished} of ${ground[s].logged} finished`}
                </AppText>
              </View>
            ))}
          </Panel>
        </Column>

        <Column>
          <Panel
            title="Runs"
            icon="log"
            badge={
              runs.some(r => r.sample) ? <Tag text="Example" /> : undefined
            }
          >
            {runs.length === 0 ? (
              <AppText>No {name.toLowerCase()} runs logged yet.</AppText>
            ) : (
              runs.map(run => <RunRow key={run.id} run={run} />)
            )}
            <Button
              title="Log a run"
              icon="log"
              onPress={() => reset('RunLog')}
            />
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
  );
}

function RunRow({ run }: { run: RunLog }) {
  const { colors: c } = useTheme();
  const pace = paceText(run.km, run.minutes);
  return (
    <View style={styles.run}>
      <View
        style={[
          styles.distance,
          { backgroundColor: c.surfaceShade, borderColor: c.outline },
        ]}
      >
        <PixelText text={`${Math.round(run.km)}`} scale={3} />
        <AppText variant="caption">km</AppText>
      </View>
      <View style={styles.grow}>
        <AppText>
          {SURFACE_NAME[run.surface]}, {run.minutes} min
        </AppText>
        <AppText variant="caption" muted>
          {shortDate(run.date)}
          {pace ? `, ${pace}` : ''}
          {run.sample ? ' (example)' : ''}
        </AppText>
      </View>
      <View>
        <Tag
          text={run.finished ? 'Finished' : 'Cut short'}
          tone={run.finished ? 'new' : 'muted'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  run: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  distance: {
    width: 52,
    height: 52,
    borderWidth: PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
