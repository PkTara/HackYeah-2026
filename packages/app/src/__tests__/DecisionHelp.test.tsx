import ReactTestRenderer, { act } from 'react-test-renderer';
import { BASELINE_TESTS } from '@hackyeah/core';
import {
  explainHomeTest,
  explainReach,
} from '../components/resultExplanations';
import { Linking, View } from 'react-native';
import { DecisionHelp } from '../components/DecisionHelp';
import { press, text, control, type Renderer } from '../testing/cameraFixture';

const source = {
  id: 'original-paper',
  title: 'Original paper',
  authors: 'Researchers',
  year: 2024,
  url: 'https://doi.org/10.1234/paper',
  studyType: 'Observational',
  population: 'Climbers',
  readingDepth: 'Abstract',
  supports: 'An association only',
  limitations: ['No app validation'],
  verifiedAt: '2026-10-04',
};
const explanation = {
  summary: 'A count from your climbs',
  status: 'app_rule' as const,
  rule: 'Count matching records',
  evidence: [
    { id: 'log-7', label: 'Climb on 2026-10-03', detail: 'Vertical; sent; V2' },
  ],
  sourceIds: ['original-paper'],
  limitations: ['Self-reported'],
};
async function render() {
  let screen!: Renderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <DecisionHelp
        label="focus"
        explanation={explanation}
        sources={[source]}
      />,
    );
  });
  return screen;
}

it('starts collapsed and toggles actual records, rule, limitations and original paper link', async () => {
  const screen = await render();
  expect(text(screen)).not.toContain('Count matching records');
  await press(screen, 'Why focus?');
  expect(control(screen, 'Why focus?')?.props.accessibilityState.expanded).toBe(
    true,
  );
  expect(text(screen)).toContain('log-7');
  expect(text(screen)).toContain('Climb on 2026-10-03');
  expect(text(screen)).toContain('Vertical; sent; V2');
  expect(text(screen)).toContain('Count matching records');
  expect(text(screen)).toContain('Self-reported');
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await press(screen, 'Open original paper: Original paper');
  expect(open).toHaveBeenCalledWith(source.url);
  open.mockRestore();
  await press(screen, 'Why focus?');
  expect(text(screen)).not.toContain('Count matching records');
  await act(async () => screen.unmount());
});

it('reports missing research and provenance honestly for a legacy explanation', async () => {
  let screen!: Renderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <DecisionHelp
        label="legacy quest"
        explanation={{
          ...explanation,
          evidence: [],
          sourceIds: ['missing-paper'],
        }}
        sources={[source]}
      />,
    );
  });
  await press(screen, 'Why legacy quest?');
  expect(text(screen)).toContain('Input records unavailable');
  expect(text(screen)).toContain('Source unavailable: missing-paper');
  await act(async () => screen.unmount());
});

it('shows a failed paper opening and allows retry', async () => {
  const screen = await render();
  const open = jest
    .spyOn(Linking, 'openURL')
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(undefined);
  await press(screen, 'Why focus?', 'Open original paper: Original paper');
  expect(text(screen)).toContain('Could not open this paper. Try again.');
  await press(screen, 'Open original paper: Original paper');
  expect(text(screen)).not.toContain('Could not open this paper');
  open.mockRestore();
  await act(async () => screen.unmount());
});

it('distinguishes generated local display references from unavailable original record IDs', async () => {
  let screen!: Renderer;
  const test = BASELINE_TESTS.find(t => t.id === 'pull-ups')!;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <View>
        <DecisionHelp
          label="saved local test"
          explanation={explainHomeTest(test, {
            value: 7,
            unit: 'reps',
            method: 'counter',
            date: '2026-10-03',
          })}
        />
        <DecisionHelp
          label="unsaved local test"
          explanation={explainHomeTest(test, { value: 4, method: 'typed' })}
        />
        <DecisionHelp
          label="legacy reach"
          explanation={explainReach({
            armSpanCm: 182,
            heightCm: 178,
            date: '2026-10-02',
          })}
        />
      </View>,
    );
  });
  try {
    await press(
      screen,
      'Why saved local test?',
      'Why unsaved local test?',
      'Why legacy reach?',
    );
    const content = text(screen);
    expect(content.match(/App display reference/g) ?? []).toHaveLength(3);
    expect(content.match(/Original record ID unavailable/g) ?? []).toHaveLength(
      3,
    );
    expect(content).toContain('Recorded on 2026-10-03');
    expect(content).toContain('7 reps; method: counter');
    expect(content).toContain('Current unsaved reading');
    expect(content).toContain('4 reps; method: typed');
    expect(content).toContain('Stored reach dated 2026-10-02');
    expect(content).toContain('Arm span 182 cm; height 178 cm');
  } finally {
    await act(async () => screen.unmount());
  }
});
