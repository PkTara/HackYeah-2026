import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  dayHeading,
  defaultRange,
  filterLogs,
  groupByDay,
  type EvidenceRecord,
  type LogRange,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Chip,
  Panel,
  PixelText,
  SampleMark,
} from '@hackyeah/ui';
import { RecordRow } from './RecordRow';

/** One logged climb or session, already drawn as a record. */
export type LogItem = Readonly<{
  id: string;
  date: string;
  /** Sent, or finished as planned. */
  done: boolean;
  sample?: boolean;
  /** Short spoken name for its Remove button: "V3 vertical, controlled". */
  name: string;
  record: EvidenceRecord;
}>;

const FILTERS: readonly Readonly<{
  range: LogRange;
  label: string;
  spoken: string;
}>[] = [
  { range: 'today', label: 'Today', spoken: 'Today' },
  { range: 'week', label: 'Week', spoken: 'This week' },
  { range: 'month', label: 'Month', spoken: 'This month' },
  { range: 'all', label: 'All', spoken: 'All time' },
];

const WHEN: Readonly<Record<LogRange, string>> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
  all: 'in total',
};

/**
 * The Log tab: what you logged, newest first and grouped by day, with
 * filter keys for today, this week, this month or everything. The tray's
 * top right holds the button to log another. Climbs and sport sessions
 * share it; the caller passes the words.
 */
export function LogList({
  items,
  today,
  title,
  one,
  many,
  doneWord,
  logTitle,
  onLog,
  highlight,
  onRemove,
  children,
}: {
  items: readonly LogItem[];
  today: string;
  /** Tray title: "Your climbs". */
  title: string;
  /** "climb" and "climbs". */
  one: string;
  many: string;
  /** "sent", "finished". */
  doneWord: string;
  /** "Log climb": the button in the tray's top right. */
  logTitle: string;
  onLog: () => void;
  /** The id of a record that was just saved, framed in the list. */
  highlight?: string;
  /** Today's records can be removed, as on the old list. */
  onRemove?: (item: LogItem) => void;
  /** Quiet lines at the end of the tray. */
  children?: ReactNode;
}) {
  // A fresh save is always in this week.
  const [range, setRange] = useState<LogRange>(() =>
    highlight ? 'week' : defaultRange(items, today),
  );
  const shown = filterLogs(items, range, today);
  const done = shown.filter(item => item.done).length;
  const samples = shown.filter(item => item.sample).length;
  const logA = `Log a ${one}`;
  // "9 climbs this week: 4 sent."
  const summary = `${shown.length} ${shown.length === 1 ? one : many} ${
    WHEN[range]
  }: ${done} ${doneWord}.`;

  return (
    <>
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <View key={f.range} style={styles.filter}>
            <Chip
              label={f.label}
              accessibilityLabel={f.spoken}
              selected={range === f.range}
              onPress={() => setRange(f.range)}
            />
          </View>
        ))}
      </View>

      <Panel
        title={title}
        icon="log"
        action={<Button title={logTitle} small onPress={onLog} />}
      >
        {shown.length === 0 ? (
          <View style={styles.empty}>
            <AppText>
              {range === 'all'
                ? `No ${many} logged yet. Log your first one after a session.`
                : `No ${many} ${WHEN[range]}. Log one.`}
            </AppText>
            <Button title={logA} icon="log" onPress={onLog} />
          </View>
        ) : (
          <>
            <AppText style={styles.strong}>{summary}</AppText>
            {samples > 0 ? (
              <SampleMark
                text={
                  samples === shown.length
                    ? `Sample ${many}, not your own.`
                    : `Includes sample ${many}.`
                }
              />
            ) : null}
            {groupByDay(shown).map(group => (
              <View key={group.date} style={styles.day}>
                <PixelText text={dayHeading(group.date, today)} heading />
                {group.logs.map(item => (
                  <RecordRow
                    key={item.id}
                    // The day heading already gives the date.
                    record={
                      item.record.view
                        ? {
                            ...item.record,
                            view: { ...item.record.view, when: undefined },
                          }
                        : item.record
                    }
                    highlight={item.id === highlight}
                    action={
                      onRemove && item.date === today ? (
                        <Button
                          title="Remove"
                          variant="secondary"
                          small
                          accessibilityLabel={`Remove ${item.name}`}
                          onPress={() => onRemove(item)}
                        />
                      ) : undefined
                    }
                  />
                ))}
              </View>
            ))}
          </>
        )}
        {children}
      </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8 },
  filter: { flexGrow: 1 },
  empty: { gap: 12 },
  day: { gap: 10, paddingTop: 4 },
  strong: { fontWeight: '800' },
});
