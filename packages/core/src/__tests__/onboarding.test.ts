import {
  BASELINE_LIMITS,
  BASELINE_TESTS,
  CONNECTIONS,
  baselineError,
  baselineTest,
  bodyCmError,
  buildOnboardingResult,
  connectionsFor,
  describeReach,
  emptyOnboardingDraft,
  clockFromDigits,
  formatClock,
  formatResult,
  missingDetails,
  parseWholeNumber,
  secondsFromClockDigits,
  type OnboardingDraft,
} from '../onboarding';

const ANSWERED: OnboardingDraft = {
  ...emptyOnboardingDraft,
  places: ['outdoors', 'bouldering-gym'],
  experience: '2-to-5-years',
  grade: 'V3',
  goal: 'finger-strength',
};

describe('the home test library', () => {
  it('has six tests, each with three steps, a safety line and a known unit', () => {
    expect(BASELINE_TESTS.map(t => t.id)).toEqual([
      'dead-hang',
      'pull-ups',
      'sit-and-reach',
      'plank',
      'one-leg-balance',
      'push-ups',
    ]);
    BASELINE_TESTS.forEach(test => {
      expect(test.steps).toHaveLength(3);
      expect(test.safety.length).toBeGreaterThan(0);
      expect(Object.keys(BASELINE_LIMITS)).toContain(test.unit);
    });
  });

  it('times seconds with the stopwatch and counts reps and centimetres', () => {
    BASELINE_TESTS.forEach(test => {
      expect([test.id, test.input]).toEqual([
        test.id,
        test.unit === 'seconds' ? 'stopwatch' : 'counter',
      ]);
    });
  });

  it('keeps the copy free of dashes and exclamation marks', () => {
    const copy = JSON.stringify([BASELINE_TESTS, CONNECTIONS]);
    expect(copy).not.toMatch(/[\u2013\u2014!]/);
  });

  it('finds a test by id and refuses unknown ids', () => {
    expect(baselineTest('plank').name).toBe('Plank');
    expect(() => baselineTest('nope' as never)).toThrow('Unknown');
  });
});

describe('checks', () => {
  it('parses whole numbers only, including negative ones', () => {
    expect(parseWholeNumber(' 42 ')).toBe(42);
    expect(parseWholeNumber('-7')).toBe(-7);
    expect(parseWholeNumber('-0')).toBe(0);
    expect(['', '4.5', 'abc', '1e3', '--2', '3-'].map(parseWholeNumber)).toEqual(
      [null, null, null, null, null, null],
    );
  });

  it('accepts a height or arm span from 100 to 250 cm', () => {
    expect(bodyCmError('178')).toBeNull();
    expect(bodyCmError('100')).toBeNull();
    expect(bodyCmError('250')).toBeNull();
    expect(bodyCmError('')).toBe('Enter a number.');
    expect(bodyCmError('99')).toBe('Use a whole number from 100 to 250.');
    expect(bodyCmError('1.80')).toBe('Use a whole number from 100 to 250.');
  });

  it('limits results per unit', () => {
    const hang = baselineTest('dead-hang');
    const pullUps = baselineTest('pull-ups');
    const reach = baselineTest('sit-and-reach');
    expect(baselineError(hang, 0)).toBeNull();
    expect(baselineError(hang, 600)).toBeNull();
    expect(baselineError(hang, 601)).toBe('Use a whole number from 0 to 600.');
    expect(baselineError(pullUps, 100)).toBeNull();
    expect(baselineError(pullUps, -1)).not.toBeNull();
    expect(baselineError(pullUps, 2.5)).not.toBeNull();
    expect(baselineError(reach, -50)).toBeNull();
    expect(baselineError(reach, 60)).toBeNull();
    expect(baselineError(reach, -51)).toBe('Use a whole number from -50 to 60.');
  });

  it('names the required answers that are still missing', () => {
    expect(missingDetails(emptyOnboardingDraft)).toEqual([
      'where you climb',
      'how long you have climbed',
      'your usual grade',
      'your goal',
    ]);
    expect(missingDetails(ANSWERED)).toEqual([]);
  });
});

describe('buildOnboardingResult', () => {
  it('waits for every required answer', () => {
    expect(buildOnboardingResult(emptyOnboardingDraft, '2026-10-03')).toBeNull();
    expect(
      buildOnboardingResult({ ...ANSWERED, goal: null }, '2026-10-03'),
    ).toBeNull();
  });

  it('collects details, apps and test results with their method and date', () => {
    const result = buildOnboardingResult(
      {
        ...ANSWERED,
        body: { heightCm: 178, armSpanCm: 183 },
        connections: { garmin: 'declined', strava: 'demo' },
        results: {
          'push-ups': { value: 18, method: 'counter' },
          'dead-hang': { value: 34, method: 'stopwatch' },
        },
      },
      '2026-10-03',
    );
    expect(result).toEqual({
      version: 1,
      date: '2026-10-03',
      details: {
        places: ['bouldering-gym', 'outdoors'],
        experience: '2-to-5-years',
        grade: 'V3',
        goal: 'finger-strength',
        body: { heightCm: 178, armSpanCm: 183 },
      },
      connections: [
        { id: 'strava', choice: 'demo' },
        { id: 'garmin', choice: 'declined' },
      ],
      baseline: [
        {
          testId: 'dead-hang',
          value: 34,
          unit: 'seconds',
          method: 'stopwatch',
          date: '2026-10-03',
        },
        {
          testId: 'push-ups',
          value: 18,
          unit: 'reps',
          method: 'counter',
          date: '2026-10-03',
        },
      ],
      skippedTests: ['pull-ups', 'sit-and-reach', 'plank', 'one-leg-balance'],
    });
  });

  it('drops numbers outside the limits instead of saving them', () => {
    const result = buildOnboardingResult(
      {
        ...ANSWERED,
        body: { heightCm: 178, armSpanCm: 40 },
        results: { plank: { value: 9000, method: 'typed' } },
      },
      '2026-10-03',
    );
    expect(result?.details.body).toBeNull();
    expect(result?.baseline).toEqual([]);
    expect(result?.skippedTests).toHaveLength(6);
  });
});

describe('connectionsFor', () => {
  it("offers the phone's own health store only on that phone", () => {
    expect(connectionsFor('ios')).toEqual([
      'strava',
      'huawei-health',
      'apple-health',
      'garmin',
    ]);
    expect(connectionsFor('android')).toContain('health-connect');
    expect(connectionsFor('android')).not.toContain('apple-health');
    expect(connectionsFor('web')).toEqual(
      expect.arrayContaining(['apple-health', 'health-connect']),
    );
  });
});

describe('wording', () => {
  it('formats a stopwatch time', () => {
    expect([0, 9, 75, 600].map(formatClock)).toEqual([
      '0:00',
      '0:09',
      '1:15',
      '10:00',
    ]);
  });

  it('fills typed clock digits in from the right, like a microwave', () => {
    expect(['', '1', '12', '125', '90', '1000'].map(clockFromDigits)).toEqual([
      '0:00',
      '0:01',
      '0:12',
      '1:25',
      '0:90',
      '10:00',
    ]);
    expect(['1', '12', '125', '90', '1000'].map(secondsFromClockDigits)).toEqual(
      [1, 12, 85, 90, 600],
    );
    expect(['', '-1', '1:25', 'abc'].map(secondsFromClockDigits)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('describes reach without calling it good or bad', () => {
    expect(describeReach(4)).toBe('4 cm past your toes');
    expect(describeReach(-3)).toBe('3 cm short of your toes');
    expect(describeReach(0)).toBe('Level with your toes');
  });

  it('formats results in plain words', () => {
    expect(formatResult('seconds', 32)).toBe('32 s');
    expect(formatResult('seconds', 75)).toBe('1 min 15 s');
    expect(formatResult('seconds', 120)).toBe('2 min');
    expect(formatResult('reps', 1)).toBe('1 rep');
    expect(formatResult('reps', 12)).toBe('12 reps');
    expect(formatResult('cm', -2)).toBe('2 cm short of your toes');
  });
});
