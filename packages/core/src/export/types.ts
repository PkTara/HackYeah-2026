/**
 * Types for Export: one snapshot of what the app holds, turned into a
 * document for one reader (a doctor, a coach, family) or a data file.
 * Everything here is pure data; the app builds the words for each mode.
 */
import type { SportWords } from '../evidence';

export type ExportMode = 'climb' | 'run' | 'swim';

export type AudienceId =
  | 'doctor'
  | 'physio'
  | 'coach'
  | 'nutrition'
  | 'family'
  | 'you'
  | 'data';

/** How a value got into the record. Every shown number carries one. */
export type Provenance =
  | 'entered'
  | 'timed_in_app'
  | 'measured_tool'
  | 'camera_estimate'
  | 'app_rule'
  | 'example';

export type FileKind =
  | 'text'
  | 'markdown'
  | 'html'
  | 'csv'
  | 'measurementsCsv'
  | 'json';

/** 2, 4 or 12 weeks back from today, or null for everything. */
export type PeriodWeeks = 2 | 4 | 12 | null;

export type SectionId =
  | 'reason'
  | 'activity'
  | 'otherSports'
  | 'weekly'
  | 'effort'
  | 'byKind'
  | 'recent'
  | 'pattern'
  | 'longest'
  | 'restDays'
  | 'goal'
  | 'notRecorded'
  | 'flags'
  | 'loadAroundFlags'
  | 'grip'
  | 'measurements'
  | 'paused'
  | 'plan'
  | 'progress'
  | 'about'
  | 'provenance'
  | 'questions'
  | 'afterVisit'
  | 'whyLayout';

/**
 * The words one mode uses, so one audience serves every mode. Built by the
 * app from SPORT_VIEWS (running, swimming) or its climbing labels.
 */
export type ModeWords = SportWords &
  Readonly<{
    /** "Running", "Climbing", "Swimming". */
    modeName: string;
    /** "sent" or "finished". */
    doneWord: string;
    /** "not sent" or "cut short". */
    notDoneWord: string;
    /** "Wall", "Run type", "Stroke". */
    kindLabel: string;
    /** "Place", "Ground", "Water". */
    placeLabel: string;
    /** The tab where sore spots are marked: "Hands", "Legs", "Body". */
    bodyTab: string;
    /** What the pause covers: "quests that mean running". */
    pausedWhat: string;
    /** How one session is logged, for "How was this data created?". */
    logHow: string;
    /** "Left knee", "Right ring finger". */
    flagWhere: (side: string, part: string) => string;
  }>;

export type ExportSession = Readonly<{
  id: string;
  date: string;
  /** Run type, stroke or wall id: 'tempo', 'free', 'vertical'. */
  kind: string;
  place: string | null;
  distance: number | null;
  unit: 'km' | 'm' | null;
  /** Moving time. Null where time is not recorded (climbs). */
  minutes: number | null;
  pace: string | null;
  /** Finished as planned, or sent. */
  done: boolean;
  grade: string | null;
  styles: readonly string[];
  holds: readonly string[];
  provenance: 'entered' | 'example';
}>;

export type ExportFlag = Readonly<{
  side: string;
  /** Body part or finger id: 'knee', 'ring'. */
  part: string;
  /** "Left knee", "Right ring finger". */
  where: string;
  /** Marked spots: "A2 pulley (base segment)". Empty: not sure where. */
  spots: readonly string[];
  /** First flagged, YYYY-MM-DD. */
  since: string;
  /** Days from `since` to today. */
  days: number;
  provenance: 'entered' | 'example';
}>;

export type ExportMeasurement = Readonly<{
  id: string;
  date: string;
  /** Stable key: 'finger_force', 'dead-hang', 'height'. */
  metric: string;
  /** "Finger strength", "Dead hang". */
  name: string;
  value: number;
  unit: string;
  /** "180 N", "35 s", "4 cm past your toes". */
  display: string;
  /** "typed in", "stopwatch in the app", "camera". */
  method: string;
  protocol: string | null;
  side: string | null;
  /** Finger force setup in words, or null. */
  setup: string | null;
  /** The reading before, only for the same method, protocol and setup. */
  previous: Readonly<{ date: string; value: number }> | null;
  provenance: Provenance;
}>;

export type ExportSnapshot = Readonly<{
  schema: 'climbing-monkey-export/1';
  generatedOn: string;
  mode: ExportMode;
  words: ModeWords;
  /** The whole record is the made-up demo profile. */
  demoProfile: boolean;
  /** Any record shown is example data. */
  containsExamples: boolean;
  period: Readonly<{ from: string; to: string; weeks: PeriodWeeks }>;
  /** Inside the period, newest first. */
  sessions: readonly ExportSession[];
  /** Everything logged, newest first. */
  allSessions: readonly ExportSession[];
  /** The three kinds in the sport's order. */
  kinds: readonly string[];
  flags: readonly ExportFlag[];
  /** Empty in running and swimming. */
  measurements: readonly ExportMeasurement[];
  /** Climbing setup answers, or null. */
  about: Readonly<{
    experience: string;
    usualGrade: string;
    goal: string;
    places: readonly string[];
    skippedTests: readonly string[];
  }> | null;
  focus: Readonly<{
    /** "Tempo", "Vertical". */
    name: string;
    kind: 'explore' | 'practice';
    summary: string;
    rule: readonly string[];
    limitations: readonly string[];
  }>;
  quest: Readonly<{
    id: string;
    title: string;
    task: string;
    minutes: number;
    draft: boolean;
  }> | null;
  /** Titles of quests paused while something is flagged. */
  paused: readonly string[];
  progress: Readonly<{
    level: number;
    xp: number;
    completedQuestIds: readonly string[];
  }>;
  otherSports: readonly Readonly<{
    modeName: string;
    session: string;
    sessions: string;
    count: number;
    activeDays: number;
    provenance: 'entered' | 'example';
  }>[];
}>;

export type ExportChoices = Readonly<{
  /** Section on or off. Missing means the audience's default. */
  include?: Readonly<Partial<Record<SectionId, boolean>>>;
  /** Picked question texts, in order. Missing means the defaults. */
  questions?: readonly string[];
  /** Typed on the export screen. Never saved. */
  customQuestion?: string;
  reason?: string;
}>;

export type Block =
  | Readonly<{ kind: 'text'; text: string }>
  | Readonly<{ kind: 'list'; items: readonly string[]; ordered?: boolean }>
  | Readonly<{
      kind: 'table';
      head: readonly string[];
      rows: readonly (readonly string[])[];
    }>
  /** A line to write on: ruled in HTML, underscores in text. */
  | Readonly<{ kind: 'blank'; label: string }>;

export type ExportSection = Readonly<{
  id: SectionId;
  heading: string;
  blocks: readonly Block[];
}>;

export type ExportDocument = Readonly<{
  title: string;
  /** Made-on and period lines, example banner, what this is not. */
  intro: readonly string[];
  sections: readonly ExportSection[];
  /** Last lines before the legend (the family note ends this way). */
  closing: readonly string[];
  /** One line per label actually used. */
  legend: readonly string[];
}>;

export type SectionDef = Readonly<{
  id: SectionId;
  /** Toggle name on the export screen. */
  label: string;
  /** One line under the toggle. */
  detail: string;
  defaultOn: boolean;
  /** Always included; the format makes no sense without it. */
  locked?: boolean;
  /** Only in these modes. */
  modes?: readonly ExportMode[];
}>;

export type QuestionPrompt = Readonly<{
  text: string;
  defaultOn: boolean;
}>;

export type Audience = Readonly<{
  id: AudienceId;
  /** "Doctor or GP". */
  name: string;
  /** "A GP or sports doctor in a short visit." */
  forWho: string;
  /** What the format holds, in a few words. */
  holds: string;
  files: readonly FileKind[];
  sections: readonly SectionDef[];
  /** Question prompts for this reader in this record. */
  questions: (s: ExportSnapshot) => readonly QuestionPrompt[];
  /** Heading of the question section. */
  questionsHeading: string;
  notThis: string;
  sourceIds: readonly string[];
}>;
