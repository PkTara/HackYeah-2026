import { StyleSheet, View } from 'react-native';
import { sessionRecord } from '@hackyeah/core';
import { AppText, Button, Panel } from '@hackyeah/ui';
import { LogList, type LogItem } from '../../components/LogList';
import { PageHeader } from '../../components/PageHeader';
import { TabScreen } from '../../components/TabScreen';
import { useNavigation } from '../../navigation/Navigator';
import type { RouteName } from '../../navigation/routes';
import { sessionName } from '../../sports';
import { useSport } from '../../state/SportProvider';

/**
 * The sport modes' Log tab, the same shape as the climbing one: your runs
 * or swims, newest first, filtered by date. "Log run" (or swim) opens
 * Log > Log a run. All words come from the active sport's view.
 */
export function SportLogScreen() {
  const { params, navigate, reset } = useNavigation<RouteName>();
  const { sport, view, state, today, removeSession } = useSport();
  const items: LogItem[] = state.logs.map(log => ({
    id: log.id,
    date: log.date,
    done: log.finished,
    sample: log.sample,
    name: `${sessionName(view, log)}, ${view.placeName[
      log.place
    ].toLowerCase()}`,
    record: sessionRecord(log, view, sport.pace),
  }));

  return (
    <TabScreen single>
      <PageHeader title="Log" subtitle={`Every ${view.session} you logged.`} />
      <LogList
        items={items}
        today={today}
        title={`Your ${view.sessions}`}
        one={view.session}
        many={view.sessions}
        doneWord="finished"
        logTitle={`Log ${view.session}`}
        onLog={() => navigate('SportLogSession', { session: view.session })}
        highlight={params.saved}
        onRemove={item => removeSession(item.id)}
      />

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
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
});
