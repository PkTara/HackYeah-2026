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
/** Every accessibility label on screen: what a screen reader hears. */
function spoken(screen: Renderer): string[] {
  return screen.root
    .findAll(
      node =>
        typeof node.type === 'string' &&
        typeof node.props.accessibilityLabel === 'string',
    )
    .map(node => node.props.accessibilityLabel as string);
}

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
    // Internal record ids are never drawn.
    expect(content).not.toContain('log-7');
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

it('shows the first three input records and the rest on request', async () => {
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
    // A plain count leads when no summary line was supplied.
    expect(text(screen)).toContain('5 records.');
    expect(text(screen)).toContain('Climb 2');
    expect(text(screen)).not.toContain('Climb 3');
    expect(
      control(screen, 'Show all 5 records')?.props.accessibilityState.expanded,
    ).toBe(false);
    await press(screen, 'Show all 5 records');
    expect(text(screen)).toContain('Climb 4');
    expect(
      control(screen, 'Show all 5 records')?.props.accessibilityState.expanded,
    ).toBe(true);
    await press(screen, 'Show all 5 records');
    expect(text(screen)).not.toContain('Climb 3');
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
      seen.push(`${text(screen)} ${spoken(screen).join(' ')}`);
      await press(screen, 'Close explanation');
    }
    const content = seen.join(' ');
    // Screen readers hear the full record, provenance note included.
    expect(content.match(/No original record ID was kept/g) ?? []).toHaveLength(
      3,
    );
    expect(seen[0]).toContain('Saved result, 2026-10-03');
    expect(seen[0]).toContain('7 reps, method: counter');
    expect(seen[1]).toContain('Current reading, not saved');
    expect(seen[1]).toContain('4 reps, method: typed');
    expect(seen[2]).toContain('Saved reach, 2026-10-02');
    expect(seen[2]).toContain('Arm span 182 cm, height 178 cm');
    // On screen the same records are short rows with short dates.
    expect(seen[0]).toContain('3 Oct');
    expect(seen[1]).toContain('Not saved yet');
    expect(seen[2]).toContain('2 Oct');
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

describe('decision flow', () => {
  const flow = {
    inputs: [
      { label: 'Slab', value: '5 of 6 sent', icon: 'slab' },
      { label: 'Vertical', value: '2 of 6 sent', icon: 'vertical', key: true },
    ],
    nodes: [
      { type: 'step' as const, label: 'Count climbs and sends per wall' },
      {
        type: 'check' as const,
        label: 'Every wall has 3+ climbs?',
        taken: 'yes' as const,
        yes: 'Pick the lowest share sent',
        no: 'Pick the fewest climbs',
        detail: 'Slab 83%, vertical 33%',
        team: true,
        feed: { label: 'Right ring', value: 'flagged', icon: 'flag' },
      },
    ],
    result: { label: 'Focus', value: 'Vertical', icon: 'vertical' },
  };

  it('draws the rule as a flow with the rule in words one press away', async () => {
    const screen = await render({ explanation: { ...explanation, flow } });
    try {
      await press(screen, 'Why: Focus');
      const graph = screen.root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.accessibilityRole === 'image' &&
          node.props.accessibilityLabel?.startsWith('Flow chart.'),
      );
      expect(graph).toHaveLength(1);
      // One spoken version of the whole picture, in order.
      expect(graph[0].props.accessibilityLabel).toBe(
        'Flow chart. From your records: Slab, 5 of 6 sent; Vertical, 2 of 6 sent. ' +
          'Step 1: Count climbs and sends per wall. ' +
          'Also uses: Right ring, flagged. ' +
          'Step 2: Every wall has 3+ climbs? Yes, so pick the lowest share sent. Slab 83%, vertical 33%. ' +
          'Result: Focus, Vertical.',
      );
      const content = text(screen);
      expect(content).toContain('Count climbs and sends per wall');
      expect(content).toContain('Every wall has 3+ climbs?');
      expect(content).toContain('Right ring');
      // Both ways are written out; the one not taken says so in words.
      expect(content).toContain('Pick the lowest share sent');
      expect(content).toContain('Pick the fewest climbs');
      expect(content.match(/not taken/g)).toHaveLength(2);
      expect(content).toContain('Chosen by the team, not taken from a study.');
      // The plain text rule is folded under the picture.
      expect(content).not.toContain('Count matching records');
      await press(screen, 'Rule in words');
      expect(text(screen)).toContain('Count matching records');
    } finally {
      await act(async () => screen.unmount());
    }
  });

  it('falls back to the text rule for a missing or broken flow', async () => {
    const screen = await render({
      explanation: { ...explanation, flow: { ...flow, nodes: [] } },
    });
    try {
      await press(screen, 'Why: Focus');
      expect(text(screen)).toContain('Count matching records');
      expect(control(screen, 'Rule in words')).toBeUndefined();
      expect(
        screen.root.findAll(node => node.props.accessibilityRole === 'image'),
      ).toHaveLength(0);
    } finally {
      await act(async () => screen.unmount());
    }
  });

  it('leads the inputs with a summary and draws records as short rows', async () => {
    const row = (id: string, sample: boolean, sent: boolean) => ({
      id,
      label: `Climb, 2026-09-30${sample ? ' (example)' : ''}`,
      detail: 'Vertical, controlled, crimp, V3.',
      view: {
        when: '30 Sep',
        badge: 'V3',
        icon: 'vertical',
        title: 'Vertical',
        note: 'Controlled, crimps',
        outcome: { text: sent ? 'Sent' : 'Not yet', done: sent },
        ...(sample ? { sample: true } : {}),
      },
    });
    const screen = await render({
      explanation: {
        ...explanation,
        inputSummary: '2 vertical climbs: 1 sent, 1 not yet.',
        evidence: [row('own-1', false, true), row('sample-9', true, false)],
      },
    });
    try {
      await press(screen, 'Why: Focus');
      const content = text(screen);
      expect(content).toContain('2 vertical climbs: 1 sent, 1 not yet.');
      expect(content).toContain('Controlled, crimps');
      expect(content).toContain('30 Sep');
      // Example records are marked once, not on every row.
      expect(content.match(/example/gi)).toHaveLength(1);
      expect(content).toContain('Includes example records.');
      expect(content).not.toContain('sample-9');
      expect(content).not.toContain('2026-09-30');
      // A screen reader hears each full record.
      expect(
        screen.root.findAll(
          node =>
            typeof node.type === 'string' &&
            node.props.accessibilityLabel ===
              'Climb, 2026-09-30 (example). Vertical, controlled, crimp, V3.',
        ),
      ).toHaveLength(1);
    } finally {
      await act(async () => screen.unmount());
    }
  });
});
