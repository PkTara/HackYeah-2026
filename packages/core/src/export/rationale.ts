/**
 * "Why this format?": the reasons behind each reader's layout, in the same
 * shape as every other explanation in the app, so the same sheet shows it.
 * Research supports only the layout. No study tested this app.
 */
import type { DecisionExplanation } from '../evidence';
import type { DecisionFlow, FlowInput } from '../flow';
import { AUDIENCES, filesFor } from './audiences';
import { FILE_LABEL } from './files';
import type { AudienceId, ExportMode, ModeWords } from './types';

/** What each format leaves out on purpose, in a few words. */
const LEFT_OUT: Readonly<Record<AudienceId, string>> = {
  doctor: 'XP, quests, grades and drills',
  physio: 'XP, levels and the research list',
  coach: 'Medical words and most setup answers',
  nutrition: 'Food, weight and calorie guesses',
  family: 'Measurements, research and anything technical',
  you: 'Photos and hand notes, which are never exported',
  data: 'Prose, photos, notes and account details',
};

/**
 * The format as a small flow: who reads it, what goes in, what stays out.
 * The choices are the team's; the research only supports the layout.
 */
export function audienceFlow(
  id: AudienceId,
  words: ModeWords,
  mode: ExportMode,
): DecisionFlow {
  const audience = AUDIENCES[id];
  const input: FlowInput[] = [
    { label: `Your ${words.sessions}`, icon: 'log', key: true },
    { label: 'Sore spots', icon: 'flag' },
  ];
  if (mode === 'climb' && id !== 'family') {
    input.push({ label: 'Measurements', icon: 'ruler' });
  }
  if (audience.questionsHeading) {
    input.push({ label: 'Your questions', icon: 'check' });
  }
  const files = filesFor(audience, mode).map(kind => FILE_LABEL[kind]);
  return {
    inputs: input,
    nodes: [
      { type: 'step', label: 'Who reads it', detail: audience.forWho },
      {
        type: 'step',
        label: 'What goes in',
        detail: audience.holds,
        team: true,
      },
      {
        type: 'step',
        label: 'What stays out',
        detail: `${LEFT_OUT[id]}.`,
        team: true,
      },
    ],
    result: {
      label: audience.name,
      value: files.join(', '),
    },
  };
}

type Inputs = DecisionExplanation['evidence'];

function inputs(words: ModeWords, mode: ExportMode, ...extra: Inputs): Inputs {
  return [
    {
      id: 'sessions',
      label: `Your ${words.sessions}`,
      detail:
        mode === 'climb'
          ? 'Date, wall, style, holds, grade and whether you sent it, from your log.'
          : `Date, ${words.kindLabel.toLowerCase()}, ${words.placeLabel.toLowerCase()}, distance, time and whether you finished, from your log.`,
    },
    ...extra,
  ];
}

const flagsInput = (words: ModeWords) => ({
  id: 'flags',
  label: 'Your sore spots',
  detail: `Side, place and first date, from the ${words.bodyTab} tab.`,
});

const questionsInput = {
  id: 'questions',
  label: 'Your questions',
  detail: 'The ones you tick on this page. Typed text is never saved.',
};

const ABSTRACT = 'The sources were read at abstract level.';

export function explainAudience(
  id: AudienceId,
  words: ModeWords,
  mode: ExportMode,
): DecisionExplanation {
  const audience = AUDIENCES[id];
  const climb = mode === 'climb';
  const base = {
    status: 'app_rule' as const,
    sourceIds: audience.sourceIds,
    flow: audienceFlow(id, words, mode),
  };
  switch (id) {
    case 'doctor':
      return {
        ...base,
        summary:
          'A one page sheet for a short visit with a GP or sports doctor.',
        rule: [
          'It follows the order clinicians use to hand over a case: why you are here, how active you are, what is sore, then your questions.',
          climb
            ? 'Activity is shown as climbing days a week. Time is not recorded for climbs, so no minutes are shown.'
            : `Activity is shown as ${words.sessions} and minutes a week, the unit some clinics record. It is never compared with activity guidelines, because intensity is not recorded.`,
          'A short question list made before the visit helps people ask what they came to ask.',
          'The lines after the visit are for writing down what was said, in your own words.',
          'Sore spots say where you marked pain and since when. Only a clinician can say what is wrong.',
        ].join('\n'),
        evidence: inputs(words, mode, flagsInput(words), questionsInput),
        limitations: [
          'The research is about clinic visits and handovers, not training apps. None of it tested this app.',
          ABSTRACT,
        ],
      };
    case 'physio':
      return {
        ...base,
        summary:
          'A detailed sheet for a physiotherapist or hand therapist: where it hurts, since when, and what you did before and since.',
        rule: [
          'Each sore spot lists side, place and first date, the fields sports researchers record for a health problem.',
          'Spots are listed even if you kept training, because most problems do not stop training.',
          `Load is shown as plain counts of ${words.sessions} in the 4 weeks before and since. No ratio or risk score is worked out, because those methods are disputed.`,
          climb
            ? 'Climbs with crimps are counted for context, and each finger strength reading keeps its full setup, because the setup changes the number.'
            : 'Minutes and distance are added up for the same two windows.',
          'Questions are framed as options to discuss, not as asking for permission.',
        ].join('\n'),
        evidence: inputs(
          words,
          mode,
          flagsInput(words),
          ...(climb
            ? [
                {
                  id: 'measurements',
                  label: 'Your measurements',
                  detail:
                    'Typed, timed or camera readings from the Data tab, each with its method.',
                },
              ]
            : []),
          questionsInput,
        ),
        limitations: [
          'The load studies are expert statements, mostly about elite sport. The app makes no risk claim from them.',
          `${ABSTRACT} None of them tested this app.`,
        ],
      };
    case 'coach':
      return {
        ...base,
        summary:
          'A training sheet for your coach: what you did, week by week and by type, and what the app suggests next.',
        rule: [
          'Training load has two parts: what you did, and how hard it felt. This sheet shows the first.',
          'Effort ratings are not recorded in this app, so the sheet says so and asks whether to start.',
          `A share ${words.doneWord} is only shown once a type has 3 logs. That is an app threshold.`,
          'The quest is marked as a draft written by the app team, not a tested plan.',
          'Sessions also come as a CSV file for a spreadsheet.',
        ].join('\n'),
        evidence: inputs(words, mode, flagsInput(words), questionsInput),
        limitations: [
          'The load papers are frameworks and expert statements, not trials of a sheet like this.',
          `${ABSTRACT} None of them tested this app.`,
        ],
      };
    case 'nutrition':
      return {
        ...base,
        summary:
          'A one page sheet for a dietitian: when and how long you train, so they can plan around it.',
        rule: [
          'It shows your training pattern by weekday, weekly totals, your longest sessions and rest days.',
          'It never shows food, weight or an energy guess. The app has none of these, and low energy needs a trained clinician to assess.',
          'Sore spots and body measurements are off unless you turn them on.',
          "The collagen and vitamin C studies in the app's library are lab or single case research. They are not used for advice here.",
        ].join('\n'),
        evidence: inputs(words, mode, questionsInput),
        limitations: [
          'The sources are expert position statements. The sheet gives no nutrition advice from them.',
          `${ABSTRACT} None of them tested this app.`,
        ],
      };
    case 'family':
      return {
        ...base,
        summary:
          'A short message for a parent, partner, friend or carer, in everyday words.',
        rule: [
          'It stays under 120 words, with short sentences and no numbers beyond a few counts and dates.',
          'Plain words matter because health messages are harder to use when they are hard to read.',
          'It asks for help in ways people can act on, like coming along to an appointment.',
          'Sharing progress with others is one way people keep going with a goal.',
        ].join('\n'),
        evidence: inputs(words, mode, flagsInput(words), {
          id: 'help',
          label: 'Ways to help',
          detail: 'The ones you tick on this page.',
        }),
        limitations: [
          'The research links plain language and company at visits with better understanding. It does not show that this message changes health.',
          `${ABSTRACT} None of them tested this app.`,
        ],
      };
    case 'you':
      return {
        ...base,
        summary:
          'Your whole record in readable words, with how each piece was made.',
        rule: [
          'Everything the app holds for this mode, except photos and notes, which are never exported.',
          'Each number says how it got there: typed in, timed in the app, measured with your own tool, estimated by the camera, worked out by the app, or example data.',
          'The focus and quest come with the rule that picked them and their limits.',
          'People who read their own records often feel more in control, and recording progress can help with goals.',
        ].join('\n'),
        evidence: inputs(words, mode, flagsInput(words)),
        limitations: [
          'The research is about clinic notes and goal tracking in general, not this app.',
          ABSTRACT,
        ],
      };
    case 'data':
      return {
        ...base,
        summary:
          'Your records as a file another app or a spreadsheet can read.',
        rule: [
          'JSON holds every record with its units, its date and where it came from.',
          'The CSV has one row per session. Text that a spreadsheet could run as a formula starts with a quote mark.',
          'Record ids are included so each row can be traced. Photos, notes and account details are never included.',
          'The file is not a medical record and makes no claim to fit clinical systems.',
        ].join('\n'),
        evidence: inputs(words, mode, flagsInput(words)),
        limitations: [
          'A file format is a design choice, so no research is cited here.',
        ],
      };
  }
}
