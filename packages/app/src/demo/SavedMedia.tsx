import { useEffect, useState } from 'react';
import { AppText, Panel, Tag } from '@hackyeah/ui';
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
      {records.map((r, i) => (
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
