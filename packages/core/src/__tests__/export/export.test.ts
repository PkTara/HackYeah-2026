import {
  AUDIENCES,
  AUDIENCE_ORDER,
  NOT_RECORDED,
  RESEARCH_SOURCES,
  RUNNING,
  SESSION_COLUMNS,
  MEASUREMENT_COLUMNS,
  buildClimbingSnapshot,
  buildDocument,
  csvCell,
  emptyGame,
  escapeHtml,
  explainAudience,
  isDecisionFlow,
  flowText,
  exportFile,
  noDashes,
  renderHtml,
  renderMarkdown,
  renderText,
  sampleGame,
  sectionsFor,
  toJson,
  toSessionsCsv,
  toMeasurementsCsv,
  type AudienceId,
  type ExportDocument,
  type ExportMode,
  type GameState,
} from '../..';
import {
  CLIMBER,
  CLIMB_WORDS,
  RUNNER,
  TODAY,
  snapshotFor,
} from '../../export/testing/fixtures';

const MODES: readonly ExportMode[] = ['climb', 'run', 'swim'];
const HUMAN = AUDIENCE_ORDER.filter(id => id !== 'data');
const RENDERERS = [
  ['text', renderText],
  ['markdown', renderMarkdown],
  ['html', renderHtml],
] as const;

/** Words the app itself never writes. The person's own text may. */
const CLAIMS =
  /\b(injur\w*|tears?|strain|rupture|healed|cleared|safe to|validated|proven|prevent\w*|accurate|clinically|risk)\b/i;

/** The document without anything the person picked or typed, or quoted research. */
function generatedOnly(doc: ExportDocument, mode: ExportMode): string {
  const goal = snapshotFor(mode).about?.goal ?? '\u0000';
  return [
    doc.title,
    ...doc.intro,
    ...doc.closing,
    ...doc.legend,
    ...doc.sections
      .filter(
        s => !['questions', 'reason', 'whyLayout', 'goal', 'about'].includes(s.id),
      )
      .flatMap(s => [
        s.heading,
        ...s.blocks.flatMap(b =>
          b.kind === 'text'
            ? [b.text]
            : b.kind === 'list'
            ? b.items
            : b.kind === 'table'
            ? [...b.head, ...b.rows.flat()]
            : [b.label],
        ),
      ]),
  ]
    .join('\n')
    .replace(goal, '');
}

const headings = (doc: ExportDocument) => doc.sections.map(s => s.id);

describe.each(MODES)('%s snapshot', mode => {
  it('keeps only the period and newest first', () => {
    const s = snapshotFor(mode, { weeks: 2 });
    expect(s.period).toEqual({ from: '2026-09-21', to: TODAY, weeks: 2 });
    expect(s.sessions.every(x => x.date >= '2026-09-21')).toBe(true);
    const dates = s.sessions.map(x => x.date);
    expect(dates).toEqual([...dates].sort().reverse());
    const all = snapshotFor(mode, { weeks: null });
    expect(all.sessions.length).toBe(all.allSessions.length);
    expect(all.period.from <= '2026-09-21').toBe(true);
  });

  it('marks examples and the demo profile', () => {
    expect(snapshotFor(mode, { sample: true }).containsExamples).toBe(true);
    expect(snapshotFor(mode).containsExamples).toBe(false);
    const demo = snapshotFor(mode, { demoProfile: true });
    expect(demo.demoProfile).toBe(true);
    expect(demo.sessions.every(x => x.provenance === 'example')).toBe(true);
  });
});

describe('climbing snapshot', () => {
  const s = snapshotFor('climb');

  it('maps climbs without time or distance', () => {
    const climb = s.allSessions.find(x => x.id === 'sample-1')!;
    expect(climb).toMatchObject({
      kind: 'slab',
      grade: 'V2',
      styles: ['controlled'],
      holds: ['sloper'],
      minutes: null,
      distance: null,
      done: true,
    });
  });

  it('names marked spots, and says not sure where when none', () => {
    expect(s.flags[0].where).toBe('Right ring finger');
    expect(s.flags[0].spots).toEqual(['A2 pulley (base segment)']);
    const unsure = snapshotFor('climb', {
      game: { ...CLIMBER, flags: [{ ...CLIMBER.flags[0], spots: [] }] },
    });
    const doc = renderText(buildDocument('physio', unsure));
    expect(doc).toContain('Right ring finger, not sure where');
  });

  it('labels measurements by how they were taken and compares like with like', () => {
    const force = s.measurements.find(m => m.metric === 'finger_force')!;
    expect(force.provenance).toBe('measured_tool');
    expect(force.previous).toEqual({ date: '2026-09-01', value: 170 });
    expect(force.setup).toContain('half crimp, 20 mm edge, bent arm');
    expect(s.measurements.find(m => m.metric === 'leg_spread')!.provenance).toBe(
      'camera_estimate',
    );
    expect(s.measurements.find(m => m.metric === 'dead-hang')!.provenance).toBe(
      'timed_in_app',
    );
    const simulated = snapshotFor('climb', {
      game: {
        ...CLIMBER,
        assessments: [{ ...CLIMBER.assessments![2], simulated: true }],
      },
    });
    expect(simulated.measurements[0].provenance).toBe('example');
    expect(simulated.containsExamples).toBe(true);
  });

  it('never copies unknown fields such as an email into the snapshot', () => {
    const game = {
      ...CLIMBER,
      email: 'someone@example.com',
      token: 'secret-token',
    } as GameState;
    const snap = buildClimbingSnapshot(game, CLIMB_WORDS, {
      today: TODAY,
      weeks: null,
      demoProfile: false,
    });
    const json = toJson(snap);
    expect(json).not.toMatch(/email|token|password|api[_-]?key|@/i);
    for (const id of AUDIENCE_ORDER) {
      expect(renderText(buildDocument(id, snap))).not.toMatch(/@|secret/);
    }
  });
});

describe('sport snapshots', () => {
  it('uses the sport unit and pace', () => {
    const run = snapshotFor('run').allSessions[0];
    expect(run.unit).toBe('km');
    expect(run.pace).toMatch(/\/km$/);
    const swim = snapshotFor('swim').allSessions[0];
    expect(swim.unit).toBe('m');
    expect(swim.pace).toMatch(/\/100 m$/);
  });

  it('has no measurements or setup answers', () => {
    for (const mode of ['run', 'swim'] as const) {
      const s = snapshotFor(mode);
      expect(s.measurements).toEqual([]);
      expect(s.about).toBeNull();
    }
  });
});

describe.each(MODES)('%s documents', mode => {
  const s = snapshotFor(mode);

  it.each(HUMAN)('%s has its title, period and what it is not', id => {
    const doc = buildDocument(id, s);
    for (const [kind, render] of RENDERERS) {
      const out = render(doc);
      const notThis = AUDIENCES[id].notThis;
      expect(out).toContain(kind === 'html' ? escapeHtml(notThis) : notThis);
      if (id !== 'family') {
        expect(out).toContain('Made 2026-10-04 in Climbing Monkey.');
        expect(out).toContain('Covers 2026-09-07 to 2026-10-04 (4 weeks).');
      }
    }
  });

  it.each(HUMAN)('%s writes no dashes, emoji or HarmonyOS', id => {
    for (const snap of [s, snapshotFor(mode, { weeks: null, sample: true })]) {
      for (const [, render] of RENDERERS) {
        const out = render(buildDocument(id, snap));
        expect(out).not.toMatch(/[–—]/);
        expect(out).not.toContain(' - ');
        expect(out).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(out).not.toMatch(/harmony/i);
      }
    }
  });

  it.each(HUMAN)('%s never diagnoses or claims validation', id => {
    const doc = buildDocument(id, snapshotFor(mode, { weeks: null }), {
      include: Object.fromEntries(
        sectionsFor(AUDIENCES[id], mode).map(d => [d.id, true]),
      ),
    });
    expect(generatedOnly(doc, mode)).not.toMatch(CLAIMS);
  });

  it.each(HUMAN)('%s shows the example banner only with examples', id => {
    const own = renderText(buildDocument(id, s));
    expect(own).not.toMatch(/example data/i);
    const sample = renderText(
      buildDocument(id, snapshotFor(mode, { sample: true })),
    );
    expect(sample).toMatch(/example data/i);
    const demo = renderText(
      buildDocument(id, snapshotFor(mode, { demoProfile: true })),
    );
    expect(demo).toContain(
      'Example data. This record is made-up demo data, not about a real person.',
    );
  });

  it.each(HUMAN)('%s legend lists exactly the labels it uses', id => {
    const doc = buildDocument(id, snapshotFor(mode, { sample: true }));
    const body = renderText({ ...doc, legend: [] });
    for (const line of doc.legend) {
      const label = line.slice(0, line.indexOf(']') + 1);
      expect(body).toContain(label);
    }
    for (const label of body.match(/\[(entered|timed|my tool|camera|app|example)\]/g) ??
      []) {
      expect(doc.legend.some(line => line.startsWith(label))).toBe(true);
    }
  });

  it.each(HUMAN)('%s keeps default sections, and drops one turned off', id => {
    const defs = sectionsFor(AUDIENCES[id], mode);
    const doc = buildDocument(id, s);
    const optional = defs.find(d => d.defaultOn && !d.locked && d.id !== 'reason');
    if (optional) {
      expect(headings(doc)).toContain(optional.id);
      const off = buildDocument(id, s, { include: { [optional.id]: false } });
      expect(headings(off)).not.toContain(optional.id);
    }
    for (const locked of defs.filter(d => d.locked)) {
      const off = buildDocument(id, s, { include: { [locked.id]: false } });
      expect(headings(off)).toContain(locked.id);
    }
  });

  if (mode !== 'climb') {
    it.each(HUMAN)('%s has no climbing-only sections', id => {
      const all = Object.fromEntries(
        AUDIENCES[id].sections.map(d => [d.id, true]),
      );
      const ids = headings(buildDocument(id, s, { include: all }));
      for (const climbOnly of ['grip', 'measurements', 'about', 'goal']) {
        expect(ids).not.toContain(climbOnly);
      }
    });
  }
});

describe('questions and typed text', () => {
  const s = snapshotFor('run');

  it('prints picked questions in order, then the typed one, trimmed and capped', () => {
    const long = `  ${'a'.repeat(250)}  `;
    const doc = renderText(
      buildDocument('doctor', s, {
        questions: [
          'What signs mean I should stop and come back?',
          'Is it safe for me to keep training while this is sore?',
          'Not a prompt we offer',
        ],
        customQuestion: '  Can I   race next month? ',
        reason: long,
      }),
    );
    expect(doc).toContain(
      '1. What signs mean I should stop and come back?\n2. Is it safe for me to keep training while this is sore?\n3. Can I race next month?',
    );
    expect(doc).not.toContain('Not a prompt we offer');
    expect(doc).toContain(`Why I am here\n${'a'.repeat(200)}\n`);
    expect(doc).not.toContain('a'.repeat(201));
  });

  it('drops questions about a sore spot when nothing is flagged', () => {
    const none = snapshotFor('run', { sport: { ...RUNNER, flags: [] } });
    const offered = AUDIENCES.doctor.questions(none).map(q => q.text);
    expect(offered.join(' ')).not.toMatch(/sore/);
    expect(AUDIENCES.doctor.questions(none).every(q => q.defaultOn)).toBe(true);
    const family = AUDIENCES.family.questions(none).map(q => q.text);
    expect(family.join(' ')).not.toContain('feels this week');
    expect(AUDIENCES.family.questions(s)[0].text).toBe(
      'Ask me how my left knee feels this week.',
    );
  });
});

describe('doctor', () => {
  it('reports minutes a week for run and swim without a guideline comparison', () => {
    for (const mode of ['run', 'swim'] as const) {
      const out = renderText(buildDocument('doctor', snapshotFor(mode)));
      expect(out).toMatch(/Moving time: about \d+ minutes a week\./);
      expect(out).toContain('Intensity is not recorded.');
      expect(out).not.toMatch(/150|guideline|WHO/);
    }
  });

  it('says time is not recorded for climbs', () => {
    const out = renderText(buildDocument('doctor', snapshotFor('climb')));
    expect(out).toContain('Time is not recorded for climbs.');
    expect(out).toContain('A2 pulley (base segment)');
    expect(out).not.toMatch(/minutes a week/);
  });
});

describe('physio', () => {
  it('counts sessions before and since a flag, with no ratio', () => {
    const out = renderText(buildDocument('physio', snapshotFor('run')));
    // Knee flagged 2026-09-27: 7 runs since, 5 in the 4 weeks before.
    expect(out).toMatch(/Runs\s+\| 5\s+\| 7/);
    expect(out).not.toMatch(/ratio|acwr/i);
  });

  it('counts crimp climbs for grip context', () => {
    const out = renderText(buildDocument('physio', snapshotFor('climb')));
    expect(out).toContain(
      'Climbs with crimps in the 4 weeks before my right ring finger was flagged: 4 of 8. Since: 4 of 9.',
    );
    expect(out).toContain('measured with: Tindeq');
    expect(out).toContain('Changed by +10 N since 2026-09-01');
    expect(out).toContain('not measured joint ranges');
  });
});

describe('coach', () => {
  it('waits for 3 logs before a share, says effort is not recorded and marks drafts', () => {
    const few = snapshotFor('run', {
      sport: { ...RUNNER, flags: [], logs: RUNNER.logs.slice(0, 4), completed: [] },
    });
    const out = renderText(buildDocument('coach', few));
    expect(out).toContain('not enough logs to compare');
    expect(out).toContain('Effort ratings are not recorded in this app.');
    const practice = snapshotFor('run', { sport: { ...RUNNER, flags: [] } });
    expect(practice.quest?.draft).toBe(true);
    expect(renderText(buildDocument('coach', practice))).toContain(
      'Draft quest written by the app team. Not tested as a training plan.',
    );
  });
});

describe('nutrition', () => {
  it.each(MODES)('%s never estimates food or energy, and hides sore spots by default', mode => {
    const doc = buildDocument('nutrition', snapshotFor(mode));
    const out = renderText(doc);
    expect(out).toContain(NOT_RECORDED);
    expect(headings(doc)).not.toContain('flags');
    const generated = generatedOnly(doc, mode)
      .replace(NOT_RECORDED, '')
      .replace(AUDIENCES.nutrition.notThis, '');
    expect(generated).not.toMatch(/kcal|calorie|energy needs|weight/i);
  });
});

describe('family', () => {
  it.each(MODES)('%s stays short and plain', mode => {
    const out = renderText(buildDocument('family', snapshotFor(mode)));
    const words = out.split(/\s+/).filter(Boolean);
    expect(words.length).toBeLessThan(120);
    for (const sentence of out.split(/[.?!\n]/)) {
      expect(sentence.split(/\s+/).filter(Boolean).length).toBeLessThan(15);
    }
    expect(out).not.toMatch(/\d+\s?(km|m|min|N|kg)\b/);
    expect(out).not.toMatch(/\[/);
  });
});

describe('you', () => {
  it('holds everything, the rules, the XP note and the research', () => {
    const s = snapshotFor('climb', { weeks: null });
    const out = renderMarkdown(buildDocument('you', s));
    expect(out).toContain(`All climbs in this period`);
    expect(out.match(/^- 2026-/gm)?.length).toBeGreaterThanOrEqual(
      s.allSessions.length,
    );
    expect(out).toContain('A tie goes to slab first');
    expect(out).toContain('It does not measure fitness, strength or healing.');
    expect(out).toContain('## How was this data created?');
    expect(out).toContain('None of these studies tested this app.');
    const sansoni = RESEARCH_SOURCES.find(r => r.id === 'sansoni2015')!;
    expect(out).toContain(sansoni.finding);
    expect(out).toContain('Read at abstract level.');
  });
});

describe('renderers', () => {
  const hostile = '<script>alert(1)</script>';
  const game: GameState = {
    ...CLIMBER,
    logs: [{ ...CLIMBER.logs[0], date: '2026-10-01', grade: hostile }],
  };

  it('escapes typed and free text in HTML and stays self-contained', () => {
    const html = renderHtml(
      buildDocument('coach', snapshotFor('climb', { game }), {
        customQuestion: hostile,
      }),
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).not.toMatch(/<link|<img|src=/);
    const physio = renderHtml(
      buildDocument('physio', snapshotFor('climb', { game }), {
        reason: hostile,
      }),
    );
    expect(physio).not.toContain('<script>');
  });

  it('keeps blank lines between sections, and Markdown has headings and tables', () => {
    const doc = buildDocument('coach', snapshotFor('run'));
    expect(renderText(doc)).toContain('\n\nWeek by week\n');
    const md = renderMarkdown(doc);
    expect(md).toContain('# Running training for my coach');
    expect(md).toContain('## Week by week');
    expect(md).toContain('| --- |');
  });

  it('turns long dashes into plain words', () => {
    expect(noDashes('2026–2027')).toBe('2026 to 2027');
    expect(noDashes('one — two')).toBe('one, two');
    expect(noDashes('one - two')).toBe('one, two');
  });
});

describe('data files', () => {
  it('JSON has a schema, provenance per record and the disclaimer', () => {
    const data = JSON.parse(toJson(snapshotFor('run', { sample: true })));
    expect(data.schema).toBe('climbing-monkey-export/1');
    expect(data.containsExamples).toBe(true);
    expect(data.disclaimer).toContain('Not a medical record');
    expect(data.sessions[0].provenance).toBe('example');
    expect(data.units).toEqual({ distance: 'km', duration: 'min' });
  });

  it('CSV quotes text and guards formulas, but not numbers', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell(-3)).toBe('-3');
    const game = {
      ...CLIMBER,
      logs: [{ ...CLIMBER.logs[0], grade: '=1+1' }],
    };
    const sessions = toSessionsCsv(snapshotFor('climb', { game }));
    expect(sessions.split('\r\n')[0]).toBe(SESSION_COLUMNS.join(','));
    expect(sessions).toContain(",'=1+1,");
    const measurements = toMeasurementsCsv(snapshotFor('climb'));
    expect(measurements.split('\r\n')[0]).toBe(MEASUREMENT_COLUMNS.join(','));
  });

  it('names files by audience, mode and date only', () => {
    const s = snapshotFor('swim');
    expect(exportFile('doctor', 'text', s, { reason: 'secret' })).toMatchObject({
      name: 'climbing-monkey-doctor-swim-2026-10-04.txt',
      mimeType: 'text/plain',
    });
    expect(exportFile('data', 'json', s).mimeType).toBe('application/json');
    expect(exportFile('coach', 'csv', s).name).toBe(
      'climbing-monkey-coach-swim-2026-10-04.csv',
    );
    expect(exportFile('you', 'html', s).mimeType).toBe('text/html');
    expect(exportFile('you', 'markdown', s).name).toMatch(/\.md$/);
  });
});

describe('why this format', () => {
  it.each(AUDIENCE_ORDER)('%s cites only sources in the registry', id => {
    const ids = new Set(RESEARCH_SOURCES.map(r => r.id));
    const explanation = explainAudience(id as AudienceId, CLIMB_WORDS, 'climb');
    expect(explanation.sourceIds.every(src => ids.has(src))).toBe(true);
    expect(explanation.limitations.length).toBeGreaterThan(0);
    expect(explanation.status).toBe('app_rule');
    expect(
      [explanation.summary, explanation.rule, ...explanation.limitations].join(
        ' ',
      ),
    ).not.toMatch(/[–—]|validated|proven|prevent/i);
  });
});

describe('empty records', () => {
  it('say so instead of inventing zeros', () => {
    const s = buildClimbingSnapshot(emptyGame, CLIMB_WORDS, {
      today: TODAY,
      weeks: 4,
      demoProfile: false,
    });
    const out = renderText(buildDocument('doctor', s));
    expect(out).toContain('No climbs logged in this period.');
    expect(out).toContain('No sore spots flagged.');
    const run = renderText(
      buildDocument(
        'nutrition',
        snapshotFor('run', {
          sport: { ...RUNNING.sample, logs: [], flags: [] },
        }),
      ),
    );
    expect(run).toContain('No runs logged in this period.');
    expect(sampleGame.logs.length).toBeGreaterThan(0);
  });
});

describe('period in data files', () => {
  it('CSV and JSON hold only the sessions in the chosen period', () => {
    const four = snapshotFor('run', { weeks: 2 });
    const all = snapshotFor('run', { weeks: null });
    expect(four.sessions.length).toBeLessThan(all.sessions.length);
    const rows = toSessionsCsv(four).trim().split('\r\n');
    expect(rows).toHaveLength(four.sessions.length + 1);
    expect(JSON.parse(toJson(four)).sessions).toHaveLength(four.sessions.length);
    expect(JSON.parse(toJson(all)).sessions).toHaveLength(all.allSessions.length);
  });
});

describe('format flow', () => {
  it.each(MODES)('draws who reads it, what goes in and what stays out in %s', mode => {
    for (const id of AUDIENCE_ORDER) {
      const { flow } = explainAudience(id, CLIMB_WORDS, mode);
      expect(isDecisionFlow(flow)).toBe(true);
      const said = flowText(flow!).join(' ');
      expect(said).toContain('Who reads it');
      expect(said).toContain('What goes in');
      expect(said).toContain('What stays out');
      expect(said).not.toMatch(/[\u2013\u2014]|validated|proven|prevent/i);
      expect(flow!.nodes.filter(n => n.team)).toHaveLength(2);
    }
  });
});

describe('sources by mode', () => {
  it('cites finger, grip and camera studies only in climbing', () => {
    const climbOnly = /klauser2002|schweizer2001|michailov2018|stenum2021/;
    for (const id of AUDIENCE_ORDER) {
      for (const mode of ['run', 'swim'] as const) {
        expect(
          explainAudience(id, CLIMB_WORDS, mode).sourceIds.join(' '),
        ).not.toMatch(climbOnly);
      }
    }
    expect(
      explainAudience('physio', CLIMB_WORDS, 'climb').sourceIds,
    ).toContain('klauser2002');
    const swim = renderText(buildDocument('you', snapshotFor('swim')));
    expect(swim).not.toContain('Klauser');
    const climb = renderText(buildDocument('you', snapshotFor('climb')));
    expect(climb).toContain('Klauser');
  });
});
