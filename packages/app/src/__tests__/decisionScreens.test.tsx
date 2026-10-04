import { act, create } from 'react-test-renderer';
import { Linking } from 'react-native';
import { RESEARCH_SOURCES, sampleGame } from '@hackyeah/core';
import {
  control,
  press as pressControl,
  render,
  setup,
  text,
  socket,
  MEASUREMENT,
  photo,
  type Renderer,
} from '../testing/cameraFixture';
import { shoulder } from '../testing/livePoseFixture';
import { toPoseReading, type PoseResultDto } from '@hackyeah/data';
import { CameraReadingHelp } from '../capture/parts';

/**
 * Presses each control in turn. Opening a "?" first closes any open
 * explanation, then unfolds a long list of input records, so each check
 * reads one explanation with its records.
 */
async function press(screen: Renderer, ...labels: string[]) {
  for (const label of labels) {
    if (label.startsWith('Why: ')) {
      await closeAll(screen);
    }
    await pressControl(screen, label);
    if (label.startsWith('Why: ')) {
      const folded = screen.root.findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          (/^Show all \d+ records$/.test(
            node.props.accessibilityLabel ?? '',
          ) ||
            node.props.accessibilityLabel === 'Rule in words'),
      );
      for (const key of folded) {
        await act(async () => key.props.onPress());
      }
    }
  }
}

/** A grid box's label includes its live count, so find it by its start. */
function cellLabel(screen: Renderer, what: string): string {
  return screen.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel?.startsWith?.(`Why: ${what},`),
  )[0]?.props.accessibilityLabel;
}

/** What is on screen plus what a screen reader hears for drawn parts. */
function read(screen: Renderer): string {
  const spoken = screen.root
    .findAll(node => typeof node.props.accessibilityLabel === 'string')
    .map(node => node.props.accessibilityLabel as string);
  return [text(screen), ...new Set(spoken)].join(' ');
}

/** Ids of the input records shown in the open explanation. */
function records(screen: Renderer): string[] {
  return screen.root
    .findAll(
      node =>
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('record-') &&
        typeof node.type === 'string',
    )
    .map(node => (node.props.testID as string).slice('record-'.length));
}

async function closeAll(screen: Renderer) {
  for (const key of screen.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === 'Close explanation',
  )) {
    await act(async () => key.props.onPress());
  }
}

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
    await press(screen, 'Why: Focus');
    expect(read(screen)).toContain(sampleGame.logs[0].date);
    expect(records(screen)).toContain(sampleGame.logs[0].id);
    expect(read(screen)).toContain('needs 3 logged climbs');
    // Real records: no sample marker.
    expect(read(screen)).not.toContain('Built from sample data');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('offers disclosures beside the profile quest and each calculated chart or reward', async () => {
  const screen = await render(setup(), 'Profile');
  try {
    await press(screen, 'Why: Quest');
    expect(JSON.stringify(screen.toJSON())).not.toContain('Draft suggestion');
    expect(read(screen)).toContain('deliberate foot placement');
    await press(screen, 'Why: XP and level');
    expect(read(screen)).toContain('date it was completed is not recorded');
    await press(screen, 'How was this data created?');
    for (const name of ['Slab', 'Vertical', 'Overhang']) {
      await press(screen, `Why: ${name} tally`);
      expect(read(screen)).toContain(
        `Count the ${name.toLowerCase()} climbs you logged`,
      );
      // Sample climbs are named quietly, never hidden.
      expect(read(screen)).toContain('Built from sample data');
    }
    for (const name of ['Controlled', 'Dynamic']) {
      await press(screen, `Why: ${name} tally`);
      expect(read(screen)).toContain('counts once in each');
    }
    await press(screen, 'Why: Movement radar');
    expect(read(screen)).toContain('4 of 5 axes are scored');
    expect(read(screen)).toContain('never drawn as zero');
    // An axis name opens that axis's sheet, with its research and limits.
    await closeAll(screen);
    await press(screen, 'Footwork: Building');
    expect(read(screen)).toContain('Footwork is at Building: 6 points');
    expect(read(screen)).toContain('Background only');
    expect(read(screen)).toContain('not a skill test');
    await closeAll(screen);
    await press(screen, 'How each axis is scored', 'Why: Stamina axis');
    expect(read(screen)).toContain('Stamina is not scored yet');
    expect(read(screen)).toContain('Do the dead hang test');
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
    await press(screen, 'Why: Finger pause rule');
    expect(read(screen)).toContain('2026-10-01');
    expect(read(screen)).toContain('Right ring, sore at A2 pulley');
    expect(read(screen)).toContain('Pulley injuries are checked with scans');
    await press(screen, 'Why: Alternative quest');
    expect(read(screen)).toContain('Done: ');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('explains selected Evidence counts and each style cell with matching records', async () => {
  const screen = await render(setup(), 'Evidence');
  try {
    await press(screen, 'Why: Vertical tally');
    expect(records(screen)).toContain('sample-3');
    expect(read(screen)).toContain('2026-09-21');
    expect(read(screen)).toContain('Count the vertical climbs you logged');
    await press(screen, 'Why: Focus');
    expect(read(screen)).toContain('Sent so far: slab');
    expect(read(screen)).toContain('Chosen by the team');
    // The grid has no extra rows of question marks: each box opens its own.
    expect(
      screen.root.findAll(node =>
        node.props.accessibilityLabel?.startsWith?.('Why: Controlled'),
      ).length,
    ).toBeGreaterThan(0);
    await press(screen, cellLabel(screen, 'Controlled vertical'));
    expect(read(screen)).toContain('Only vertical climbs marked controlled');
    expect(records(screen)).toContain('sample-3');
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
    await press(screen, 'Open body and reach', 'Why: Reach difference');
    expect(read(screen)).toContain('Arm span minus height: 182 minus 178');
    expect(read(screen)).toContain('2026-10-02');
    // The one published claim here is cited.
    expect(read(screen)).toContain('Mermier et al., 2000');
    await press(
      screen,
      'Back to Data',
      'Redo pull-ups',
      'Why: Last home test result',
    );
    expect(read(screen)).toContain('2026-10-01');
    expect(read(screen)).toContain('Count clean reps');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('opens the bundled original-source library from About with study details', async () => {
  const screen = await render(setup(), 'About');
  try {
    expect(read(screen)).toContain('Fixed app rules turn');
    expect(read(screen)).toContain(RESEARCH_SOURCES[0].finding);
    expect(read(screen)).not.toContain(RESEARCH_SOURCES[0].readingDepth);
    await press(screen, 'Study details');
    expect(read(screen)).toContain(RESEARCH_SOURCES[0].title);
    expect(read(screen)).toContain(RESEARCH_SOURCES[0].readingDepth);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await press(screen, `Open study: ${RESEARCH_SOURCES[0].title}`);
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
    await press(screen, 'Measurement details', 'Why: Camera reading');
    expect(read(screen)).toContain('front-facing-leg-spread-v1');
    expect(read(screen)).toContain('92');
    expect(read(screen)).toContain('1 of 1');
    expect(read(screen)).toContain('0.9');
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
    await press(screen, 'Why: Camera reading');
    expect(read(screen)).toContain('Both hips and ankles must be visible.');
    expect(read(screen)).toContain('0 of 1 usable');
    expect(read(screen)).toContain('0.2');
    expect(read(screen)).toContain('unavailable');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('names both filters for a style cell and excludes other terrains from its records', async () => {
  const screen = await render(setup(), 'Evidence');
  try {
    await press(screen, cellLabel(screen, 'Controlled slab'));
    expect(read(screen)).toContain('Only slab climbs marked controlled');
    expect(records(screen)).toContain('sample-1');
    expect(records(screen)).not.toContain('sample-3');
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
    await press(screen, 'Why: Quest');
    expect(records(screen)).toContain('earlier-report');
    expect(read(screen)).toContain('server-saved-rule');
    expect(read(screen)).toContain('Snapshot of assignment');
    expect(records(screen)).not.toContain('sample-1');
    await press(screen, 'Why: Focus');
    expect(records(screen)).toContain('sample-1');
    expect(read(screen)).not.toContain('server-saved-rule');
    expect(read(screen)).toContain('Independent of server quest selection');
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
    await press(screen, 'Measurement details', 'Why: Camera reading');
    expect(read(screen)).toContain('x=0.42; y=0.50; visibility=0.91');
    expect(read(screen)).toContain('Relative sample offset:');
    expect(read(screen)).toContain('not an absolute capture date');
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
    await press(screen, 'Why: Camera reading');
    expect(read(screen)).toContain('No valid sample was returned');
    expect(read(screen)).not.toContain('server rejected');
    expect(read(screen)).toContain('0 of 0 usable');
  } finally {
    await act(async () => screen.unmount());
  }
});

it('keeps wall tallies below the triangle inside a collapsed creation tray', async () => {
  const screen = await render(setup(), 'Profile');
  try {
    expect(control(screen, 'Why: Slab tally')).toBeUndefined();
    expect(
      control(screen, 'How was this data created?')?.props.accessibilityState
        .expanded,
    ).toBe(false);
    await press(screen, 'How was this data created?');
    expect(control(screen, 'Why: Slab tally')).toBeDefined();
    expect(control(screen, 'Why: Vertical tally')).toBeDefined();
    expect(control(screen, 'Why: Overhang tally')).toBeDefined();
    // Six slab records: the first three show, the rest wait for Show all.
    await pressControl(screen, 'Why: Slab tally');
    expect(read(screen)).toContain('6 slab climbs: 5 sent, 1 not yet.');
    expect(records(screen)).toHaveLength(3);
    // The oldest slab climb is folded away until asked for.
    expect(records(screen)).not.toContain('sample-1');
    await pressControl(screen, 'Show all 6 records');
    expect(records(screen)).toHaveLength(6);
    expect(records(screen)).toContain('sample-1');
    // The rule in words stays one press away from the drawn flow.
    await pressControl(screen, 'Rule in words');
    expect(read(screen)).toContain('Count the slab climbs you logged: 6');
    await pressControl(screen, 'Close explanation');
    await press(screen, 'How was this data created?');
    expect(control(screen, 'Why: Slab tally')).toBeUndefined();
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
    await press(screen, 'Measurement details', 'Why: Camera reading');
    expect(read(screen)).toContain('Recorded shoulder geometry');
    // A short list of inputs is shown straight away.
    expect(records(screen)).toContain('shoulder11');
    expect(read(screen)).toContain('x=0.40; y=0.35; visibility=0.96');
    expect(read(screen)).not.toContain('leg-spread angle');
    await press(
      screen,
      'Back to Review',
      'Save result',
      'Back to Data',
      'Open shoulder reach',
      'Why: Shoulder reach, left measurement',
    );
    expect(read(screen)).toContain('Returned hip-shoulder-elbow geometry');
    expect(records(screen)).toContain('shoulder11');
    expect(read(screen)).toContain('client-supplied explanation');
    await press(screen, 'Show measurement history');
    expect(
      screen.root.findAll(node =>
        node.props.accessibilityLabel?.startsWith('Why: Saved measurement '),
      ).length,
    ).toBeGreaterThan(0);
  } finally {
    await act(async () => screen.unmount());
  }
});

it('explains stopping a live capture with no returned samples without claiming rejection', async () => {
  const screen = await cameraReading(null);
  try {
    await press(screen, 'Why: Camera reading');
    expect(read(screen)).toContain('No valid sample was returned');
    expect(read(screen)).toContain('0 of 0 usable');
    expect(read(screen)).not.toContain('server rejected');
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
    await press(screen, 'Why: Camera reading');
    expect(records(screen)).toContain('clip-hip17');
    expect(read(screen)).toContain('x=0.42; y=0.50; visibility=0.91');
    expect(read(screen)).toContain('Relative sample offset: 400 ms');
    expect(read(screen)).toContain('not an absolute capture date');
    expect(read(screen)).toContain('1 of 1 usable');
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
    await press(screen, 'Measurement details', 'Why: Camera reading');
    expect(read(screen)).toContain(
      'left 12, right 18, average unavailable degrees',
    );
    expect(read(screen)).toContain('between the hip and the elbow');
    expect(read(screen)).not.toContain('midway between the two hips');
    expect(read(screen)).toContain('1 of 1 usable');
  } finally {
    await act(async () => screen.unmount());
  }
});
