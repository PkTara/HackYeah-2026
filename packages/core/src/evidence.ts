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
import { shortDate } from './dates';
import type { DecisionFlow, FlowIcon, FlowInput, FlowNode } from './flow';
import { spotsFor } from './spots';
import {
  AXIS_RULES,
  LONG_SESSION_CLIMBS,
  RADAR_LEVEL_NAME,
  RADAR_LEVEL_POINTS,
  RADAR_MIN_CLIMBS,
  type AxisRule,
  type AxisScore,
  type AxisTest,
  type MovementAxisId,
} from './movement';

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

/**
 * One record drawn as a short row: a date, a badge, an icon, two lines of
 * words and an outcome stamp. The row's `label` and `detail` stay the
 * spoken version, so nothing here needs to be read out.
 */
export type RecordView = Readonly<{
  /** Date words: "30 Sep", "Since 2 Oct". */
  when?: string;
  /** A few characters in a box: a grade "V3", a distance "5". */
  badge?: string;
  /** Small unit under the badge: "km". */
  badgeNote?: string;
  icon?: FlowIcon;
  /** Bold first line: "Vertical", "Left ring". */
  title: string;
  /** Second line: "Controlled, crimps". */
  note?: string;
  /** The stamp at the end: "Sent" (done) or "Not yet". */
  outcome?: Readonly<{ text: string; done: boolean }>;
  sample?: boolean;
}>;

export type EvidenceRecord = Readonly<{
  id: string;
  label: string;
  detail: string;
  view?: RecordView;
}>;

export type DecisionExplanation = Readonly<{
  summary: string;
  status: 'app_rule' | 'draft' | 'estimate' | 'example';
  /** The rule in plain words. Each line is one step. */
  rule: string;
  evidence: readonly EvidenceRecord[];
  sourceIds: readonly string[];
  limitations: readonly string[];
  /** One plain line on what fed it: "6 vertical climbs: 2 sent, 4 not yet." */
  inputSummary?: string;
  /** The same rule as a flow chart. Left out where there is no rule to draw. */
  flow?: DecisionFlow;
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
/** "1 slab climb", "6 slab climbs". `noun` is a plural ending in s. */
const count = (n: number, noun: string) =>
  `${n} ${n === 1 ? noun.replace(/s$/, '') : noun}`;
const holdPlural = (hold: string) =>
  hold === 'pinch' ? 'pinches' : `${hold}s`;

/** A server quest saved before decisions were recorded. */
const unavailable: DecisionExplanation = {
  summary: 'Why this quest was picked was not saved.',
  status: 'app_rule',
  rule: 'The records and the rule behind this quest were not recorded when it was assigned, so they cannot be shown.',
  evidence: [],
  sourceIds: [],
  limitations: ['Your current climbs cannot show why it was picked back then.'],
};

/** Newest first, as the Evidence page lists them; same-day logs by entry. */
function newestFirst<T extends Readonly<{ date: string }>>(
  logs: readonly T[],
): T[] {
  return [...logs].reverse().sort((a, b) => b.date.localeCompare(a.date));
}

function climbEvidence(logs: readonly ClimbLog[]): EvidenceRecord[] {
  return newestFirst(logs).map(log => ({
    id: log.id,
    label: `Climb, ${log.date}${log.sample ? ' (example)' : ''}`,
    detail: `${capital(log.terrain)}, ${
      log.movements.join(' and ') || 'style not recorded'
    }, ${log.holds.join(' and ') || 'holds not recorded'}, ${
      log.grade || 'grade not recorded'
    }. ${log.sent ? 'Sent' : 'Not sent'}.`,
    view: {
      when: shortDate(log.date),
      badge: log.grade || '-',
      icon: log.terrain,
      title: capital(log.terrain),
      note: `${
        log.movements.length
          ? capital(list(log.movements))
          : 'Style not recorded'
      }, ${
        log.holds.length
          ? list(log.holds.map(holdPlural))
          : 'holds not recorded'
      }`,
      outcome: { text: log.sent ? 'Sent' : 'Not yet', done: log.sent },
      ...(log.sample ? { sample: true } : {}),
    },
  }));
}

/** "6 vertical climbs: 2 sent, 4 not yet." */
function climbSummary(logs: readonly ClimbLog[], noun = 'climbs'): string {
  const sent = logs.filter(log => log.sent).length;
  return logs.length === 0
    ? `No ${noun} logged yet.`
    : `${capital(count(logs.length, noun))}: ${sent} sent, ${
        logs.length - sent
      } not yet.`;
}

/** One chip per wall, with the wall the result is about marked. */
function wallInputs(logs: readonly ClimbLog[], key?: Terrain): FlowInput[] {
  const tallies = terrainTallies(logs);
  return TERRAINS.map(terrain => ({
    label: capital(terrain),
    value: `${tallies[terrain].sent} of ${tallies[terrain].logged} sent`,
    icon: terrain,
    ...(terrain === key ? { key: true } : {}),
  }));
}

type GroupRow = Readonly<{ name: string; logged: number; done: number }>;

/**
 * The focus rule as a flow, shared by the walls and the sport kinds: count,
 * check every group has enough logs, pick, then break a tie. The branch
 * taken follows the focus that was actually chosen.
 */
function focusNodes(
  rows: readonly GroupRow[],
  picked: string,
  practice: boolean,
  words: Readonly<{
    /** "wall", "run type" */
    group: string;
    /** "climbs", "runs" */
    things: string;
    /** "sent", "finished" */
    done: string;
    /** "sends", "finishes" */
    dones: string;
    min: number;
  }>,
): FlowNode[] {
  const share = (row: GroupRow) => row.done / row.logged;
  const chosen = rows.find(row => row.name === picked);
  const thin = rows.filter(row => row.logged < words.min);
  const tied = chosen
    ? practice
      ? rows.filter(
          row => row.logged >= words.min && share(row) === share(chosen),
        )
      : thin.filter(row => row.logged === chosen.logged)
    : [];
  const percentOf = (row: GroupRow) =>
    `${row.name.toLowerCase()} ${percent(row.done, row.logged)}`;
  return [
    {
      type: 'step',
      label: `Count ${words.things} and ${words.dones} per ${words.group}`,
    },
    {
      type: 'check',
      label: `Every ${words.group} has ${words.min}+ ${words.things}?`,
      taken: practice ? 'yes' : 'no',
      yes: `Pick the lowest share ${words.done}`,
      no: `Pick the fewest ${words.things}`,
      detail: practice
        ? capital(rows.map(percentOf).join(', '))
        : thin.length
        ? `Under ${words.min}: ${thin
            .map(row => `${row.name.toLowerCase()} ${row.logged}`)
            .join(', ')}`
        : undefined,
      team: true,
    },
    {
      type: 'check',
      label: 'A tie?',
      taken: tied.length > 1 ? 'yes' : 'no',
      yes: capital(rows.map(row => row.name.toLowerCase()).join(', then ')),
      no: 'No tie',
      detail:
        tied.length > 1
          ? capital(`${list(tied.map(row => row.name.toLowerCase()))} tie`)
          : undefined,
      team: true,
    },
  ];
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
    inputSummary: climbSummary(logs),
    flow: {
      inputs: wallInputs(logs, focus.terrain),
      nodes: focusNodes(
        wallRows(logs),
        capital(focus.terrain),
        focus.kind === 'practice',
        CLIMB_WORDS,
      ),
      result: {
        label: 'Focus',
        value: capital(focus.terrain),
        icon: focus.terrain,
      },
    },
  };
}

const CLIMB_WORDS = {
  group: 'wall',
  things: 'climbs',
  done: 'sent',
  dones: 'sends',
  min: MIN_LOGS,
} as const;

function wallRows(logs: readonly ClimbLog[]): GroupRow[] {
  const tallies = terrainTallies(logs);
  return TERRAINS.map(terrain => ({
    name: capital(terrain),
    logged: tallies[terrain].logged,
    done: tallies[terrain].sent,
  }));
}

function fingerFlagEvidence(flags: readonly HandFlag[]): EvidenceRecord[] {
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
      view: {
        when: `Since ${shortDate(flag.date)}`,
        icon: 'flag',
        title: `${capital(flag.side)} ${flag.finger}`,
        note: spots.length ? `Sore at ${list(spots)}` : 'No spot marked',
        outcome: { text: 'Flagged', done: false },
      },
    };
  });
}

/** "1 flagged finger", "No finger flagged". */
function flagCount(n: number): string {
  return n === 0 ? 'No finger flagged' : count(n, 'flagged fingers');
}

/** The flags as one chip that joins the flow where they are checked. */
function flagFeed(flags: readonly HandFlag[]): FlowInput {
  return flags.length === 1
    ? {
        label: `${capital(flags[0].side)} ${flags[0].finger}`,
        value: 'flagged',
        icon: 'flag',
      }
    : { label: flagCount(flags.length), icon: 'flag' };
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
    inputSummary: `${flagCount(flags.length)}.`,
    flow: {
      inputs: flags.length
        ? flags.map(flag => ({
            label: `${capital(flag.side)} ${flag.finger}`,
            value: 'flagged',
            icon: 'flag',
          }))
        : [{ label: 'No finger flagged', icon: 'flag' }],
      nodes: [
        {
          type: 'check',
          label: 'A finger flagged sore?',
          taken: flags.length ? 'yes' : 'no',
          yes: 'Pause quests that load fingers',
          no: 'Keep every quest',
          team: true,
        },
        ...(flags.length
          ? [
              {
                type: 'step' as const,
                label: 'Other quests and a check-in stay open',
                detail: 'Clear the flag on Hands to bring them back',
                team: true,
              },
            ]
          : []),
      ],
      result: {
        label: 'Finger quests',
        value: flags.length ? 'Paused' : 'Open',
        icon: flags.length ? 'flag' : 'check',
      },
    },
  };
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
    // Flags and progress first: they are few and decide most quests.
    evidence: [
      ...fingerFlagEvidence(flags),
      ...(selection
        ? [progressEvidence(selection, id => findQuest(id)?.title)]
        : []),
      ...climbEvidence(logs),
    ],
    sourceIds: quest.kind === 'plan' ? ['sanchez2012', 'seifert2017'] : [],
    limitations: quietLimits(quest),
    inputSummary: questSummary(
      count(logs.length, 'climbs'),
      flagCount(flags.length).toLowerCase(),
      !!selection,
    ),
    flow: {
      inputs: wallInputs(logs, focus.terrain),
      nodes: questNodes({
        focus: capital(focus.terrain),
        why: focus.kind === 'practice' ? 'Lowest share sent' : 'Fewest climbs',
        practice: focus.kind === 'practice',
        enough: `Every wall has ${MIN_LOGS}+ climbs?`,
        logMore: 'Log more climbs there',
        practise: 'Practise the focus wall',
        flagged: flags.length > 0,
        flagQuestion: 'A finger flagged sore?',
        pause: 'Pause finger quests',
        flagFeed: flagFeed(flags),
        progress: selection && {
          done: selection.completed.length,
          swapped: selection.skipped.length,
        },
      }),
      result: { label: 'Quest', value: quest.title, icon: 'banana' },
    },
  };
}

/**
 * Done and swapped quests. The spoken detail keeps every id it cannot name;
 * the row shows titles and only counts the rest, so no ids are drawn.
 */
function progressEvidence(
  progress: Readonly<{
    completed: readonly string[];
    skipped: readonly string[];
  }>,
  titleOf: (id: string) => string | undefined,
): EvidenceRecord {
  const spoken = (ids: readonly string[]) =>
    ids.length ? list(ids.map(id => titleOf(id) ?? id)) : 'none';
  const shown = (ids: readonly string[]) => {
    const titles = ids
      .map(titleOf)
      .filter((title): title is string => title !== undefined);
    const other = ids.length - titles.length;
    const parts = [
      ...titles,
      ...(other
        ? [count(other, titles.length ? 'other quests' : 'quests')]
        : []),
    ];
    return parts.length ? list(parts) : 'none';
  };
  return {
    id: 'quest-progress',
    label: 'Your quest progress',
    detail: `Done: ${spoken(
      progress.completed,
    )}. Swapped, oldest first: ${spoken(progress.skipped)}.`,
    view: {
      icon: 'banana',
      title: 'Quest progress',
      note: `Done: ${shown(progress.completed)}. Swapped: ${shown(
        progress.skipped,
      )}.`,
    },
  };
}

/** "17 climbs, 1 flagged finger and your quest progress." */
function questSummary(
  records: string,
  flags: string,
  progress: boolean,
): string {
  return `${capital(
    progress
      ? `${records}, ${flags} and your quest progress`
      : `${records} and ${flags}`,
  )}.`;
}

/**
 * The quest rule as a flow, shared by the monkey and the sport modes: the
 * focus, the log-or-practise gate, the flag pause, then done and swapped
 * quests. Each check follows what was actually true.
 */
function questNodes(
  q: Readonly<{
    focus: string;
    /** Why that focus, a few words. */
    why: string;
    practice: boolean;
    enough: string;
    logMore: string;
    practise: string;
    flagged: boolean;
    flagQuestion: string;
    pause: string;
    flagFeed: FlowInput;
    progress?: Readonly<{ done: number; swapped: number }>;
  }>,
): FlowNode[] {
  return [
    {
      type: 'step',
      label: `Focus: ${q.focus}`,
      detail: q.why,
    },
    {
      type: 'check',
      label: q.enough,
      taken: q.practice ? 'yes' : 'no',
      yes: q.practise,
      no: q.logMore,
      team: true,
    },
    {
      type: 'check',
      label: q.flagQuestion,
      taken: q.flagged ? 'yes' : 'no',
      yes: q.practice ? `${q.pause}. Check-in first` : q.pause,
      no: 'All quests open',
      team: true,
      feed: q.flagFeed,
    },
    {
      type: 'step',
      label: 'Leave out done quests. Swapped ones go last',
      team: true,
      ...(q.progress
        ? {
            feed: {
              label: 'Your quests',
              value: `${q.progress.done} done, ${q.progress.swapped} swapped`,
              icon: 'banana',
            },
          }
        : {}),
    },
  ];
}

function explainTally(
  what: string,
  logs: readonly ClimbLog[],
  extra?: string,
  draw?: Readonly<{ icon?: FlowIcon; filter?: string }>,
): DecisionExplanation {
  const sent = logs.filter(log => log.sent).length;
  const logged = logs.length;
  const enough = logged >= MIN_LOGS;
  return {
    summary:
      logged === 0
        ? `No ${what} logged yet.`
        : `You sent ${sent} of the ${logged} ${what} you logged.`,
    status: logs.some(log => log.sample) ? 'example' : 'app_rule',
    rule: lines(
      `Count the ${what} you logged: ${logged}. Count those marked sent: ${sent}.`,
      enough
        ? `${sent} of ${logged} is ${percent(sent, logged)}.`
        : `With fewer than ${MIN_LOGS} climbs the share is not shown or compared yet.`,
      extra ?? false,
    ),
    evidence: climbEvidence(logs),
    sourceIds: [],
    limitations: LOG_LIMITS,
    inputSummary: climbSummary(logs, what),
    flow: {
      inputs: [
        {
          label: capital(what),
          value: `${logged} logged`,
          ...(draw?.icon ? { icon: draw.icon } : {}),
        },
      ],
      nodes: [
        ...(draw?.filter
          ? [{ type: 'step' as const, label: draw.filter }]
          : []),
        {
          type: 'step',
          label: 'Count the ones marked sent',
          detail: `${sent} of ${logged}`,
        },
        {
          type: 'check',
          label: `${MIN_LOGS}+ climbs logged?`,
          taken: enough ? 'yes' : 'no',
          yes: 'Show the share sent',
          no: 'Wait for more climbs',
          detail: enough
            ? `${sent} of ${logged} is ${percent(sent, logged)}`
            : `${logged} of ${MIN_LOGS} so far`,
          team: true,
        },
      ],
      result: {
        label: 'Tally',
        value:
          logged === 0
            ? 'None logged'
            : `${sent} of ${logged} sent${
                enough ? `, ${percent(sent, logged)}` : ''
              }`,
        ...(draw?.icon ? { icon: draw.icon } : {}),
      },
    },
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
    undefined,
    { icon: terrain },
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
    { filter: 'A climb with several styles counts in each' },
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
    { icon: terrain, filter: `Only ${terrain} climbs marked ${movement}` },
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
        view: {
          icon: 'camera',
          title: `${value} degrees${
            shoulder ? `, left ${left}, right ${right}` : ''
          }`,
          note: `Visibility ${input.confidence ?? 'unavailable'}. Model ${
            input.modelVersion ?? 'not recorded'
          }.`,
        },
      },
    ],
    sourceIds: ['stenum2021', 'barzegar2024'],
    inputSummary: 'One camera reading.',
    flow: shoulder
      ? {
          inputs: [
            {
              label: 'Camera photo',
              value: 'hips, shoulders, elbows, wrists',
              icon: 'camera',
            },
          ],
          nodes: [
            {
              type: 'check',
              label: 'All points seen, arms straight?',
              taken: input.value == null ? 'no' : 'yes',
              yes: 'Measure both sides',
              no: 'No reading',
              detail: 'Straight means 160+ degrees at the elbow',
              team: true,
            },
            {
              type: 'step',
              label: 'Angle at each shoulder, hip to elbow',
              detail: `Left ${left}, right ${right}`,
              team: true,
            },
            { type: 'step', label: 'Average left and right', team: true },
          ],
          result: {
            label: 'Shoulder reach',
            value: input.value == null ? 'Unavailable' : `${value} degrees`,
            icon: 'ruler',
          },
        }
      : {
          inputs: [
            { label: 'Camera photo', value: 'hips and ankles', icon: 'camera' },
          ],
          nodes: [
            {
              type: 'step',
              label: 'Find the point between the hips',
              team: true,
            },
            { type: 'step', label: 'Draw a line to each ankle', team: true },
            {
              type: 'step',
              label: 'Measure the angle between the lines',
              detail: 'Flat in the image',
              team: true,
            },
          ],
          result: {
            label: 'Leg spread',
            value: input.value == null ? 'Unavailable' : `${value} degrees`,
            icon: 'ruler',
          },
        },
    limitations: [
      shoulder
        ? 'An angle in a flat image, not a measured joint range. Camera position, bent elbows and depth all change it.'
        : 'An angle in a flat image, not a measured joint range. Camera position, bent knees and depth all change it.',
      'Visibility says how clearly the points were seen, not how accurate the angle is.',
    ],
  };
}

// Movement radar

const RADAR_LIMIT =
  'A summary of your own logs and tests, not a skill test or a grade prediction. What counts, the marks and the levels are team rules.';

const AXIS_LIMIT: Readonly<Record<MovementAxisId, string>> = {
  footwork:
    'Wall and style are your own tags, and a send also depends on the grade you picked.',
  balance:
    'The one-leg test is on the floor with your eyes closed, which is not the same as balancing on a wall.',
  tension:
    'A floor plank is not the same as holding your body in on a steep wall.',
  stamina:
    'A bar hang loads the whole arm, and a long day counts climbs, not how hard they were.',
  dynos:
    'No home test covers dynamic moves, so only the climbs you log count.',
};

const SOURCE_WORDS = {
  measured: 'timed with the app stopwatch',
  entered: 'typed in by you',
} as const;

/** "Plank 45 s, timed with the app stopwatch" */
function testWords(test: AxisTest): string {
  if (test.simulated) {
    return `${capital(test.name)} ${test.value} s, an example result`;
  }
  return `${capital(test.name)} ${test.value} s, ${
    test.from === 'assessment' ? 'a saved record ' : ''
  }${SOURCE_WORDS[test.source]}`;
}

function testEvidence(rule: AxisRule, score: AxisScore): EvidenceRecord[] {
  if (!rule.test) {
    return [];
  }
  const { test } = score;
  if (!test) {
    return [
      {
        id: `radar-${rule.id}-no-test`,
        label: `No ${rule.test.name} result`,
        detail: `The ${rule.test.name} test has not been done yet.`,
        view: {
          icon: 'tests',
          title: `No ${rule.test.name} result yet`,
          note: 'Do it on the Data tab',
        },
      },
    ];
  }
  const [a, b, c] = test.marks;
  return [
    {
      id: `radar-${rule.id}-test-${test.date}`,
      label: `${capital(test.name)} result, ${test.date}`,
      detail: `${testWords(test)}. ${count(
        test.points,
        'points',
      )} at the team marks of ${a}, ${b} and ${c} seconds.`,
      view: {
        when: shortDate(test.date),
        icon: 'tests',
        title: `${capital(test.name)} ${test.value} s`,
        note: test.simulated
          ? 'Example result'
          : capital(SOURCE_WORDS[test.source]),
        outcome: { text: `+${test.points}`, done: test.points > 0 },
        ...(test.simulated ? { sample: true } : {}),
      },
    },
  ];
}

function longSessionEvidence(
  logs: readonly ClimbLog[],
  days: readonly string[],
): EvidenceRecord[] {
  return [...days].reverse().map(day => {
    const n = logs.filter(log => log.date === day).length;
    const sample = logs.some(log => log.date === day && log.sample);
    return {
      id: `radar-long-${day}`,
      label: `Long session, ${day}${sample ? ' (example)' : ''}`,
      detail: `${n} climbs logged that day.`,
      view: {
        when: shortDate(day),
        icon: 'clock',
        title: `${n} climbs in one day`,
        note: `A day with ${LONG_SESSION_CLIMBS} or more climbs`,
        outcome: { text: '+1', done: true },
        ...(sample ? { sample: true } : {}),
      },
    };
  });
}

/**
 * Why one radar axis shows what it shows: the matching climbs, its home
 * test, the gate and how the points became a level.
 */
export function explainMovementAxis(
  score: AxisScore,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  const rule = AXIS_RULES[score.axis];
  const level = RADAR_LEVEL_NAME[score.level];
  const logged = score.climbs.length;
  const [a, b, c] = rule.test?.marks ?? [0, 0, 0];
  const testShort = rule.test
    ? score.test
      ? `${rule.test.name} ${score.test.value} s`
      : `no ${rule.test.name} result`
    : undefined;
  const long = score.longSessions.length;
  return {
    summary: score.scored
      ? `${rule.name} is at ${level}: ${count(
          score.points,
          'points',
        )} from your own ${rule.test ? 'climbs and test' : 'climbs'}.`
      : `${rule.name} is not scored yet. ${score.next}`,
    status:
      score.sample || score.test?.simulated ? 'example' : 'app_rule',
    rule: lines(
      `${rule.name} counts ${rule.counts}.`,
      `It is scored once you log ${RADAR_MIN_CLIMBS} matching climbs${
        rule.test ? ` or do the ${rule.test.name} test` : ''
      }. Before that it shows ${RADAR_LEVEL_NAME[0]}, never zero.`,
      'Each matching climb you sent adds 1 point.',
      !!rule.test &&
        `${capital(rule.test.name)} test: ${a} s adds 1 point, ${b} s adds 2, ${c} s adds 3.`,
      !!rule.longSessions &&
        `Each day with ${LONG_SESSION_CLIMBS} or more logged climbs adds 1 point.`,
      `${RADAR_LEVEL_NAME[1]} below ${RADAR_LEVEL_POINTS.building} points, ${
        RADAR_LEVEL_NAME[2]
      } from ${RADAR_LEVEL_POINTS.building}, ${RADAR_LEVEL_NAME[3]} from ${
        RADAR_LEVEL_POINTS.established
      }.`,
      `Why these: ${rule.why}`,
      'What counts, the gate, the marks and the levels are team rules, not taken from a study.',
      `You have ${score.sent} sent of ${count(logged, 'matching climbs')}${
        testShort ? `, ${testShort}` : ''
      }${rule.longSessions ? `, ${count(long, 'long sessions')}` : ''}. ${
        score.scored ? `That is ${count(score.points, 'points')}.` : ''
      }`.trim(),
    ),
    evidence: [
      ...testEvidence(rule, score),
      ...longSessionEvidence(logs, score.longSessions),
      ...climbEvidence(score.climbs),
    ],
    sourceIds: rule.sourceIds,
    limitations: [RADAR_LIMIT, AXIS_LIMIT[score.axis]],
    inputSummary: `${
      logged === 0
        ? 'No matching climbs yet.'
        : `${capital(count(logged, 'matching climbs'))} you logged: ${
            score.sent
          } sent.`
    }${
      rule.test
        ? score.test
          ? ` ${testWords(score.test)}.`
          : ` No ${rule.test.name} result yet.`
        : ''
    }${rule.longSessions ? ` ${capital(count(long, 'long sessions'))}.` : ''}`,
    flow: {
      inputs: [
        {
          label: 'Matching climbs',
          value: `${score.sent} of ${logged} sent`,
          icon: rule.icon,
          key: true,
        },
        ...(rule.test
          ? [
              {
                label: capital(rule.test.name),
                value: score.test ? `${score.test.value} s` : 'No result',
                icon: 'tests',
              },
            ]
          : []),
        ...(rule.longSessions
          ? [{ label: 'Long sessions', value: `${long}`, icon: 'clock' }]
          : []),
      ],
      nodes: [
        {
          type: 'step',
          label: 'Keep the climbs that match',
          detail: capital(rule.climbsText),
          team: true,
        },
        {
          type: 'check',
          label: `${RADAR_MIN_CLIMBS}+ matching climbs${
            rule.test ? ' or a test' : ''
          }?`,
          taken: score.scored ? 'yes' : 'no',
          yes: 'Score this axis',
          no: RADAR_LEVEL_NAME[0],
          detail: `${logged} ${logged === 1 ? 'climb' : 'climbs'}, ${
            RADAR_MIN_CLIMBS
          } needed${testShort ? `. ${capital(testShort)}` : ''}`,
          team: true,
        },
        ...(score.scored
          ? [
              {
                type: 'step' as const,
                label: '1 point per sent climb',
                detail: `${score.sent} sent, ${count(score.sent, 'points')}`,
                team: true,
              },
              ...(rule.test
                ? [
                    {
                      type: 'step' as const,
                      label: `${capital(rule.test.name)} marks ${a}, ${b}, ${c} s`,
                      detail: score.test
                        ? `${score.test.value} s is ${count(
                            score.test.points,
                            'points',
                          )}`
                        : 'No result, no points',
                      team: true,
                    },
                  ]
                : []),
              ...(rule.longSessions
                ? [
                    {
                      type: 'step' as const,
                      label: `1 point per day with ${LONG_SESSION_CLIMBS}+ climbs`,
                      detail: `${count(long, 'days')}, ${count(long, 'points')}`,
                      team: true,
                    },
                  ]
                : []),
              {
                type: 'step' as const,
                label: 'Level from points',
                detail: `${count(score.points, 'points')}: ${
                  RADAR_LEVEL_POINTS.building
                }+ is ${RADAR_LEVEL_NAME[2]}, ${
                  RADAR_LEVEL_POINTS.established
                }+ is ${RADAR_LEVEL_NAME[3]}`,
                team: true,
              },
            ]
          : []),
      ],
      result: { label: rule.name, value: level, icon: rule.icon },
    },
  };
}

/** The radar as a whole: which axes are scored and how the shape is drawn. */
export function explainMovementRadar(
  scores: readonly AxisScore[],
): DecisionExplanation {
  const scored = scores.filter(score => score.scored);
  return {
    summary: scored.length
      ? `${scored.length} of ${scores.length} axes are scored from your own records.`
      : `No axis is scored yet. Each needs ${RADAR_MIN_CLIMBS} matching climbs or its home test.`,
    status: scored.some(score => score.sample || score.test?.simulated)
      ? 'example'
      : 'app_rule',
    rule: lines(
      ...scores.map(
        score =>
          `${score.name}: ${AXIS_RULES[score.axis].counts}. ${
            RADAR_LEVEL_NAME[score.level]
          }${score.scored ? `, ${count(score.points, 'points')}` : ''}.`,
      ),
      `Each sent matching climb is 1 point, and a home test adds up to 3. An axis needs ${RADAR_MIN_CLIMBS} matching climbs or its test to be scored.`,
      'The shape is only filled between neighbouring scored axes. An unscored axis keeps a dashed line and is never drawn as zero.',
    ),
    evidence: scores.map(score => ({
      id: `radar-${score.axis}`,
      label: `${score.name}: ${RADAR_LEVEL_NAME[score.level]}`,
      detail: score.next,
      view: {
        icon: AXIS_RULES[score.axis].icon,
        title: score.name,
        note: score.scored
          ? `${count(score.points, 'points')}. ${score.next}`
          : score.next,
        outcome: {
          text: RADAR_LEVEL_NAME[score.level],
          done: score.scored,
        },
        ...(score.sample ? { sample: true } : {}),
      },
    })),
    sourceIds: [],
    limitations: [
      RADAR_LIMIT,
      'Tap an axis name for its records, rule and research.',
    ],
    inputSummary: `${scored.length} of ${scores.length} axes scored, from your climbs and home tests.`,
    flow: {
      inputs: scores.map(score => ({
        label: score.name,
        value: RADAR_LEVEL_NAME[score.level],
        icon: AXIS_RULES[score.axis].icon,
      })),
      nodes: [
        {
          type: 'step',
          label: 'Score each axis on its own',
          detail: 'Sent climbs plus its home test',
          team: true,
        },
        {
          type: 'check',
          label: 'Every axis scored?',
          taken: scored.length === scores.length ? 'yes' : 'no',
          yes: 'Fill the whole shape',
          no: 'Fill only between scored axes',
          detail: `${scored.length} of ${scores.length} scored`,
          team: true,
        },
      ],
      result: {
        label: 'Radar',
        value: `${scored.length} of ${scores.length} scored`,
      },
    },
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
  /** "run types", "strokes". Defaults to "kinds". */
  kindPlural?: string;
}>;

function sessionEvidence(
  logs: readonly SessionLog[],
  words: SportWords,
): EvidenceRecord[] {
  return newestFirst(logs).map(log => ({
    id: log.id,
    label: `${capital(words.session)}, ${log.date}${
      log.sample ? ' (example)' : ''
    }`,
    detail: `${words.kindName[log.kind] ?? log.kind}, ${(
      words.placeName[log.place] ?? log.place
    ).toLowerCase()}, ${log.distance} ${words.unit}, ${log.minutes} min. ${
      log.finished ? 'Finished as planned' : 'Cut short'
    }.`,
    view: {
      when: shortDate(log.date),
      badge: `${Math.round(log.distance)}`,
      badgeNote: words.unit,
      icon: log.kind,
      title: words.kindName[log.kind] ?? capital(log.kind),
      note: `${words.placeName[log.place] ?? capital(log.place)}, ${
        log.minutes
      } min`,
      outcome: {
        text: log.finished ? 'Finished' : 'Cut short',
        done: log.finished,
      },
      ...(log.sample ? { sample: true } : {}),
    },
  }));
}

/** "9 runs: 6 finished, 3 cut short." */
function sessionSummary(logs: readonly SessionLog[], words: SportWords) {
  const done = logs.filter(log => log.finished).length;
  return logs.length === 0
    ? `No ${words.sessions} logged yet.`
    : `${capital(count(logs.length, words.sessions))}: ${done} finished, ${
        logs.length - done
      } cut short.`;
}

function kindRows(
  logs: readonly SessionLog[],
  kinds: readonly string[],
  words: SportWords,
): GroupRow[] {
  const tallies = talliesBy(logs, 'kind', kinds);
  return kinds.map(kind => ({
    name: words.kindName[kind] ?? capital(kind),
    logged: tallies[kind].logged,
    done: tallies[kind].finished,
  }));
}

function kindInputs(
  logs: readonly SessionLog[],
  kinds: readonly string[],
  words: SportWords,
  key: string,
): FlowInput[] {
  return kindRows(logs, kinds, words).map((row, index) => ({
    label: row.name,
    value: `${row.done} of ${row.logged} finished`,
    icon: kinds[index],
    ...(kinds[index] === key ? { key: true } : {}),
  }));
}

function sportFlowWords(words: SportWords) {
  return {
    group: (words.kindPlural ?? 'kinds').replace(/s$/, ''),
    things: words.sessions,
    done: 'finished',
    dones: 'finishes',
    min: MIN_SESSIONS,
  };
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
    inputSummary: sessionSummary(logs, words),
    flow: {
      inputs: kindInputs(logs, kinds, words, focus.sessionKind),
      nodes: focusNodes(
        kindRows(logs, kinds, words),
        name,
        focus.kind === 'practice',
        sportFlowWords(words),
      ),
      result: { label: 'Focus', value: name, icon: focus.sessionKind },
    },
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
      ...state.flags.map(flag => ({
        id: `${flag.side}/${flag.part}`,
        label: `Flagged sore, since ${flag.date}`,
        detail: `${capital(flag.side)} ${(
          words.bodyPartName[flag.part] ?? flag.part
        ).toLowerCase()}.`,
        view: {
          when: `Since ${shortDate(flag.date)}`,
          icon: 'flag',
          title: `${capital(flag.side)} ${(
            words.bodyPartName[flag.part] ?? flag.part
          ).toLowerCase()}`,
          note: 'Flagged sore',
          outcome: { text: 'Flagged', done: false },
        },
      })),
      progressEvidence(state, id => library.find(q => q.id === id)?.title),
      ...sessionEvidence(state.logs, words),
    ],
    sourceIds: [],
    limitations: draft
      ? [
          'Draft quest written by the team. No study has tested this exact task or its time.',
          sportLimits(words)[1],
        ]
      : sportLimits(words),
    inputSummary: questSummary(
      count(state.logs.length, words.sessions),
      state.flags.length === 0
        ? 'nothing flagged'
        : count(state.flags.length, 'sore spots'),
      true,
    ),
    flow: {
      inputs: kindInputs(state.logs, kinds, words, focus.sessionKind),
      nodes: questNodes({
        focus: words.kindName[focus.sessionKind] ?? capital(focus.sessionKind),
        why:
          focus.kind === 'practice'
            ? 'Lowest share finished'
            : `Fewest ${words.sessions}`,
        practice: focus.kind === 'practice',
        enough: `Every ${sportFlowWords(words).group} has ${MIN_SESSIONS}+ ${
          words.sessions
        }?`,
        logMore: `Log more ${name} ${words.sessions}`,
        practise: `Practise ${name}`,
        flagged: state.flags.length > 0,
        flagQuestion: 'Something flagged sore?',
        pause: `Pause ${words.session} quests`,
        flagFeed:
          state.flags.length === 1
            ? {
                label: `${capital(state.flags[0].side)} ${(
                  words.bodyPartName[state.flags[0].part] ?? state.flags[0].part
                ).toLowerCase()}`,
                value: 'flagged',
                icon: 'flag',
              }
            : {
                label:
                  state.flags.length === 0
                    ? 'Nothing flagged'
                    : count(state.flags.length, 'sore spots'),
                icon: 'flag',
              },
        progress: {
          done: state.completed.length,
          swapped: state.skipped.length,
        },
      }),
      result: { label: 'Quest', value: quest.title },
    },
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
  // Movement radar signals (packages/core/src/movement.ts). Each one backs
  // why a signal is worth looking at for an axis, never the radar itself.
  // Checked through web search of the bibliographic records; PubMed and the
  // publishers were blocked by the network, so every entry is abstract level.
  {
    id: 'noe2001',
    title:
      'Influence of steep gradient supporting walls in rock climbing: biomechanical analysis',
    authors: 'Frédéric Noé, Franck Quaine, Luc Martin',
    year: 2001,
    url: 'https://doi.org/10.1016/S0966-6362(00)00098-9',
    finding:
      'When climbers let go with one foot, staying on an overhanging wall relied strongly on the arms, while the vertical wall asked more of balance.',
    studyType: 'Laboratory biomechanics experiment (Gait & Posture 13(2):86-94, PMID 11240356)',
    population: 'Climbers on an instrumented wall; sample size not checked',
    readingDepth: 'abstract only, through search records',
    supports:
      'Wall angle changes how arms and feet share the work, which is why the radar groups climbs by wall for footwork and tension.',
    limitations: [
      'One posture with one foot released on vertical and overhanging walls; slabs and whole climbs were not studied',
      'Does not validate the radar, its axes or any wall-to-skill mapping',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'springer2007',
    title:
      'Normative values for the unipedal stance test with eyes open and closed',
    authors:
      'Barbara A. Springer, Raul Marin, Tamara Cyhan, Holly Roberts, Norman W. Gill',
    year: 2007,
    url: 'https://doi.org/10.1519/00139143-200704000-00003',
    finding:
      'In 549 healthy adults, one-leg stance times were very consistent between raters, with eyes open and closed, and fell with age.',
    studyType:
      'Normative and reliability study (J Geriatr Phys Ther 30(1):8-15, PMID 19839175)',
    population: '549 healthy adults aged 18 and over, in six age groups',
    readingDepth: 'abstract only, through search records',
    supports:
      'A timed one-leg stance is a repeatable floor test of standing balance.',
    limitations: [
      'Not climbers, and balance on the floor is not balance on a wall',
      'Its age norms are not used as app marks; the marks are team rules',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'saul2019',
    title: 'Determinants for success in climbing: A systematic review',
    authors:
      'Dominik Saul, Gino Steinmetz, Wolfgang Lehmann, Arndt F. Schilling',
    year: 2019,
    url: 'https://doi.org/10.1016/j.jesf.2019.04.002',
    finding:
      'A review of climbing studies found that successful climbers tended to have strong, enduring grips, good postural stability and long finger and bent-arm hang times.',
    studyType:
      'Systematic review, secondary evidence (J Exerc Sci Fit 17(3):91-100)',
    population: 'Published climbing studies up to September 2018',
    readingDepth: 'abstract only, through search records',
    supports:
      'Balance and hang endurance are qualities climbing research looks at, so they are fair signals to record.',
    limitations: [
      'Secondary evidence: associations across studies, mostly with skilled climbers',
      'Does not validate the radar, its marks or any grade prediction',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'tong2014',
    title:
      'Sport-specific endurance plank test for evaluation of global core muscle function',
    authors: 'Tom K. Tong, Shing Wu, Jinlei Nie',
    year: 2014,
    url: 'https://doi.org/10.1016/j.ptsp.2013.03.003',
    finding:
      'A timed plank test with arm and leg lifts gave very repeatable times in 36 young athletes, once they had one practice try.',
    studyType:
      'Validity and reliability study (Phys Ther Sport 15(1):58-63)',
    population: '36 young athletes (28 men, 8 women)',
    readingDepth: 'abstract only, through search records',
    supports:
      'A timed plank-style hold can be a repeatable test of trunk endurance.',
    limitations: [
      'A harder plank variant than the app test, in athletes, not climbers',
      'Does not validate the app plank, its marks or body tension on a wall',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'muehlbauer2012',
    title: 'Effects of climbing on core strength and mobility in adults',
    authors: 'Thomas Muehlbauer, Matthias Stuerchler, Urs Granacher',
    year: 2012,
    url: 'https://doi.org/10.1055/s-0031-1301312',
    finding:
      'In 28 inactive adults, eight weeks of indoor climbing raised trunk strength and mobility, and some of it was lost after eight weeks off.',
    studyType:
      'Training and detraining study (Int J Sports Med 33(6):445-451, PMID 22422306)',
    population: '28 young sedentary adults',
    readingDepth: 'abstract only, through search records',
    supports:
      'Climbing works the trunk, so trunk endurance is a fair signal for body tension.',
    limitations: [
      'Inactive beginners in a short programme; design details beyond the abstract not checked',
      'Does not show that a plank time reflects tension while climbing',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'balas2012',
    title:
      'Hand-arm strength and endurance as predictors of climbing performance',
    authors: 'Jiří Baláš, Ondřej Pecha, Andrew J. Martin, Darryl Cochrane',
    year: 2012,
    url: 'https://doi.org/10.1080/17461391.2010.546431',
    finding:
      'In 205 sport climbers, grip strength, a bent-arm hang and a finger hang together formed a strength and endurance factor closely linked with climbing level.',
    studyType:
      'Cross-sectional structural model (Eur J Sport Sci 12(1):16-25)',
    population: '205 sport climbers (136 men, 69 women), UIAA grades 4 to 11',
    readingDepth: 'abstract only, through search records',
    supports:
      'Hang times are a recognised climbing endurance test, so a dead hang is a fair stamina signal.',
    limitations: [
      'A bar dead hang differs from the finger and bent-arm hangs studied',
      'An association with level; the app never predicts a grade from it',
    ],
    verifiedAt: '2026-10-04',
  },
  {
    id: 'augste2021',
    title:
      'Athletes’ performance in different boulder types at international bouldering competitions',
    authors: 'Claudia Augste, Paulin Sponar, Marvin Winkler',
    year: 2021,
    url: 'https://doi.org/10.1080/24748668.2021.1907728',
    finding:
      'In 448 boulder sections from World Cup finals, more than half had a dynamic move as the crux, and success differed by boulder type.',
    studyType:
      'Video analysis of competitions (Int J Perform Anal Sport 21(3):409-420)',
    population:
      'Final rounds of 14 Bouldering World Cups in 2017 and 2018',
    readingDepth: 'abstract only, through search records',
    supports:
      'Dynamic moves are a common, separate kind of boulder, so they are worth logging as their own axis.',
    limitations: [
      'Elite competition boulders, not gym climbers',
      'Says nothing about how to score or train dynos',
    ],
    verifiedAt: '2026-10-04',
  },
];
