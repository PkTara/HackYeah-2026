import { act, create } from 'react-test-renderer';
import { Linking } from 'react-native';
import { RESEARCH_SOURCES, sampleGame } from '@hackyeah/core';
import {
  control,
  press,
  render,
  setup,
  text,
  socket,
  MEASUREMENT,
  photo,
} from '../testing/cameraFixture';
import { shoulder } from '../testing/livePoseFixture';
import { toPoseReading, type PoseResultDto } from '@hackyeah/data';
import { CameraReadingHelp } from '../capture/parts';

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
      'Open body and reach',
      'Why reach difference?',
      'How it works for reach difference',
      'Your inputs for reach difference',
    );
    expect(text(screen)).toContain('arm span minus height');
    expect(text(screen)).toContain('2026-10-02');
    await press(
      screen,
      'Back to Data',
      'Redo pull-ups',
      'Why last home test result?',
      'How it works for last home test result',
      'Your inputs for last home test result',
    );
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

async function cameraReading(
  sample: PoseResultDto | null,
  metric = 'leg_spread',
) {
  const stream = socket();
  const screen = await render(
    setup({
      live: stream.transport,
      camera: { snapshot: async () => photo({ bytes: new Uint8Array([1]) }) },
    }),
    'Tests',
  );
  await press(
    screen,
    `Open ${metric === 'shoulder_reach' ? 'shoulder reach' : 'leg spread'}`,
    metric === 'shoulder_reach'
      ? 'Shoulder reach assessment'
      : 'Leg spread assessment',
    'Record',
  );
  await act(async () => {
    stream.transport.onopen?.();
    stream.transport.onmessage?.({
      data: JSON.stringify({
        type: 'ready',
        max_frame_bytes: 8192,
        max_duration_ms: 60000,
      }),
    });
  });
  const frame = JSON.parse(stream.sent[1] as string);
  await act(async () => {
    if (sample) {
      stream.transport.onmessage?.({
        data: JSON.stringify({
          type: 'result',
          landmarks: shoulder(0).landmarks,
          ...sample,
          timestamp_ms: frame.timestamp_ms,
        }),
      });
    }
  });
  await press(screen, 'Stop');
  return screen;
}

it('opens help on the actual analyzed camera reading including usable counts and protocol', async () => {
  const screen = await cameraReading(MEASUREMENT);
  try {
    await press(
      screen,
      'Measurement details',
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

it('explains an invalid live camera capture using its actual rejection reason', async () => {
  const screen = await cameraReading({
    ...MEASUREMENT,
    status: 'invalid_capture',
    value: null,
    confidence: 0.2,
    reason: 'Both hips and ankles must be visible.',
  });
  try {
    await press(
      screen,
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

it('uses returned camera landmark snapshots in the live review', async () => {
  const sample: PoseResultDto = {
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
  const screen = await cameraReading(sample);
  try {
    await press(
      screen,
      'Measurement details',
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('x=0.42; y=0.50; visibility=0.91');
    expect(text(screen)).toContain('Relative sample offset:');
    expect(text(screen)).toContain('not an absolute capture date');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('describes an empty legacy camera response without inferring capture rejection', async () => {
  let screen!: ReturnType<typeof create>;
  await act(async () => {
    screen = create(
      <CameraReadingHelp
        reading={toPoseReading({
          frames: [],
          duration_ms: 0,
          sampled_frame_count: 0,
          valid_frame_count: 0,
        })}
      />,
    );
  });
  try {
    await press(
      screen,
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

it('keeps the reviewed shoulder snapshot in saved measurement details and history', async () => {
  const sample = {
    ...shoulder(0, 12),
    right_value: 18,
    decision: {
      summary: 'Recorded shoulder geometry',
      status: 'estimate' as const,
      rule: 'Returned hip-shoulder-elbow geometry',
      evidence: [
        {
          id: 'shoulder11',
          label: 'Left shoulder',
          detail: 'x=0.40; y=0.35; visibility=0.96',
        },
      ],
      source_ids: ['stenum2021'],
      limitations: ['Projected shoulder angles only'],
    },
  };
  const screen = await cameraReading(sample, 'shoulder_reach');
  try {
    await press(screen, 'Measurement details', 'Why camera reading?');
    expect(text(screen)).toContain('Recorded shoulder geometry');
    expect(text(screen)).not.toContain('x=0.40; y=0.35; visibility=0.96');
    await press(
      screen,
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('(shoulder11)');
    expect(text(screen)).toContain('x=0.40; y=0.35; visibility=0.96');
    expect(text(screen)).not.toContain('leg-spread angle');
    await press(
      screen,
      'Back to Review',
      'Save result',
      'Back to Data',
      'Open shoulder reach',
      'Why Shoulder reach, left measurement?',
      'How it works for Shoulder reach, left measurement',
      'Your inputs for Shoulder reach, left measurement',
    );
    expect(text(screen)).toContain('Returned hip-shoulder-elbow geometry');
    expect(text(screen)).toContain('(shoulder11)');
    expect(text(screen)).toContain('client-supplied explanation');
    await press(screen, 'Show measurement history');
    expect(
      screen.root.findAll(node =>
        node.props.accessibilityLabel?.startsWith('Why saved measurement '),
      ).length,
    ).toBeGreaterThan(0);
  } finally {
    await act(async () => screen.unmount());
  }
});

it('explains stopping a live capture with no returned samples without claiming rejection', async () => {
  const screen = await cameraReading(null);
  try {
    await press(
      screen,
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('No valid sample was returned');
    expect(text(screen)).toContain('0 of 0 usable');
    expect(text(screen)).not.toContain('server rejected');
    expect(control(screen, 'Save result')).toBeUndefined();
  } finally {
    await act(async () => screen.unmount());
  }
});

it('retains clip landmark snapshots and identifies their offsets as relative', async () => {
  let screen!: ReturnType<typeof create>;
  await act(async () => {
    screen = create(
      <CameraReadingHelp
        reading={toPoseReading({
          frames: [
            {
              ...MEASUREMENT,
              timestamp_ms: 400,
              decision: {
                summary: 'Saved clip geometry',
                status: 'estimate',
                rule: 'Recorded four image-plane landmarks',
                evidence: [
                  {
                    id: 'clip-hip17',
                    label: 'Left hip',
                    detail: 'x=0.42; y=0.50; visibility=0.91',
                  },
                ],
                source_ids: [],
                limitations: ['Image geometry only'],
              },
            },
          ],
          duration_ms: 500,
          sampled_frame_count: 1,
          valid_frame_count: 1,
        })}
      />,
    );
  });
  try {
    await press(
      screen,
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('(clip-hip17)');
    expect(text(screen)).toContain('x=0.42; y=0.50; visibility=0.91');
    expect(text(screen)).toContain('Relative sample offset: 400 ms');
    expect(text(screen)).toContain('not an absolute capture date');
    expect(text(screen)).toContain('1 of 1 usable');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('explains bilateral shoulder values without substituting the leg-spread formula', async () => {
  const screen = await cameraReading(
    { ...shoulder(0, 12), value: null, right_value: 18 },
    'shoulder_reach',
  );
  try {
    await press(
      screen,
      'Measurement details',
      'Why camera reading?',
      'How it works for camera reading',
      'Your inputs for camera reading',
    );
    expect(text(screen)).toContain('left 12, right 18, mean unavailable');
    expect(text(screen)).toContain('camera-shoulder-reach-v1');
    expect(text(screen)).toContain('hip-shoulder-elbow');
    expect(text(screen)).not.toContain('camera-leg-spread-v1');
    expect(text(screen)).toContain('1 of 1 usable');
  } finally {
    await act(async () => screen.unmount());
  }
});
