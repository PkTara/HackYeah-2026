import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { sampleLogs, type ClimbLog, type Movement } from '@hackyeah/core';
import { StyleTallies } from '../components/StyleTallies';

function climb(id: string, movements: Movement[], sent: boolean): ClimbLog {
  return {
    id,
    date: '2026-10-01',
    terrain: 'vertical',
    movements,
    holds: [],
    grade: 'V3',
    sent,
  };
}

async function render(logs: readonly ClimbLog[]) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<StyleTallies logs={logs} />);
  });
  return renderer;
}

const rows = (renderer: ReactTestRenderer) =>
  renderer.root
    .findAll(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Why: ') &&
        typeof node.props.onPress === 'function',
    )
    .map(node => node.props.accessibilityLabel as string)
    .filter((label, i, all) => all.indexOf(label) === i);

const folded = (renderer: ReactTestRenderer) =>
  renderer.root.findAll(node => node.props.testID === 'styles-not-logged')[0]
    ?.props.children;

it('shows one row per logged style, most logged first, and folds the rest into one line', async () => {
  const renderer = await render(sampleLogs);
  expect(rows(renderer)).toEqual(['Why: Controlled tally', 'Why: Dynamic tally']);
  expect(folded(renderer)).toBe(
    'Not logged yet: technical, powerful, balance, coordination, compression, endurance.',
  );
  await act(async () => renderer.unmount());
});

it('keeps one fixed-height row per style however many climbs there are', async () => {
  const many = Array.from({ length: 60 }, (_, i) =>
    climb(`c${i}`, ['technical'], i % 2 === 0),
  );
  const renderer = await render(many);
  expect(rows(renderer)).toEqual(['Why: Technical tally']);
  const row = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Why: Technical tally' &&
      node.props.accessibilityValue,
  );
  expect(row.props.accessibilityValue).toEqual({ text: '30 of 60 sent' });
  await act(async () => renderer.unmount());
});

it('says nothing is logged instead of eight empty rows', async () => {
  const renderer = await render([]);
  expect(rows(renderer)).toEqual([]);
  expect(folded(renderer)).toBeUndefined();
  expect(JSON.stringify(renderer.toJSON())).toContain('No styles logged yet');
  await act(async () => renderer.unmount());
});

it('opens the style sheet from the whole row', async () => {
  const renderer = await render([
    climb('a', ['balance'], true),
    climb('b', ['balance', 'endurance'], false),
  ]);
  expect(rows(renderer)).toEqual(['Why: Balance tally', 'Why: Endurance tally']);
  const row = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Why: Balance tally' &&
      typeof node.props.onPress === 'function',
  );
  await act(async () => row.props.onPress());
  expect(JSON.stringify(renderer.toJSON())).toContain('balance climbs');
  await act(async () => renderer.unmount());
});
