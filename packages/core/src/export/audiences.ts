/**
 * One definition per reader: what it holds, which sections are on by
 * default, the questions it offers and the line saying what it is not.
 * Per-mode differences live in `modes` and in the mode's words, so one
 * definition serves climbing, running and swimming.
 */
import type {
  Audience,
  AudienceId,
  ExportMode,
  ExportSnapshot,
  QuestionPrompt,
  SectionDef,
} from './types';

export const AUDIENCE_ORDER: readonly AudienceId[] = [
  'doctor',
  'physio',
  'coach',
  'nutrition',
  'family',
  'you',
  'data',
];

/** One line per reader on what the export is not. Always included. */
export const NOT_THIS: Readonly<Record<AudienceId, string>> = {
  doctor:
    'This is my own record from a training app. It is not a medical record, and the app does not diagnose.',
  physio:
    'Sore spots show where I marked pain. They are not a diagnosis, and the app cannot see inside a finger or joint.',
  coach:
    "Counts come from my own logs. They are not a fitness test, and the app's drills are drafts, not a tested plan.",
  nutrition:
    'This app does not record food, weight or energy, and it does not estimate what I need to eat.',
  family: 'This is an update from my training app, not medical advice.',
  you: 'Counts describe what you logged. They do not score ability, and the app does not diagnose.',
  data: 'Records a person entered in a training app. Not a medical record. No diagnosis.',
};

/** Always in the nutrition sheet, whatever is toggled. */
export const NOT_RECORDED =
  'This app does not record food, drinks, body weight, periods or energy. It does not estimate what I need to eat.';

export const DRAFT_LINE =
  'Draft quest written by the app team. Not tested as a training plan.';

export const XP_LINE =
  'XP rewards finished quests. It does not measure fitness, strength or healing.';

export const PAUSE_LINE = 'This is an app rule, not treatment advice.';

const CLIMB: readonly ExportMode[] = ['climb'];
const TIMED: readonly ExportMode[] = ['run', 'swim'];

/** Toggle names and one plain line each, shared by every audience. */
const SECTION: Readonly<
  Record<SectionDef['id'], Omit<SectionDef, 'id' | 'defaultOn'>>
> = {
  reason: {
    label: 'Why you are going',
    detail: 'The line you type below. Never saved.',
  },
  activity: {
    label: 'Activity',
    detail: 'How often you trained, and weekly totals.',
  },
  otherSports: {
    label: 'My other sports',
    detail: 'One line each for the other pets you log with.',
  },
  weekly: { label: 'Week by week', detail: 'A small table, one row a week.' },
  effort: {
    label: 'Effort',
    detail: 'Says that effort is not recorded in this app.',
  },
  byKind: { label: 'By type', detail: 'Logged and done for each type.' },
  recent: { label: 'Sessions', detail: 'One line per session, newest first.' },
  pattern: {
    label: 'Training pattern',
    detail: 'Which weekdays you train, and typical length.',
  },
  longest: {
    label: 'Longest sessions',
    detail: 'Your three longest, by time.',
    modes: TIMED,
  },
  restDays: { label: 'Rest days', detail: 'Days with nothing logged.' },
  goal: {
    label: 'My goal',
    detail: 'The goal you picked in setup.',
    modes: CLIMB,
  },
  notRecorded: {
    label: 'Not in this record',
    detail: 'Food, weight and energy are not recorded.',
  },
  flags: {
    label: 'Sore spots',
    detail: 'Where you marked pain, and since when.',
  },
  loadAroundFlags: {
    label: 'Before and since',
    detail: 'Sessions in the 4 weeks before a sore spot and since.',
  },
  grip: {
    label: 'Grip context',
    detail: 'Climbs with crimps before and since a sore finger.',
    modes: CLIMB,
  },
  measurements: {
    label: 'Measurements',
    detail: 'Your own measurements and home tests, with how each was taken.',
    modes: CLIMB,
  },
  paused: {
    label: 'Paused quests',
    detail: 'What the app pauses while something is sore.',
  },
  plan: { label: 'Plan now', detail: 'Your focus and quest from the app.' },
  progress: { label: 'Progress', detail: 'Level and XP. A game reward.' },
  about: {
    label: 'Setup answers',
    detail: 'Places, experience, usual grade and goal.',
    modes: CLIMB,
  },
  provenance: {
    label: 'How it was made',
    detail: 'Where each kind of record came from: typed, timed or worked out.',
  },
  questions: { label: 'Questions', detail: 'The questions you pick below.' },
  afterVisit: {
    label: 'After the visit',
    detail: 'Blank lines to write what was said.',
  },
  whyLayout: {
    label: 'Why this layout',
    detail: 'The research behind the layout, with its limits.',
  },
};

function section(
  id: SectionDef['id'],
  defaultOn: boolean | 'locked',
  extra?: Partial<SectionDef>,
): SectionDef {
  return {
    id,
    ...SECTION[id],
    defaultOn: defaultOn !== false,
    ...(defaultOn === 'locked' ? { locked: true } : {}),
    ...extra,
  };
}

type Prompt = QuestionPrompt &
  Readonly<{ needsFlag?: boolean; modes?: readonly ExportMode[] }>;

/**
 * The prompts that fit this record: flag questions only when something is
 * flagged, mode questions only in their mode. If a default drops out, the
 * next prompt fills in, so three stay ticked when three exist.
 */
function fit(s: ExportSnapshot, prompts: readonly Prompt[]): QuestionPrompt[] {
  const usable = prompts.filter(
    p =>
      (!p.needsFlag || s.flags.length > 0) &&
      (!p.modes || p.modes.includes(s.mode)),
  );
  const wanted = Math.min(
    prompts.filter(p => p.defaultOn).length,
    usable.length,
  );
  let on = usable.filter(p => p.defaultOn).length;
  return usable.map(p => {
    if (p.defaultOn) {
      return { text: p.text, defaultOn: true };
    }
    const turnOn = on < wanted;
    on += turnOn ? 1 : 0;
    return { text: p.text, defaultOn: turnOn };
  });
}

const firstFlag = (s: ExportSnapshot) =>
  (s.flags[0]?.where ?? 'sore spot').toLowerCase();

export const AUDIENCES: Readonly<Record<AudienceId, Audience>> = {
  doctor: {
    id: 'doctor',
    name: 'Doctor or GP',
    forWho: 'A GP or sports doctor in a short visit.',
    holds: 'Why you are going, activity, sore spots, your questions.',
    files: ['text', 'html'],
    sections: [
      section('reason', true),
      section('activity', true),
      section('otherSports', false),
      section('flags', true),
      section('loadAroundFlags', true),
      section('measurements', false),
      section('questions', true),
      section('afterVisit', true),
      section('provenance', true),
      section('whyLayout', false),
    ],
    questions: s =>
      fit(s, [
        {
          text: 'Is it safe for me to keep training while this is sore?',
          defaultOn: true,
          needsFlag: true,
        },
        {
          text: 'What signs mean I should stop and come back?',
          defaultOn: true,
          needsFlag: true,
        },
        {
          text: 'Do I need a scan or a referral to a physio?',
          defaultOn: true,
          needsFlag: true,
        },
        {
          text: 'Is my current amount of activity right for my health?',
          defaultOn: false,
        },
        {
          text: 'Could any of my medicines or conditions affect my training?',
          defaultOn: false,
        },
      ]),
    questionsHeading: 'Questions I want to ask',
    notThis: NOT_THIS.doctor,
    sourceIds: [
      'muller2018',
      'sansoni2015',
      'kinnersley2008',
      'talevski2020',
      'coleman2012',
      'bull2020',
      'klauser2002',
    ],
  },
  physio: {
    id: 'physio',
    name: 'Physio',
    forWho: 'A physiotherapist or hand therapist.',
    holds: 'Sore spots in detail, load before and since, measurements.',
    files: ['text', 'html'],
    sections: [
      section('reason', true),
      section('flags', 'locked'),
      section('loadAroundFlags', true),
      section('grip', true),
      section('measurements', true),
      section('paused', true),
      section('otherSports', false),
      section('questions', true),
      section('afterVisit', true),
      section('provenance', true),
      section('whyLayout', false),
    ],
    questions: s =>
      fit(s, [
        {
          text: 'What could be causing this, and how can we check?',
          defaultOn: true,
          needsFlag: true,
        },
        {
          text: 'Which activities can I keep doing, and which should I change for now?',
          defaultOn: true,
          needsFlag: true,
        },
        {
          text: 'How should I build back up, and how will I know it is working?',
          defaultOn: true,
          needsFlag: true,
        },
        {
          text: 'What should I record between visits?',
          defaultOn: false,
        },
        {
          text: 'Is there anything in how I train that you would change?',
          defaultOn: false,
        },
      ]),
    questionsHeading: 'Questions I want to ask',
    notThis: NOT_THIS.physio,
    sourceIds: [
      'bahr2020',
      'clarsen2013',
      'soligard2016',
      'impellizzeri2020',
      'klauser2002',
      'schweizer2001',
      'michailov2018',
      'stenum2021',
      'sansoni2015',
      'elwyn2012',
    ],
  },
  coach: {
    id: 'coach',
    name: 'Coach',
    forWho: 'Your climbing, running or swimming coach.',
    holds: 'Week by week, by type, recent sessions, plan, sore spots.',
    files: ['text', 'markdown', 'html', 'csv'],
    sections: [
      section('weekly', true),
      section('effort', 'locked'),
      section('byKind', true),
      section('recent', true),
      section('plan', true),
      section('goal', true),
      section('measurements', true),
      section('flags', true),
      section('grip', false),
      section('otherSports', false),
      section('questions', true),
      section('provenance', true),
      section('whyLayout', false),
    ],
    questions: s =>
      fit(s, [
        { text: 'Does my week look balanced to you?', defaultOn: true },
        {
          text: 'What should I change while a spot is sore?',
          defaultOn: true,
          needsFlag: true,
        },
        {
          text: `Would rating effort after each ${s.words.session} help you plan?`,
          defaultOn: true,
        },
        {
          text: 'How hard should my easier sessions feel?',
          defaultOn: false,
          modes: ['run', 'swim'],
        },
        {
          text: 'Which walls or styles should I spend more time on?',
          defaultOn: false,
          modes: ['climb'],
        },
      ]),
    questionsHeading: 'What I would like help with',
    notThis: NOT_THIS.coach,
    sourceIds: [
      'impellizzeri2019',
      'bourdon2017',
      'foster2001',
      'soligard2016',
      'impellizzeri2020',
      'michailov2018',
    ],
  },
  nutrition: {
    id: 'nutrition',
    name: 'Nutritionist',
    forWho: 'A sports dietitian or nutritionist.',
    holds: 'When and how long you train, rest days, your goal.',
    files: ['text', 'html'],
    sections: [
      section('pattern', true),
      section('weekly', true),
      section('longest', true),
      section('restDays', true),
      section('goal', true),
      section('notRecorded', 'locked'),
      section('flags', false),
      section('measurements', false),
      section('otherSports', false),
      section('questions', true),
      section('afterVisit', true),
      section('provenance', true),
      section('whyLayout', false),
    ],
    questions: s =>
      fit(s, [
        {
          text: 'What should I eat before and after my longest sessions?',
          defaultOn: true,
        },
        {
          text: 'Am I eating enough for this much training?',
          defaultOn: true,
        },
        {
          text: 'Should I be checked for low energy availability?',
          defaultOn: true,
        },
        {
          text: 'Do I need any supplements, or is food enough?',
          defaultOn: false,
        },
      ]),
    questionsHeading: 'Questions I want to ask',
    notThis: NOT_THIS.nutrition,
    sourceIds: ['thomas2016', 'mountjoy2023', 'sansoni2015'],
  },
  family: {
    id: 'family',
    name: 'Family',
    forWho: 'A parent, partner, friend or carer.',
    holds: 'A short plain update and how they can help.',
    files: ['text'],
    sections: [
      section('activity', 'locked'),
      section('flags', true),
      section('plan', true, { label: 'My next step' }),
      section('otherSports', false),
      section('questions', true, {
        label: 'How you can help',
        detail: 'The ways to help you pick below.',
      }),
    ],
    questions: s =>
      fit(s, [
        {
          text: `Ask me how my ${firstFlag(s)} feels this week.`,
          defaultOn: true,
          needsFlag: true,
        },
        { text: 'Help me keep my rest days.', defaultOn: true },
        {
          text: 'Come with me to my appointment if you can.',
          defaultOn: true,
        },
        {
          text: `Remind me to log my ${s.words.sessions}.`,
          defaultOn: false,
        },
      ]),
    questionsHeading: 'How you can help',
    notThis: NOT_THIS.family,
    sourceIds: ['berkman2011', 'wolff2011', 'harkin2016'],
  },
  you: {
    id: 'you',
    name: 'You',
    forWho: 'Your own full record, to keep or show.',
    holds: 'Everything, with how each piece was made.',
    files: ['markdown', 'html', 'text'],
    sections: [
      section('activity', true),
      section('weekly', true),
      section('byKind', true),
      section('recent', true),
      section('flags', true),
      section('measurements', true),
      section('paused', true),
      section('plan', true),
      section('progress', true),
      section('about', true),
      section('otherSports', false),
      section('provenance', 'locked'),
      section('whyLayout', true),
    ],
    questions: () => [],
    questionsHeading: '',
    notThis: NOT_THIS.you,
    sourceIds: ['delbanco2012', 'harkin2016', 'berkman2011'],
  },
  data: {
    id: 'data',
    name: 'Data file',
    forWho: 'Another app or a spreadsheet.',
    holds: 'Every record with units and where it came from.',
    files: ['json', 'csv', 'measurementsCsv'],
    sections: [],
    questions: () => [],
    questionsHeading: '',
    notThis: NOT_THIS.data,
    sourceIds: [],
  },
};

/** The sections an audience offers in this mode. */
export function sectionsFor(
  audience: Audience,
  mode: ExportMode,
): SectionDef[] {
  return audience.sections.filter(s => !s.modes || s.modes.includes(mode));
}

/** Sources about fingers, grip and the camera: climbing only. */
const CLIMB_SOURCES: readonly string[] = [
  'klauser2002',
  'schweizer2001',
  'michailov2018',
  'stenum2021',
];

/** The sources behind an audience's layout that apply in this mode. */
export function sourcesFor(audience: Audience, mode: ExportMode): string[] {
  return audience.sourceIds.filter(
    id => mode === 'climb' || !CLIMB_SOURCES.includes(id),
  );
}

/** The file kinds an audience offers in this mode. */
export function filesFor(audience: Audience, mode: ExportMode) {
  return audience.files.filter(f => f !== 'measurementsCsv' || mode === 'climb');
}

/** The period an audience starts with: 4 weeks, or everything for you and data. */
export function defaultWeeks(id: AudienceId) {
  return id === 'you' || id === 'data' ? null : 4;
}
