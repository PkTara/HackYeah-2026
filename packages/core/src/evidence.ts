/**
 * Why each generated result says what it says, in plain words.
 *
 * Every explanation keeps four things apart: the user's own records
 * (`evidence`), the app rule that turned them into the result (`rule`, one
 * sentence per line), published research (`sourceIds`, only where a
 * published claim is made) and the limits (`limitations`, one or two short
 * lines). Arithmetic and selection rules are app rules, so they cite no
 * papers. Where something was not recorded, the text says so.
 */
import {
  MIN_LOGS,
  TERRAINS,
  terrainTallies,
  type ClimbLog,
  type Focus,
  type Movement,
  type Terrain,
} from './climbing';
import type { HandFlag } from './game';
import { QUESTS, findQuest, type Quest } from './quests';
import {
  MIN_SESSIONS,
  talliesBy,
  type BodyFlag,
  type SessionLog,
  type SportFocus,
  type SportQuest,
} from './sport';
import { spotsFor } from './spots';

/** Personal record evidence and published research have separate identifiers. */
export type ResearchSource = Readonly<{
  id: string;
  title: string;
  authors: string;
  year: number;
  url: string;
  /** What the study found, in one plain sentence. */
  finding: string;
  studyType: string;
  population: string;
  readingDepth: string;
  /** The narrow statement the study can support. */
  supports: string;
  limitations: readonly string[];
  verifiedAt: string;
}>;

export type DecisionExplanation = Readonly<{
  summary: string;
  status: 'app_rule' | 'draft' | 'estimate' | 'example';
  /** The rule in plain words. Each line is one step. */
  rule: string;
  evidence: readonly Readonly<{ id: string; label: string; detail: string }>[];
  sourceIds: readonly string[];
  limitations: readonly string[];
}>;

/** Validate persisted disclosure shape and bound its size like the API. */
export function isDecisionExplanation(
  value: unknown,
): value is DecisionExplanation {
  const decision = value as Partial<DecisionExplanation> | null;
  const text = (entry: unknown, max: number, min = 0): entry is string =>
    typeof entry === 'string' && entry.length >= min && entry.length <= max;
  const strings = (entries: unknown, maxLength: number, min = 0): boolean =>
    Array.isArray(entries) &&
    entries.length <= 32 &&
    entries.every(entry => text(entry, maxLength, min));
  return (
    !!decision &&
    text(decision.summary, 1000, 1) &&
    text(decision.rule, 6000, 1) &&
    ['app_rule', 'draft', 'estimate', 'example'].includes(
      decision.status ?? '',
    ) &&
    strings(decision.sourceIds, 120, 1) &&
    strings(decision.limitations, 2000) &&
    Array.isArray(decision.evidence) &&
    decision.evidence.length <= 64 &&
    decision.evidence.every(
      entry =>
        !!entry &&
        text(entry.id, 120, 1) &&
        text(entry.label, 240, 1) &&
        text(entry.detail, 4000),
    )
  );
}

const lines = (...steps: readonly (string | false)[]) =>
  steps.filter(Boolean).join('\n');
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const percent = (part: number, whole: number) =>
  `${Math.round((part / whole) * 100)}%`;
const list = (items: readonly string[]) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** A server quest saved before decisions were recorded. */
const unavailable: DecisionExplanation = {
  summary: 'Why this quest was picked was not saved.',
  status: 'app_rule',
  rule: 'The records and the rule behind this quest were not recorded when it was assigned, so they cannot be shown.',
  evidence: [],
  sourceIds: [],
  limitations: ['Your current climbs cannot show why it was picked back then.'],
};

function climbEvidence(
  logs: readonly ClimbLog[],
): DecisionExplanation['evidence'] {
  return logs.map(log => ({
    id: log.id,
    label: `Climb, ${log.date}${log.sample ? ' (example)' : ''}`,
    detail: `${capital(log.terrain)}, ${
      log.movements.join(' and ') || 'style not recorded'
    }, ${log.holds.join(' and ') || 'holds not recorded'}, ${
      log.grade || 'grade not recorded'
    }. ${log.sent ? 'Sent' : 'Not sent'}.`,
  }));
}

/** "slab 2 of 4 (50%), vertical 1 of 2, ..." */
function sentSoFar(logs: readonly ClimbLog[]): string {
  const tallies = terrainTallies(logs);
  return `Sent so far: ${TERRAINS.map(terrain => {
    const { sent, logged } = tallies[terrain];
    return `${terrain} ${sent} of ${logged}${
      logged >= MIN_LOGS ? ` (${percent(sent, logged)})` : ''
    }`;
  }).join(', ')}.`;
}

const LOG_LIMITS = [
  `${MIN_LOGS} climbs is an app threshold, not a scientific minimum.`,
  'Sends depend on grade, route choice and how often you climb each wall. A low share is a prompt to reflect, not a measure of ability.',
] as const;

export function explainFocus(
  focus: Focus,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  return {
    summary:
      focus.kind === 'explore'
        ? `${capital(
            focus.terrain,
          )} is your focus because it has the fewest logged climbs, so the monkey asks for more there first.`
        : `${capital(
            focus.terrain,
          )} is your focus because it has the lowest share of sent climbs of the three walls.`,
    status: logs.some(log => log.sample) ? 'example' : 'app_rule',
    rule: lines(
      sentSoFar(logs),
      `A wall needs ${MIN_LOGS} logged climbs before it is compared with the others.`,
      `While any wall has fewer than ${MIN_LOGS}, the focus is the wall with the fewest logs.`,
      `Once every wall has ${MIN_LOGS}, the focus is the wall with the lowest share sent.`,
      'A tie goes to slab first, then vertical, then overhang.',
    ),
    evidence: climbEvidence(logs),
    sourceIds: [],
    limitations: LOG_LIMITS,
  };
}

function fingerFlagEvidence(
  flags: readonly HandFlag[],
): DecisionExplanation['evidence'] {
  return flags.map(flag => {
    const spots = flag.spots.map(
      id => spotsFor(flag.finger).find(spot => spot.id === id)?.name ?? id,
    );
    return {
      id: `${flag.side}/${flag.finger}`,
      label: `Flagged finger, since ${flag.date}`,
      detail: `${capital(flag.side)} ${flag.finger}, sore ${
        spots.length ? `at ${list(spots)}` : 'with no spot marked'
      }. Pain ratings are not kept with the flag.`,
    };
  });
}

export function explainPause(flags: readonly HandFlag[]): DecisionExplanation {
  return {
    summary: flags.length
      ? 'Quests that load your fingers are paused because you flagged a sore finger.'
      : 'Nothing is flagged, so no quests are paused.',
    status: 'app_rule',
    rule: lines(
      'While any finger is flagged, quests that load the fingers, such as climbing or hanging, are paused.',
      'Quests that do not load the fingers, and a finger check-in, can still be offered.',
      'Clearing the flag on the Hands tab brings the paused quests back.',
    ),
    evidence: fingerFlagEvidence(flags),
    sourceIds: ['klauser2002'],
    limitations: [
      'A flag or a photo cannot show what is wrong inside a finger. Pulley injuries are checked with scans.',
      'Clearing a flag is not a medical all-clear. No study has tested whether pausing quests prevents injury.',
    ],
  };
}

/** Plain titles for quest ids, so progress reads as words. */
function questNames(ids: readonly string[]): string {
  return ids.length ? list(ids.map(id => findQuest(id)?.title ?? id)) : 'none';
}

function quietLimits(quest: Quest): readonly string[] {
  switch (quest.kind) {
    case 'practice':
      return [
        `Draft quest written by the team. No study has tested this drill, its count or its time.`,
        LOG_LIMITS[1],
      ];
    case 'plan':
      return [
        'Draft quest written by the team. The preview studies did not test this task or its time.',
        'In the preview studies, previewing changed how people climbed, not whether they finished.',
      ];
    case 'checkin':
      return [
        'A check-in records what you report. It is not a diagnosis and does not clear the flag.',
      ];
    default:
      return LOG_LIMITS;
  }
}

export function explainQuest(
  quest: Quest,
  focus: Focus,
  logs: readonly ClimbLog[],
  flags: readonly HandFlag[],
  selection?: { completed: readonly string[]; skipped: readonly string[] },
): DecisionExplanation {
  if (quest.decision) {
    return quest.decision;
  }
  if (!QUESTS.some(candidate => candidate.id === quest.id)) {
    return unavailable;
  }
  const draft = quest.kind === 'practice' || quest.kind === 'plan';
  return {
    summary: quest.why,
    status: draft
      ? 'draft'
      : logs.some(log => log.sample)
      ? 'example'
      : 'app_rule',
    rule: lines(
      focus.kind === 'explore'
        ? `Your focus is ${focus.terrain}: it has the fewest logged climbs.`
        : `Your focus is ${focus.terrain}: it has the lowest share sent.`,
      sentSoFar(logs),
      `While a wall has fewer than ${MIN_LOGS} logs, the quest is to log more climbs there. After that, the quests practise that wall.`,
      `While a finger is flagged, quests that load the fingers are paused. Once every wall has ${MIN_LOGS} logs, a finger check-in goes first.`,
      'Quests you have done are left out. Swapped quests go to the back, oldest swap first. Other ties follow the order of the quest library.',
      `This quest: ${quest.task} About ${quest.minutes} minutes. ${
        quest.loadsFingers
          ? 'It loads your fingers.'
          : 'It does not load your fingers.'
      }`,
    ),
    evidence: [
      ...climbEvidence(logs),
      ...fingerFlagEvidence(flags),
      ...(selection
        ? [
            {
              id: 'quest-progress',
              label: 'Your quest progress',
              detail: `Done: ${questNames(
                selection.completed,
              )}. Swapped, oldest first: ${questNames(selection.skipped)}.`,
            },
          ]
        : []),
    ],
    sourceIds: quest.kind === 'plan' ? ['sanchez2012', 'seifert2017'] : [],
    limitations: quietLimits(quest),
  };
}

function explainTally(
  what: string,
  logs: readonly ClimbLog[],
  extra?: string,
): DecisionExplanation {
  const sent = logs.filter(log => log.sent).length;
  const logged = logs.length;
  return {
    summary:
      logged === 0
        ? `No ${what} logged yet.`
        : `You sent ${sent} of the ${logged} ${what} you logged.`,
    status: logs.some(log => log.sample) ? 'example' : 'app_rule',
    rule: lines(
      `Count the ${what} you logged: ${logged}. Count those marked sent: ${sent}.`,
      logged >= MIN_LOGS
        ? `${sent} of ${logged} is ${percent(sent, logged)}.`
        : `With fewer than ${MIN_LOGS} climbs the share is not shown or compared yet.`,
      extra ?? false,
    ),
    evidence: climbEvidence(logs),
    sourceIds: [],
    limitations: LOG_LIMITS,
  };
}

const BOTH_STYLES =
  'A climb marked with several styles counts once in each of them.';

export function explainTerrain(
  terrain: Terrain,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  return explainTally(
    `${terrain} climbs`,
    logs.filter(log => log.terrain === terrain),
  );
}

export function explainMovement(
  movement: Movement,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  return explainTally(
    `${movement} climbs`,
    logs.filter(log => log.movements.includes(movement)),
    BOTH_STYLES,
  );
}

/** One box of the wall x style grid: both filters apply. */
export function explainCell(
  terrain: Terrain,
  movement: Movement,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  return explainTally(
    `${movement} ${terrain} climbs`,
    logs.filter(
      log => log.terrain === terrain && log.movements.includes(movement),
    ),
    `Only ${terrain} climbs marked ${movement} count here. ${BOTH_STYLES}`,
  );
}

export function explainCamera(input: {
  metric?: 'leg_spread' | 'shoulder_reach';
  leftValue?: number | null;
  rightValue?: number | null;
  value?: number | null;
  confidence?: number;
  modelVersion?: string;
  protocol?: string;
  method?: string;
  decision?: DecisionExplanation;
}): DecisionExplanation {
  if (input.decision) {
    return input.decision;
  }
  const shoulder = input.metric === 'shoulder_reach';
  const value = input.value ?? 'unavailable';
  const left = input.leftValue ?? 'unavailable';
  const right = input.rightValue ?? 'unavailable';
  return {
    summary: shoulder
      ? `Shoulder reach estimate: left ${left}, right ${right}, average ${value} degrees, measured as angles in the camera image.`
      : `Leg spread estimate: ${value} degrees, measured as an angle in the camera image.`,
    status: 'estimate',
    rule: shoulder
      ? lines(
          'On each side, measure the angle at the shoulder between the hip and the elbow, flat in the image.',
          'The reading is the average of the left and right angles.',
          'Hips, shoulders, elbows and wrists must be visible, and each arm must be nearly straight: at least 160 degrees at the elbow.',
          'The image width and height correct for a stretched picture. Without them the image is treated as square.',
        )
      : lines(
          'Find the point midway between the two hips.',
          'Draw a line from that point to each ankle.',
          'The reading is the angle between the two lines, flat in the image.',
          'The image width and height correct for a stretched picture. Without them the image is treated as square.',
        ),
    evidence: [
      {
        id: 'camera-reading',
        label: 'Camera reading',
        detail: `${value} degrees${
          shoulder ? ` (left ${left}, right ${right})` : ''
        }. Lowest visibility of the body points: ${
          input.confidence ?? 'unavailable'
        }. Method: ${input.method ?? 'unavailable'}. Protocol: ${
          input.protocol ?? 'unavailable'
        }. Model: ${
          input.modelVersion ?? 'not recorded'
        }. The body point coordinates were not returned, so the angle cannot be recomputed here.`,
      },
    ],
    sourceIds: ['stenum2021', 'barzegar2024'],
    limitations: [
      shoulder
        ? 'An angle in a flat image, not a measured joint range. Camera position, bent elbows and depth all change it.'
        : 'An angle in a flat image, not a measured joint range. Camera position, bent knees and depth all change it.',
      'Visibility says how clearly the points were seen, not how accurate the angle is.',
    ],
  };
}

/** The words a sport mode uses, so its explanations read naturally. */
export type SportWords = Readonly<{
  pet: string;
  session: string;
  sessions: string;
  unit: string;
  kindName: Readonly<Record<string, string>>;
  placeName: Readonly<Record<string, string>>;
  bodyPartName: Readonly<Record<string, string>>;
}>;

function sessionEvidence(
  logs: readonly SessionLog[],
  words: SportWords,
): DecisionExplanation['evidence'] {
  return logs.map(log => ({
    id: log.id,
    label: `${capital(words.session)}, ${log.date}${
      log.sample ? ' (example)' : ''
    }`,
    detail: `${words.kindName[log.kind] ?? log.kind}, ${(
      words.placeName[log.place] ?? log.place
    ).toLowerCase()}, ${log.distance} ${words.unit}, ${log.minutes} min. ${
      log.finished ? 'Finished as planned' : 'Cut short'
    }.`,
  }));
}

function finishedSoFar(
  logs: readonly SessionLog[],
  kinds: readonly string[],
  words: SportWords,
): string {
  const tallies = talliesBy(logs, 'kind', kinds);
  return `Finished so far: ${kinds
    .map(kind => {
      const { finished, logged } = tallies[kind];
      return `${(
        words.kindName[kind] ?? kind
      ).toLowerCase()} ${finished} of ${logged}${
        logged >= MIN_SESSIONS ? ` (${percent(finished, logged)})` : ''
      }`;
    })
    .join(', ')}.`;
}

const sportLimits = (words: SportWords) =>
  [
    `${MIN_SESSIONS} ${words.sessions} is an app threshold, not a scientific minimum.`,
    `Finishing depends on the plan, the weather and how often you do each kind. A low share is a prompt to reflect, not a fitness score.`,
  ] as const;

export function explainSportFocus(
  focus: SportFocus,
  logs: readonly SessionLog[],
  kinds: readonly string[],
  words: SportWords,
): DecisionExplanation {
  const name = words.kindName[focus.sessionKind] ?? focus.sessionKind;
  const order = kinds.map(k => (words.kindName[k] ?? k).toLowerCase());
  return {
    summary:
      focus.kind === 'explore'
        ? `${name} is your focus because it has the fewest logged ${words.sessions}, so the ${words.pet} asks for more there first.`
        : `${name} is your focus because it has the lowest share of ${words.sessions} finished as planned.`,
    status: logs.some(log => log.sample) ? 'example' : 'app_rule',
    rule: lines(
      finishedSoFar(logs, kinds, words),
      `Each kind needs ${MIN_SESSIONS} logged ${words.sessions} before it is compared with the others.`,
      `While any kind has fewer than ${MIN_SESSIONS}, the focus is the kind with the fewest logs.`,
      `Once every kind has ${MIN_SESSIONS}, the focus is the kind with the lowest share finished.`,
      `A tie goes to ${order.join(', then ')}.`,
    ),
    evidence: sessionEvidence(logs, words),
    sourceIds: [],
    limitations: sportLimits(words),
  };
}

export function explainSportQuest(
  quest: SportQuest,
  focus: SportFocus,
  state: Readonly<{
    logs: readonly SessionLog[];
    flags: readonly BodyFlag[];
    completed: readonly string[];
    skipped: readonly string[];
  }>,
  library: readonly SportQuest[],
  kinds: readonly string[],
  words: SportWords,
): DecisionExplanation {
  const name = (words.kindName[focus.sessionKind] ?? '').toLowerCase();
  const titles = (ids: readonly string[]) =>
    ids.length
      ? list(ids.map(id => library.find(q => q.id === id)?.title ?? id))
      : 'none';
  const draft = quest.kind === 'practice' || quest.kind === 'plan';
  return {
    summary: quest.why,
    status: draft
      ? 'draft'
      : state.logs.some(log => log.sample)
      ? 'example'
      : 'app_rule',
    rule: lines(
      focus.kind === 'explore'
        ? `Your focus is ${name}: it has the fewest logged ${words.sessions}.`
        : `Your focus is ${name}: it has the lowest share finished.`,
      finishedSoFar(state.logs, kinds, words),
      `While a kind has fewer than ${MIN_SESSIONS} logs, the quest is to log more of it. After that, the quests practise that kind.`,
      `While something is flagged sore, quests that mean ${words.sessions} are paused. Once every kind has ${MIN_SESSIONS} logs, a check-in goes first.`,
      'Quests you have done are left out. Swapped quests go to the back, oldest swap first. Other ties follow the order of the quest library.',
      `This quest: ${quest.task} About ${quest.minutes} minutes.`,
    ),
    evidence: [
      ...sessionEvidence(state.logs, words),
      ...state.flags.map(flag => ({
        id: `${flag.side}/${flag.part}`,
        label: `Flagged sore, since ${flag.date}`,
        detail: `${capital(flag.side)} ${(
          words.bodyPartName[flag.part] ?? flag.part
        ).toLowerCase()}.`,
      })),
      {
        id: 'quest-progress',
        label: 'Your quest progress',
        detail: `Done: ${titles(
          state.completed,
        )}. Swapped, oldest first: ${titles(state.skipped)}.`,
      },
    ],
    sourceIds: [],
    limitations: draft
      ? [
          'Draft quest written by the team. No study has tested this exact task or its time.',
          sportLimits(words)[1],
        ]
      : sportLimits(words),
  };
}

/**
 * Original studies the team read. Each `finding` is what the study found;
 * none of them tested this app, its camera or its quests.
 */
export const RESEARCH_SOURCES: readonly ResearchSource[] = [
  {
    id: 'michailov2018',
    title:
      'Reliability and Validity of Finger Strength and Endurance Measurements in Rock Climbing',
    authors:
      'Michail L. Michailov, Jiří Baláš, Stoyan K. Tanev, Hristo S. Andonov, Jan Kodejška, Lee Brown',
    year: 2018,
    url: 'https://doi.org/10.1080/02701367.2018.1441484',
    finding:
      'Finger strength and endurance measured with a force sensor gave repeatable results in small groups of male climbers, and arm position changed the readings.',
    studyType: 'Original measurement study',
    population:
      '22 male climbers in position comparison; 9 male climbers in repeatability testing',
    readingDepth: 'abstract only',
    supports: 'Standardized instrumented finger strength/endurance records.',
    limitations: [
      'Small male samples and protocol dependence',
      'Does not validate phone force estimates, arbitrary hang protocols or grade predictions',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'mermier2000',
    title:
      'Physiological and anthropometric determinants of sport climbing performance',
    authors: 'C. M. Mermier, J. M. Janot, D. L. Parker, J. G. Swan',
    year: 2000,
    url: 'https://doi.org/10.1136/bjsm.34.5.359',
    finding:
      'In 44 climbers, trainable factors such as strength and endurance explained more of the differences in performance than body size or flexibility.',
    studyType: 'Cross-sectional performance study',
    population: '44 climbers (24 men, 20 women), across skill levels',
    readingDepth: 'abstract only',
    supports:
      'Keep entered body proportions descriptive rather than ranking bodies as deficient.',
    limitations: [
      'Associations across two routes do not establish causation',
      'Does not validate app terrain scores or performance predictions',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'draga2020',
    title:
      'Importance and Diagnosis of Flexibility Preparation of Male Sport Climbers',
    authors:
      'Paweł Draga, Mariusz Ozimek, Marcin Krawczyk, Robert Rokowski, Marcelina Nowakowska, Paweł Ochwat, Adam Jurczak, Arkadiusz Stanula',
    year: 2020,
    url: 'https://doi.org/10.3390/ijerph17072512',
    finding:
      'In 60 competitive male climbers, straddle flexibility tests were linked to climbing level, while the climbing-specific tests were not.',
    studyType: 'Cross-sectional flexibility study',
    population: '60 competitive male climbers, advanced to higher elite',
    readingDepth: 'abstract and selected full-text methods excerpts',
    supports: 'Define the specific mobility task and measurement protocol.',
    limitations: [
      'Selected methods excerpts only',
      'Associations do not prove stretching efficacy',
      'Straddle distance tests differ from app ankle/hip geometry',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'orth2018',
    title:
      'Behavioral Repertoire Influences the Rate and Nature of Learning in Climbing: Implications for Individualized Learning Design in Preparation for Extreme Sports Participation',
    authors:
      'Dominic Orth, Keith Davids, Jia-Yi Chow, Eric Brymer, Ludovic Seifert',
    year: 2018,
    url: 'https://doi.org/10.3389/fpsyg.2018.00949',
    finding:
      'Over seven weeks of practice, beginner climbers learned at different rates and in different ways.',
    studyType: 'Longitudinal practice investigation',
    population:
      '8 beginner climbers recruited, 1 dropout; 42 practice trials over 7 weeks',
    readingDepth: 'full-text methods/results/discussion',
    supports: 'Record practice context and individual learning observations.',
    limitations: [
      'Small constrained route task',
      'Does not validate radar scales, automated technique diagnosis or app prescriptions',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'seifert2017',
    title:
      'Role of route previewing strategies on climbing fluency and exploratory movements',
    authors:
      'Ludovic Seifert, Romain Cordier, Dominic Orth, Yoan Courtine, James L. Croft',
    year: 2017,
    url: 'https://doi.org/10.1371/journal.pone.0176306',
    finding:
      'How 18 climbers previewed one route was linked to how much they explored and paused while climbing it.',
    studyType: 'Observational climbing experiment',
    population:
      '18 climbers (8 inexperienced, 10 experienced), one 10 m French 5b route',
    readingDepth: 'full-text methods/results/discussion',
    supports: 'Route preview and reflection as a research-informed candidate.',
    limitations: [
      'Not a randomized test of an app intervention',
      'One route does not establish a best preview strategy or grade improvement',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'stenum2021',
    title:
      'Two-dimensional video-based analysis of human gait using pose estimation',
    authors: 'Jan Stenum, Cristina Rossi, Ryan T. Roemmich',
    year: 2021,
    url: 'https://doi.org/10.1371/journal.pcbi.1008935',
    finding:
      'Body points tracked in ordinary side-on video measured walking with errors that depended on the joint and on the camera view.',
    studyType: 'Pose validation against motion capture',
    population:
      '32 healthy adults; 31 walking trials analyzed after one exclusion',
    readingDepth: 'full-text methods/results/discussion',
    supports:
      'Reference comparison and controlled camera geometry for a new metric.',
    limitations: [
      'Walking video with another pose model differs from climbing and a front-facing leg spread',
      'Task-dependent error and perspective limits; no transferred accuracy',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'barzegar2024',
    title:
      'Joint angle estimation during shoulder abduction exercise using contactless technology',
    authors: 'Ali Barzegar Khanghah, Geoff Fernie, Atena Roshan Fekr',
    year: 2024,
    url: 'https://doi.org/10.1186/s12938-024-01203-5',
    finding:
      'Shoulder angles estimated with a depth camera changed with distance from the camera and improved with per-person calibration.',
    studyType: 'Joint angle validation study',
    population: '14 young healthy participants (8 women, 6 men)',
    readingDepth: 'full-text methods/results/discussion',
    supports:
      'Treat hardware, distance and calibration as part of the measurement protocol.',
    limitations: [
      'Depth sensors and personalized calibration differ from RGB-only app images',
      'Does not validate app hip angles or wall climbing',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'schweizer2001',
    title:
      'Biomechanical properties of the crimp grip position in rock climbers',
    authors: 'Andreas Schweizer',
    year: 2001,
    url: 'https://doi.org/10.1016/S0021-9290(00)00184-6',
    finding:
      'In 16 fingers of 4 people, the crimp grip put more load on the finger pulleys than the other grip tested.',
    studyType: 'In-vivo biomechanical experiment',
    population: '16 fingers in 4 participants',
    readingDepth: 'abstract only',
    supports:
      'Record grip and loading context separately from hand appearance.',
    limitations: [
      'Tiny mechanistic experiment cannot diagnose pain or quantify individual risk',
      'App cannot infer pulley force from photos or landmarks',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'klauser2002',
    title:
      'Finger pulley injuries in extreme rock climbers: depiction with dynamic US',
    authors:
      'Andrea Klauser, Ferdinand Frauscher, Gerd Bodner, Ethan J. Halpern, Michael F. Schocke, Peter Springer, Markus Gabl, Werner Judmaier, Dieter zur Nedden',
    year: 2002,
    url: 'https://doi.org/10.1148/radiol.2223010752',
    finding:
      'In 64 injured high-level climbers, finger pulley injuries were assessed with dynamic ultrasound and checked against MRI scans.',
    studyType: 'Diagnostic imaging investigation',
    population:
      '64 injured high-level climbers; 75 symptomatic and 181 asymptomatic fingers',
    readingDepth: 'abstract only',
    supports: 'Distinguish a symptom journal from internal pulley imaging.',
    limitations: [
      'Specialized ultrasound/MRI differ from app photographs',
      'Does not validate symptom diagnosis, photo healing assessment or return-to-climb clearance',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'paxton2012',
    title:
      'Optimizing an Intermittent Stretch Paradigm Using ERK1/2 Phosphorylation Results in Increased Collagen Synthesis in Engineered Ligaments',
    authors:
      'Jennifer Z. Paxton, Paul Hagerty, Jonathan J. Andrick, Keith Baar',
    year: 2012,
    url: 'https://doi.org/10.1089/ten.TEA.2011.0336',
    finding:
      'In ligament tissue grown in a lab, short bouts of stretch with long rests increased collagen. No people took part.',
    studyType: 'Laboratory engineered ligament experiment',
    population:
      'Engineered ligament constructs; no human participants; replicate counts unverified',
    readingDepth: 'abstract and selected full-text discussion excerpts',
    supports:
      'Context for cellular responses to intermittent loading and collagen accumulation.',
    limitations: [
      'Selected discussion excerpts only',
      'In-vitro 10-minute/6-hour schedule is not a climbing or rehabilitation dose',
      'No established human injury prevention or healing benefit',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'shaw2017',
    title:
      'Vitamin C-enriched gelatin supplementation before intermittent activity augments collagen synthesis',
    authors:
      'Gregory Shaw, Ann Lee-Barthel, Megan L. R. Ross, Bing Wang, Keith Baar',
    year: 2017,
    url: 'https://doi.org/10.3945/ajcn.116.138594',
    finding:
      'In 8 healthy men, gelatin with vitamin C before short exercise raised blood markers linked to collagen making.',
    studyType: 'Randomized double-blind crossover biomarker trial',
    population:
      '8 healthy men; serum from 4 used in engineered-ligament bioassay',
    readingDepth: 'full-text methods/results/discussion in the repository PDF',
    supports: 'Mechanistic context for collagen-related biomarkers.',
    limitations: [
      'Circulating PINP likely reflects bone rather than direct tendon synthesis',
      'Not a climbing injury prevention or finger healing trial',
      'Does not justify supplement advice',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'baar2019',
    title:
      'Stress Relaxation and Targeted Nutrition to Treat Patellar Tendinopathy',
    authors: 'Keith Baar',
    year: 2019,
    url: 'https://doi.org/10.1123/ijsnem.2018-0231',
    finding:
      'One professional basketball player with a knee tendon problem improved during a combined loading and nutrition programme.',
    studyType: 'Case report',
    population:
      '1 professional basketball player with MRI-diagnosed patellar tendinopathy',
    readingDepth: 'abstract only',
    supports: 'Research context for a combined supervised tendon intervention.',
    limitations: [
      'Single uncontrolled case cannot isolate treatment components or establish efficacy',
      'Patellar tendon and supervised basketball differ from recreational finger symptoms',
      'Does not validate app rehabilitation or photo healing inference',
    ],
    verifiedAt: '2026-10-03',
  },
  {
    id: 'walker2020',
    title:
      'Increasing accuracy of rock-climbing techniques in novice athletes using expert modeling and video feedback',
    authors: 'Seth G. Walker, Stephanie L. Mattson, Tyra P. Sellers',
    year: 2020,
    url: 'https://doi.org/10.1002/jaba.694',
    finding:
      'Expert video examples combined with video and spoken feedback helped novice climbers perform three targeted skills more accurately.',
    studyType: 'Multiple-baseline intervention across skills',
    population:
      'Novice adult climbers; participant count unverified in accessible primary abstract',
    readingDepth: 'Abstract only',
    supports:
      'Context for combined expert video modeling plus video and verbal feedback on targeted skill execution.',
    limitations: [
      'Full-text methods and sample count were unavailable',
      'Combined package does not isolate video feedback',
      'Does not validate automated observations, app drills, doses or personalized selection',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'sanchez2012',
    title:
      'Efficacy of pre-ascent climbing route visual inspection in indoor sport climbing',
    authors: 'X. Sanchez, Ph. Lambert, G. Jones, D. J. Llewellyn',
    year: 2012,
    url: 'https://doi.org/10.1111/j.1600-0838.2010.01151.x',
    finding:
      'In 29 male climbers, a three-minute route preview led to fewer and shorter stops on the climb, but not to more routes completed.',
    studyType: 'Preview/no-preview climbing experiment',
    population:
      '29 male intermediate, advanced and expert indoor sport climbers',
    readingDepth: 'Abstract only',
    supports:
      'Context for route preview: fewer/shorter stops in the studied climbs, without improved route completion.',
    limitations: [
      'Full-text PDF inaccessible; randomization and counterbalancing details unverified',
      'Different indoor sport task; benefits varied with expertise',
      'Does not validate app preview tasks, dose or send improvement',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'medernach2021',
    title:
      'Effects of decision-making on indoor bouldering performances: A multi-experimental study approach',
    authors: 'Jerry Prosper Medernach, Daniel Memmert',
    year: 2021,
    url: 'https://doi.org/10.1371/journal.pone.0250701',
    finding:
      'Advanced boulderers generally decided faster and made fewer movement mistakes than novices. The authors doubted that one expert solution suits everyone.',
    studyType: 'Three-task comparative experiment across ability groups',
    population:
      '86 volunteers; 77 men analyzed (18 novice, 18 intermediate, 41 advanced); nine women excluded; separate solution retest with 13 elite women',
    readingDepth: 'Full-text methods/results/discussion',
    supports:
      'Context for decisions and movement mistakes differing by experience; an expert best sequence may vary with personal constraints.',
    limitations: [
      'Ability groups are not randomized training groups',
      'Limited tasks and relatively easy routes for higher ability groups',
      'Does not establish efficacy of app preview/reflection or universal best technique',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'langer2024',
    title:
      'The effects of five weeks of climbing training, on and off the wall, on climbing specific strength, performance, and training experience in female climbers: A randomized controlled trial',
    authors: 'Kaja Langer, Vidar Andersen, Nicolay Stien',
    year: 2024,
    url: 'https://doi.org/10.1371/journal.pone.0306300',
    finding:
      'In a five-week trial with female climbers, performance improved in every group, but differences in strength and technique between the programmes were unclear.',
    studyType: 'Randomized three-group training trial',
    population:
      '31 female lower-grade to advanced climbers randomized; methods report 26 completers and 21 with technique ratings',
    readingDepth: 'Full-text methods/results/discussion',
    supports:
      'Context for studying specific climbing programs and training preferences; strength and technique effects remained limited or uncertain.',
    limitations: [
      'Small sample; discussion separately states 27 included, conflicting with methods count',
      'Total climbing exposure and rater limitations complicate interpretation',
      'Does not validate app drills, doses, automated scores, long-term adherence or injury prevention',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'stien2024',
    title:
      'Development of Specific Motor Skills through System Wall Bouldering Training: A Pilot Study',
    authors:
      'Nicolay Stien, Kaja Langer, Vidar Andersen, Gunn Helene Engelsrud, Elias Olsen, Atle Hole Saeterbakken',
    year: 2024,
    url: 'https://doi.org/10.1155/2024/5584962',
    finding:
      'In 13 advanced female boulderers, five weeks of targeted movement practice did not clearly beat usual training.',
    studyType: 'Randomized two-group pilot training trial',
    population:
      '13 advanced female boulderers; seven system-wall practice and six usual-training controls',
    readingDepth: 'Full-text methods/results/discussion',
    supports:
      'Context for targeted movement practice; no significant between-group advantage in technique-rating changes or attempt counts was established.',
    limitations: [
      'Small sample and only two test problems',
      'Within-group changes do not establish superiority over usual training',
      'Does not validate app cues, drills, doses, personalized selection or camera scoring',
    ],
    verifiedAt: '2026-10-04',
  },
];
