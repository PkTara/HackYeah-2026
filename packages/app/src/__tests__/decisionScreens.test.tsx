import { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import { RESEARCH_SOURCES, sampleGame } from '@hackyeah/core';
import { control, press, render, setup, text } from '../testing/cameraFixture';

it('opens local focus help with the actual current climb records on Profile', async () => {
  const screen = await render(
    setup({
      state: {
        ...sampleGame,
        onboardingSkipped: true,
        logs: sampleGame.logs.map(log => ({ ...log, sample: false })),
      },
    }),
    'Profile',
  );
  try {
    await press(
      screen,
      'Why your focus?',
      'How it works for your focus',
      'Your inputs for your focus',
    );
    expect(text(screen)).toContain(sampleGame.logs[0].date);
    expect(text(screen)).toContain(sampleGame.logs[0].id);
    expect(text(screen)).toContain('local-focus-v1');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('offers disclosures beside the profile quest and each calculated chart or reward', async () => {
  const screen = await render(setup(), 'Profile');
  try {
    await press(
      screen,
      'Why your quest?',
      'How it works for your quest',
      'Your inputs for your quest',
    );
    expect(JSON.stringify(screen.toJSON())).not.toContain('Draft suggestion');
    expect(text(screen)).toContain('deliberate foot placement');
    await press(
      screen,
      'Why XP and level?',
      'How it works for XP and level',
      'Your inputs for XP and level',
      'How was this data created?',
      'Why Slab tally?',
      'How it works for Slab tally',
      'Your inputs for Slab tally',
      'Why Vertical tally?',
      'How it works for Vertical tally',
      'Your inputs for Vertical tally',
      'Why Overhang tally?',
      'How it works for Overhang tally',
      'Your inputs for Overhang tally',
      'Why Controlled tally?',
      'How it works for Controlled tally',
      'Your inputs for Controlled tally',
      'Why Dynamic tally?',
      'How it works for Dynamic tally',
      'Your inputs for Dynamic tally',
      'Why movement radar?',
      'How it works for movement radar',
      'Your inputs for movement radar',
    );
    expect(text(screen)).toContain('fixed demonstration');
    expect(text(screen)).toContain('Completion ID stored');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('shows the actual dated finger flag behind pausing and the offered alternative on Hands', async () => {
  const screen = await render(
    setup({
      state: {
        ...sampleGame,
        onboardingSkipped: true,
        flags: [
          { side: 'right', finger: 'ring', spots: ['a2'], date: '2026-10-01' },
        ],
      },
    }),
    'Hands',
  );
  try {
    await press(
      screen,
      'Why finger pause rule?',
      'How it works for finger pause rule',
      'Your inputs for finger pause rule',
      'Why alternative quest?',
      'How it works for alternative quest',
      'Your inputs for alternative quest',
    );
    expect(text(screen)).toContain('2026-10-01');
    expect(text(screen)).toContain('right ring');
    expect(text(screen)).toContain('completed=');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('explains selected Evidence counts and each style cell with matching records', async () => {
  const screen = await render(setup(), 'Evidence');
  try {
    await press(
      screen,
      'Why Vertical tally?',
      'How it works for Vertical tally',
      'Your inputs for Vertical tally',
      'Why evidence focus?',
      'How it works for evidence focus',
      'Your inputs for evidence focus',
      'Why Controlled Vertical cell?',
      'How it works for Controlled Vertical cell',
      'Your inputs for Controlled Vertical cell',
    );
    expect(text(screen)).toContain('sample-3');
    expect(text(screen)).toContain('2026-09-21');
    expect(text(screen)).toContain('filter records');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('reveals saved reach arithmetic and home-test protocol context from Tests', async () => {
  const screen = await render(
    setup({
      state: {
        ...sampleGame,
        onboardingSkipped: true,
        reach: { armSpanCm: 182, heightCm: 178, date: '2026-10-02' },
        baseline: [
          {
            testId: 'pull-ups',
            value: 7,
            unit: 'reps',
            method: 'counter',
            date: '2026-10-01',
          },
        ],
      },
    }),
    'Tests',
  );
  try {
    await press(
      screen,
      'Why reach difference?',
      'How it works for reach difference',
      'Your inputs for reach difference',
      'Why pull-ups result?',
      'How it works for pull-ups result',
      'Your inputs for pull-ups result',
    );
    expect(text(screen)).toContain('arm span minus height');
    expect(text(screen)).toContain('2026-10-02');
    expect(text(screen)).toContain('2026-10-01');
    expect(text(screen)).toContain('Count clean reps');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('opens the bundled original-source library from About with study details', async () => {
  const screen = await render(setup(), 'About');
  try {
    expect(text(screen)).toContain('structured observation');
    await press(screen, `Study details: ${RESEARCH_SOURCES[0].title}`);
    expect(text(screen)).toContain(RESEARCH_SOURCES[0].title);
    expect(text(screen)).toContain(RESEARCH_SOURCES[0].readingDepth);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await press(screen, `Open original paper: ${RESEARCH_SOURCES[0].title}`);
    expect(open).toHaveBeenCalledWith(RESEARCH_SOURCES[0].url);
    open.mockRestore();
  } finally {
    await act(async () => screen.unmount());
  }
});

it('opens help on the actual analyzed camera reading including usable counts and protocol', async () => {
  const screen = await render(setup(), 'Assessment');
  try {
    await press(
      screen,
      'Start camera',
      'Take photo',
      'Send for analysis, I consent to sending this capture to the server for analysis.',
      'Analyse photo',
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('front-facing-leg-spread-v1');
    expect(text(screen)).toContain('92');
    expect(text(screen)).toContain('1 of 1');
    expect(text(screen)).toContain('0.9');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('explains an invalid camera capture using its actual rejection reason', async () => {
  const screen = await render(
    setup({
      answer: () => ({
        status: 200,
        body: {
          status: 'invalid_capture',
          metric: 'leg_spread',
          value: null,
          unit: 'degrees',
          confidence: 0.2,
          reason: 'Both hips and ankles must be visible.',
          protocol: 'front-facing-leg-spread-v1',
          method: 'camera',
        },
      }),
    }),
    'Assessment',
  );
  try {
    await press(
      screen,
      'Start camera',
      'Take photo',
      'Send for analysis, I consent to sending this capture to the server for analysis.',
      'Analyse photo',
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('Both hips and ankles must be visible.');
    expect(text(screen)).toContain('0 of 1 usable');
    expect(text(screen)).toContain('0.2');
    expect(text(screen)).toContain('unavailable');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('names both filters for a style cell and excludes other terrains from its records', async () => {
  const screen = await render(setup(), 'Evidence');
  try {
    await press(
      screen,
      'Why Controlled Slab cell?',
      'How it works for Controlled Slab cell',
      'Your inputs for Controlled Slab cell',
    );
    expect(text(screen)).toContain('First filter terrain=slab');
    expect(text(screen)).toContain('sample-1');
    expect(text(screen)).not.toContain('(sample-3)');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('keeps a server quest snapshot separate from the current local focus', async () => {
  const screen = await render(
    setup({
      state: {
        ...sampleGame,
        onboardingSkipped: true,
        assigned: {
          id: 'server-quest',
          kind: 'plan',
          title: 'Server plan',
          task: 'Review a climb',
          why: 'Saved server selection',
          minutes: 4,
          equipment: 'None',
          loadsFingers: false,
          decision: {
            summary: 'Assigned from an earlier record',
            status: 'app_rule',
            rule: 'server-saved-rule',
            evidence: [
              {
                id: 'earlier-report',
                label: 'Recorded 2026-09-01',
                detail: 'Earlier goal=technique',
              },
            ],
            sourceIds: [],
            limitations: ['Snapshot of assignment'],
          },
        },
      },
    }),
    'Profile',
  );
  try {
    await press(
      screen,
      'Why your quest?',
      'How it works for your quest',
      'Your inputs for your quest',
    );
    expect(text(screen)).toContain('earlier-report');
    expect(text(screen)).toContain('server-saved-rule');
    expect(text(screen)).not.toContain('(sample-1)');
    await press(
      screen,
      'Why your focus?',
      'How it works for your focus',
      'Your inputs for your focus',
    );
    expect(text(screen)).toContain('(sample-1)');
    expect(text(screen)).toContain('Independent of server quest selection');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('uses returned camera landmark snapshots and identifies relative clip offsets', async () => {
  const sample = {
    status: 'ok',
    metric: 'leg_spread',
    value: 92,
    unit: 'degrees',
    confidence: 0.9,
    reason: null,
    protocol: 'front-facing-leg-spread-v1',
    method: 'camera',
    timestamp_ms: 400,
    decision: {
      summary: 'Saved camera geometry',
      status: 'estimate',
      rule: 'Recorded four landmarks in image coordinates',
      evidence: [
        {
          id: 'hip17',
          label: 'Left hip',
          detail: 'x=0.42; y=0.50; visibility=0.91',
        },
      ],
      source_ids: [],
      limitations: ['Image geometry estimate only'],
    },
  };
  const screen = await render(
    setup({
      answer: () => ({
        status: 200,
        body: {
          frames: [sample],
          duration_ms: 500,
          sampled_frame_count: 1,
          valid_frame_count: 1,
        },
      }),
    }),
    'Assessment',
  );
  try {
    await press(
      screen,
      'Start camera',
      'Take photo',
      'Send for analysis, I consent to sending this capture to the server for analysis.',
      'Analyse photo',
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('x=0.42; y=0.50; visibility=0.91');
    expect(text(screen)).toContain('Relative sample offset: 400 ms');
    expect(text(screen)).toContain('not an absolute capture date');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('describes an empty legacy camera response without inferring capture rejection', async () => {
  const screen = await render(
    setup({
      answer: () => ({
        status: 200,
        body: {
          frames: [],
          duration_ms: 0,
          sampled_frame_count: 0,
          valid_frame_count: 0,
        },
      }),
    }),
    'Assessment',
  );
  try {
    await press(
      screen,
      'Start camera',
      'Take photo',
      'Send for analysis, I consent to sending this capture to the server for analysis.',
      'Analyse photo',
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('No valid sample was returned');
    expect(text(screen)).not.toContain('server rejected');
    expect(text(screen)).toContain('0 of 0 usable');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('keeps wall tallies below the triangle inside a collapsed creation tray', async () => {
  const screen = await render(setup(), 'Profile');
  try {
    expect(control(screen, 'Why Slab tally?')).toBeUndefined();
    expect(
      control(screen, 'How was this data created?')?.props.accessibilityState
        .expanded,
    ).toBe(false);
    await press(screen, 'How was this data created?');
    expect(control(screen, 'Why Slab tally?')).toBeDefined();
    expect(control(screen, 'Why Vertical tally?')).toBeDefined();
    expect(control(screen, 'Why Overhang tally?')).toBeDefined();
    await press(screen, 'Why Slab tally?', 'How it works for Slab tally');
    expect(text(screen)).not.toContain('(sample-1)');
    await press(screen, 'Your inputs for Slab tally');
    expect(text(screen)).toContain('(sample-1)');
    await press(screen, 'How was this data created?');
    expect(control(screen, 'Why Slab tally?')).toBeUndefined();
  } finally {
    await act(async () => screen.unmount());
  }
});
