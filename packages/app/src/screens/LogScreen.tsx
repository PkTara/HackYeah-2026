import { climbRecord, type ClimbLog } from '@hackyeah/core';
import { AppText } from '@hackyeah/ui';
import { LogList, type LogItem } from '../components/LogList';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { TERRAIN_NAME, styleText } from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';

/** "V3 vertical, controlled and dynamic" */
function describe(log: ClimbLog) {
  return `${log.grade} ${TERRAIN_NAME[log.terrain].toLowerCase()}, ${styleText(
    log.movements,
  )}`;
}

/**
 * The Log tab: the climbs you logged, newest first, filtered to today, this
 * week, this month or all of them. "Log climb" opens Log > Log a climb.
 * Coming back from a save, the new climb is framed (the `saved` param).
 */
export function LogScreen() {
  const { params, navigate } = useNavigation<RouteName>();
  const { state, today, removeClimb } = useGame();
  const items: LogItem[] = state.logs.map(log => ({
    id: log.id,
    date: log.date,
    done: log.sent,
    sample: log.sample,
    name: describe(log),
    record: climbRecord(log),
  }));

  return (
    <TabScreen single>
      <PageHeader
        title="Log"
        subtitle="Every climb you logged. Each one shapes your walls, styles and focus."
      />
      <LogList
        items={items}
        today={today}
        title="Your climbs"
        one="climb"
        many="climbs"
        doneWord="sent"
        logTitle="Log climb"
        onLog={() => navigate('LogClimb')}
        highlight={params.saved}
        onRemove={item => removeClimb(item.id)}
      >
        <AppText variant="caption" muted>
          Sore fingers go on the Hands tab.
        </AppText>
      </LogList>
    </TabScreen>
  );
}
