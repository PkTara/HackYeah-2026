import ReactTestRenderer, { act } from 'react-test-renderer';
import { BASELINE_TESTS } from '@hackyeah/core';
import {
  explainHomeTest,
  explainReach,
} from '../components/resultExplanations';
import { Linking, View } from 'react-native';
import { AppText } from '@hackyeah/ui';
import { DecisionHelp, ResearchList } from '../components/DecisionHelp';
import { press, text, control, type Renderer } from '../testing/cameraFixture';

const source = {
  id: 'original-paper',
  title: 'Original paper',
  authors: 'Ada Researcher, Ben Coauthor',
  year: 2024,
  url: 'https://doi.org/10.1234/paper',
  finding: 'Climbers who looked first stopped less.',
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
  rule: 'Count matching records\nShow the share after three',
  evidence: [
    { id: 'log-7', label: 'Climb on 2026-10-03', detail: 'Vertical; sent; V2' },
  ],
  sourceIds: ['original-paper'],
  limitations: ['Self-reported'],
};
async function render(props: Partial<Parameters<typeof DecisionHelp>[0]> = {}) {
  let screen!: Renderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <DecisionHelp
        label="Focus"
        explanation={explanation}
        sources={[source]}
        {...props}
      />,
    );
  });
  return screen;
}

it('opens one sheet with the sentence, inputs, rule, research and limits, and closes it', async () => {
  const screen = await render();
  try {
    expect(text(screen)).not.toContain('Count matching records');
    await press(screen, 'Why: Focus');
    const content = text(screen);
    expect(content).toContain('A count from your climbs');
    expect(content).toContain('Climb on 2026-10-03');
    expect(content).toContain('Vertical; sent; V2');
    expect(content).toContain('Ref log-7');
    // Each line of the rule is its own step.
    expect(content).toContain('Count matching records');
    expect(content).toContain('Show the share after three');
    expect(content).toContain('Chosen by the team');
    expect(content).toContain('Climbers who looked first stopped less.');
    expect(content).toContain('Researcher et al., 2024');
    expect(content).toContain('None of these studies tested this app');
    expect(content).toContain('Self-reported');
    await press(screen, 'Close explanation');
    expect(text(screen)).not.toContain('Count matching records');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('opens the original paper only when its title is pressed, and offers a retry', async () => {
  const screen = await render();
  const open = jest
    .spyOn(Linking, 'openURL')
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(undefined);
  try {
    await press(screen, 'Why: Focus');
    expect(open).not.toHaveBeenCalled();
    await press(screen, 'Open study: Original paper');
    expect(text(screen)).toContain('Could not open the study. Try again.');
    await press(screen, 'Open study: Original paper');
    expect(open).toHaveBeenLastCalledWith(source.url);
    expect(text(screen)).not.toContain('Could not open the study');
  } finally {
    open.mockRestore();
    await act(async () => screen.unmount());
  }
});

it('keeps full study details behind one Study details control', async () => {
  const screen = await render();
  try {
    await press(screen, 'Why: Focus');
    expect(text(screen)).not.toContain('An association only');
    expect(text(screen)).not.toContain('Ada Researcher, Ben Coauthor');
    expect(
      control(screen, 'Study details')?.props.accessibilityState.expanded,
    ).toBe(false);
    await press(screen, 'Study details');
    expect(text(screen)).toContain('Ada Researcher, Ben Coauthor');
    expect(text(screen)).toContain('An association only');
    expect(text(screen)).toContain('No app validation');
    expect(text(screen)).toContain('We read: Abstract');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('says plainly when inputs or a cited study are unavailable', async () => {
  const screen = await render({
    label: 'Legacy quest',
    explanation: { ...explanation, evidence: [], sourceIds: ['missing-paper'] },
  });
  try {
    await press(screen, 'Why: Legacy quest');
    expect(text(screen)).toContain('No records were saved with this result');
    expect(text(screen)).toContain('(missing-paper) is not in the app');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('cites no research for an app rule without sources', async () => {
  const screen = await render({
    explanation: { ...explanation, sourceIds: [] },
  });
  try {
    await press(screen, 'Why: Focus');
    expect(text(screen)).toContain('not taken from a study');
    expect(text(screen)).not.toContain('None of these studies');
    expect(
      screen.root.findAll(node => node.props.accessibilityLabel === 'Research'),
    ).toHaveLength(0);
    expect(control(screen, 'Study details')).toBeUndefined();
  } finally {
    await act(async () => screen.unmount());
  }
});

it('folds a long list of input records away until requested', async () => {
  const many = Array.from({ length: 5 }, (_, i) => ({
    id: `log-${i}`,
    label: `Climb ${i}`,
    detail: `Detail ${i}`,
  }));
  const screen = await render({
    explanation: { ...explanation, evidence: many },
  });
  try {
    await press(screen, 'Why: Focus');
    expect(text(screen)).not.toContain('Ref log-3');
    expect(
      control(screen, 'Your inputs, 5 records')?.props.accessibilityState
        .expanded,
    ).toBe(false);
    await press(screen, 'Your inputs, 5 records');
    expect(text(screen)).toContain('Ref log-3');
    await press(screen, 'Your inputs, 5 records');
    expect(text(screen)).not.toContain('Ref log-3');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('distinguishes generated local display references from unavailable original record IDs', async () => {
  let screen!: Renderer;
  const test = BASELINE_TESTS.find(t => t.id === 'pull-ups')!;
  const cases = [
    explainHomeTest(test, {
      value: 7,
      unit: 'reps',
      method: 'counter',
      date: '2026-10-03',
    }),
    explainHomeTest(test, { value: 4, method: 'typed' }),
    explainReach({ armSpanCm: 182, heightCm: 178, date: '2026-10-02' }),
  ];
  await act(async () => {
    screen = ReactTestRenderer.create(
      <View>
        {cases.map((item, i) => (
          <DecisionHelp key={i} label={`Case ${i}`} explanation={item} />
        ))}
      </View>,
    );
  });
  try {
    const seen: string[] = [];
    for (let i = 0; i < cases.length; i++) {
      await press(screen, `Why: Case ${i}`);
      seen.push(text(screen));
      await press(screen, 'Close explanation');
    }
    const content = seen.join(' ');
    expect(content.match(/No original record ID was kept/g) ?? []).toHaveLength(
      3,
    );
    expect(seen[0]).toContain('Saved result, 2026-10-03');
    expect(seen[0]).toContain('7 reps, method: counter');
    expect(seen[1]).toContain('Current reading, not saved');
    expect(seen[1]).toContain('4 reps, method: typed');
    expect(seen[2]).toContain('Saved reach, 2026-10-02');
    expect(seen[2]).toContain('Arm span 182 cm, height 178 cm');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('attaches the question mark to its displayed value without a status badge', async () => {
  let screen!: Renderer;
  await act(async () => {
    screen = ReactTestRenderer.create(
      <DecisionHelp label="Focus" explanation={explanation} sources={[source]}>
        <AppText>Vertical</AppText>
      </DecisionHelp>,
    );
  });
  try {
    expect(text(screen)).toContain('Vertical');
    expect(text(screen)).not.toContain('Focus');
    expect(JSON.stringify(screen.toJSON())).not.toContain('App rule');
    expect(control(screen, 'Why: Focus')).toBeDefined();
  } finally {
    await act(async () => screen.unmount());
  }
});

it('leads with the provided takeaway instead of the generic summary', async () => {
  const screen = await render({
    takeaway: 'Your vertical logs prompted this practice idea.',
  });
  try {
    await press(screen, 'Why: Focus');
    expect(text(screen)).toContain(
      'Your vertical logs prompted this practice idea.',
    );
    expect(text(screen)).not.toContain('A count from your climbs');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('marks sample data quietly and drafts as unreviewed', async () => {
  const screen = await render({
    explanation: { ...explanation, status: 'example' },
  });
  try {
    await press(screen, 'Why: Focus');
    expect(text(screen)).toContain('Built from sample data');
  } finally {
    await act(async () => screen.unmount());
  }
  const draft = await render({
    explanation: { ...explanation, status: 'draft' },
  });
  try {
    await press(draft, 'Why: Focus');
    expect(text(draft)).toContain('not yet reviewed by an expert');
  } finally {
    await act(async () => draft.unmount());
  }
});

it('lists every library source with its finding and a link', async () => {
  let screen!: Renderer;
  await act(async () => {
    screen = ReactTestRenderer.create(<ResearchList sources={[source]} />);
  });
  try {
    expect(text(screen)).toContain('Climbers who looked first stopped less.');
    expect(control(screen, 'Open study: Original paper')).toBeDefined();
    expect(text(screen)).not.toContain('An association only');
  } finally {
    await act(async () => screen.unmount());
  }
});
