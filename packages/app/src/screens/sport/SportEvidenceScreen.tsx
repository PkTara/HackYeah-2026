import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  MIN_SESSIONS,
  ageLabel,
  shortDate,
  talliesBy,
  type SessionLog,
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
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { useSport } from '../../state/SportProvider';

/**
 * The sessions behind one corner of a sport profile's triangle, so every
 * statement on the profile can be checked against what was actually logged.
 */
export function SportEvidenceScreen() {
  const { params, reset } = useNavigation<RouteName>();
  const { sport, view, state, today, focus } = useSport();
  const [kind, setKind] = useState<string>(
    () => sport.kinds.find(k => k === params.kind) ?? focus.sessionKind,
  );

  const name = view.kindName[kind];
  const tally = talliesBy(state.logs, 'kind', [kind])[kind];
  const isFocus = focus.sessionKind === kind;
  const toGo = MIN_SESSIONS - tally.logged;
  const ofKind = state.logs.filter(log => log.kind === kind);
  const places = talliesBy(ofKind, 'place', sport.places);
  // Newest first. Logs are stored in the order they were added.
  const logs = [...ofKind]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Evidence"
        subtitle="What is behind each corner of your profile."
      />

      <View style={styles.switcher}>
        {sport.kinds.map(k => (
          <View key={k} style={styles.grow}>
            <Chip
              tall
              icon={view.kindIcon[k]}
              label={view.kindName[k]}
              selected={k === kind}
              onPress={() => setKind(k)}
            />
          </View>
        ))}
      </View>

      <Columns>
        <Column>
          <Panel
            title={name}
            icon={view.kindIcon[kind]}
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
                Needs {toGo} more logged{' '}
                {toGo === 1 ? view.session : view.sessions} before it is
                compared with the other {view.kindPlural}.
              </AppText>
            ) : null}
            {isFocus ? (
              <AppText>
                {focus.kind === 'practice'
                  ? `This is your focus: the lowest share of ${view.sessions} finished as planned.`
                  : `This is your focus: it has the fewest logged ${view.sessions}, so the ${view.pet} asks for more here first.`}
              </AppText>
            ) : null}
            {logs.length > 0 ? (
              <AppText variant="caption" muted>
                {tally.distance} {view.unit} in total. Last logged{' '}
                {ageLabel(logs[0].date, today)}, {shortDate(logs[0].date)}.
              </AppText>
            ) : null}
            <AppText variant="caption" muted>
              The focus goes to the lowest share finished once each of the three
              has at least {MIN_SESSIONS} logged {view.sessions}.
            </AppText>
          </Panel>

          <Panel title={view.placeLabel}>
            {sport.places.map(p => (
              <View key={p} style={styles.inline}>
                <Icon name={view.placeIcon[p]} />
                <AppText style={styles.grow}>{view.placeName[p]}</AppText>
                <AppText variant="caption" muted>
                  {places[p].logged === 0
                    ? 'none yet'
                    : `${places[p].finished} of ${places[p].logged} finished`}
                </AppText>
              </View>
            ))}
          </Panel>
        </Column>

        <Column>
          <Panel
            title={
              view.sessions.charAt(0).toUpperCase() + view.sessions.slice(1)
            }
            icon="log"
            badge={
              logs.some(l => l.sample) ? <Tag text="Example" /> : undefined
            }
          >
            {logs.length === 0 ? (
              <AppText>
                No {name.toLowerCase()} {view.sessions} logged yet.
              </AppText>
            ) : (
              logs.map(log => <SessionRow key={log.id} log={log} />)
            )}
            <Button
              title={`Log a ${view.session}`}
              icon="log"
              onPress={() => reset('SportLog')}
            />
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
  );
}

function SessionRow({ log }: { log: SessionLog }) {
  const { colors: c } = useTheme();
  const { sport, view } = useSport();
  const pace = sport.pace(log.distance, log.minutes);
  return (
    <View style={styles.session}>
      <View
        style={[
          styles.distance,
          { backgroundColor: c.surfaceShade, borderColor: c.outline },
        ]}
      >
        <PixelText
          text={`${Math.round(log.distance)}`}
          scale={log.distance >= 1000 ? 2 : 3}
        />
        <AppText variant="caption">{view.unit}</AppText>
      </View>
      <View style={styles.grow}>
        <AppText>
          {view.placeName[log.place]}, {log.minutes} min
        </AppText>
        <AppText variant="caption" muted>
          {shortDate(log.date)}
          {pace ? `, ${pace}` : ''}
          {log.sample ? ' (example)' : ''}
        </AppText>
      </View>
      <View>
        <Tag
          text={log.finished ? 'Finished' : 'Cut short'}
          tone={log.finished ? 'new' : 'muted'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  distance: {
    width: 56,
    height: 52,
    borderWidth: PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
