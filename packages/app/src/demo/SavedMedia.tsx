import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Panel, Tag } from '@hackyeah/ui';
import { useDemo } from './DemoProvider';

type Saved = {
  date: string;
  value?: number;
  side?: string;
  region?: string;
  pain?: number | null;
  note?: string;
  simulated: boolean;
};

export function SavedMedia({ kind }: { kind: 'hands' | 'assessments' }) {
  const demo = useDemo();
  const [records, setRecords] = useState<Saved[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    if (!demo.settings.enabled || !demo.storage) {
      return;
    }
    demo.storage.getItem(`media/${kind}`).then(
      json => {
        if (!mounted) {
          return;
        }
        try {
          const value = JSON.parse(json ?? '[]');
          setRecords(
            Array.isArray(value)
              ? value
                  .filter(r => r && typeof r.date === 'string')
                  .slice(-5)
                  .reverse()
              : [],
          );
        } catch {
          setError(
            'Could not read the demo journal. Reset demo to start a fresh presentation.',
          );
        }
      },
      () => {
        if (mounted) {
          setError('Could not read the demo journal.');
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, [demo.settings.enabled, demo.storage, demo.revision, kind]);
  if (!demo.settings.enabled || (!records.length && !error)) {
    return null;
  }
  return (
    <Panel
      title={kind === 'hands' ? 'Demo hand journal' : 'Demo camera results'}
      badge={<Tag text="Demo profile" />}
    >
      {/* Your own entries start folded away. */}
      <View style={styles.row}>
        <AppText style={styles.grow}>
          {records.length === 1 ? '1 entry' : `${records.length} entries`}
        </AppText>
        {records.length ? (
          <Button
            title={open ? 'Hide' : 'Show'}
            variant="secondary"
            small
            accessibilityLabel={open ? 'Hide demo entries' : 'Show demo entries'}
            onPress={() => setOpen(!open)}
          />
        ) : null}
      </View>
      {(open ? records : []).map((r, i) => (
        <AppText key={i}>
          {kind === 'hands'
            ? `${r.side === 'left' ? 'Left' : 'Right'} ${r.region?.replace(
                /_/g,
                ' ',
              )}: ${r.pain === null ? 'sore, not rated' : 'pain ' + r.pain}${
                r.note ? '\n' + r.note : ''
              }`
            : `Leg spread: ${r.value}°`}
          {'\n'}
          {r.simulated ? 'Simulated' : 'Real capture in demo profile'} ·{' '}
          {r.date.slice(0, 10)}
        </AppText>
      ))}
      {kind === 'hands' ? (
        <AppText variant="caption">
          Simulated photo storage keeps the entry, with no photo bytes retained.
        </AppText>
      ) : null}
      {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
});
