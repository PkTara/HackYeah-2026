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
import { QUESTS, type Quest } from './quests';

/** Personal record evidence and published research have separate identifiers. */
export type ResearchSource = Readonly<{
  id: string;
  title: string;
  authors: string;
  year: number;
  url: string;
  studyType: string;
  population: string;
  readingDepth: string;
  supports: string;
  limitations: readonly string[];
  verifiedAt: string;
}>;

export type DecisionExplanation = Readonly<{
  summary: string;
  status: 'app_rule' | 'draft' | 'estimate' | 'example';
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

const unavailable: DecisionExplanation = {
  summary: 'Decision provenance unavailable.',
  status: 'app_rule',
  rule: 'Unavailable: the selection inputs and rule were not recorded.',
  evidence: [],
  sourceIds: [],
  limitations: ['Do not infer the original decision from current records.'],
};

function climbEvidence(
  logs: readonly ClimbLog[],
): DecisionExplanation['evidence'] {
  return logs.map(log => ({
    id: log.id,
    label: `Climb · ${log.date}${log.sample ? ' · example' : ''}`,
    detail: `${log.terrain}; movements=${log.movements.join(',')}; holds=${
      log.holds.join(',') || 'not recorded'
    }; grade=${log.grade || 'not recorded'}; sent=${log.sent}`,
  }));
}

const LOG_LIMITS = [
  `The ${MIN_LOGS}-climb threshold is a product choice, not a scientific minimum.`,
  'Logged completion shares depend on difficulty, exposure and route selection; they do not measure ability or diagnose a physical limitation.',
  'Published learning research is background only; it does not validate this app rule.',
] as const;

export function explainFocus(
  focus: Focus,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  const tallies = terrainTallies(logs);
  const comparisons = TERRAINS.map(
    terrain =>
      `${terrain}: ${tallies[terrain].sent}/${tallies[terrain].logged} sent`,
  ).join('; ');
  return {
    summary:
      focus.kind === 'explore'
        ? `Gather logs on ${focus.terrain}.`
        : `Reflect on logged ${focus.terrain} outcomes.`,
    status: logs.some(log => log.sample) ? 'example' : 'app_rule',
    rule: `local-focus-v1: first consider terrains with fewer than ${MIN_LOGS} logs; choose the fewest logs. Otherwise choose the lowest sent/logged share. Ties use slab, vertical, overhang. ${comparisons}.`,
    evidence: climbEvidence(logs),
    sourceIds: ['orth2018'],
    limitations: LOG_LIMITS,
  };
}
export function explainPause(flags: readonly HandFlag[]): DecisionExplanation {
  return {
    summary: flags.length
      ? 'Finger-loading suggestions are paused because you reported soreness.'
      : 'No current finger flags pause suggestions.',
    status: 'app_rule',
    rule: 'local-pause-v1: any current hand flag pauses quests with loadsFingers=true; unflagging removes that software restriction.',
    evidence: flags.map(flag => ({
      id: `${flag.side}/${flag.finger}`,
      label: `Hand flag · ${flag.date}`,
      detail: `${flag.side} ${flag.finger}; reported sore; spots=${
        flag.spots.join(',') || 'not specified'
      }`,
    })),
    sourceIds: ['klauser2002', 'schweizer2001'],
    limitations: [
      'A conservative product eligibility rule, not diagnosis or proven injury prevention.',
      'No flags or a zero report do not establish that climbing is safe.',
      'Hand flags retain the start date and current spots, not original report IDs or pain ratings; photos do not assess internal healing.',
      'Related biomechanics and imaging studies do not validate this pause rule.',
    ],
  };
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
  const focusDecision = explainFocus(focus, logs);
  const pause = explainPause(flags);
  const draft = quest.kind === 'practice' || quest.kind === 'plan';
  return {
    summary: `${draft ? 'Draft quest' : 'App-selected quest'}: ${quest.title}.`,
    status: draft ? 'draft' : focusDecision.status,
    rule: `local-quest-v1: explore focus offers matching log quests; practice focus offers matching terrain or general quests. Completed quests are excluded, flagged-only quests require a flag, loading quests pause with any flag. Order eligible quests: unskipped before skipped; skipped oldest-first; needsFlag check-in priority within the same skip rank; library order breaks remaining ties. Current focus=${
      focus.kind
    }/${focus.terrain}; flags=${flags.length}; loadsFingers=${
      quest.loadsFingers
    }. ${
      selection
        ? 'Completion/skip inputs are shown below.'
        : 'Completion/skip IDs are unavailable to this disclosure.'
    } Task: ${quest.task} Time estimate: ${quest.minutes} minutes. ${
      focusDecision.rule
    }`,
    evidence: [
      ...focusDecision.evidence,
      ...pause.evidence,
      ...(selection
        ? [
            {
              id: 'quest-selection',
              label: 'Current quest controls',
              detail: `completed=${
                selection.completed.join(',') || 'none'
              }; skipped oldest-first=${selection.skipped.join(',') || 'none'}`,
            },
          ]
        : []),
    ],
    sourceIds: draft
      ? quest.kind === 'plan'
        ? ['seifert2017', 'sanchez2012', 'medernach2021']
        : quest.id === 'vertical-quiet-feet'
        ? ['walker2020', 'stien2024']
        : ['orth2018', 'stien2024']
      : quest.kind === 'checkin'
      ? pause.sourceIds
      : focusDecision.sourceIds,
    limitations: [
      ...LOG_LIMITS,
      'Counts, time estimates and selection order are product choices, not proven training doses.',
      ...(draft
        ? [
            'Draft content awaiting review; no direct research validates this exact drill, dose or personalized selection. Related papers provide background only.',
          ]
        : []),
      ...(flags.length ? pause.limitations : []),
    ],
  };
}
function explainTally(
  label: string,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  const sent = logs.filter(log => log.sent).length;
  return {
    summary: `${sent} of ${logs.length} logged ${label} climbs were sent.`,
    status: logs.some(log => log.sample) ? 'example' : 'app_rule',
    rule: `local-tally-v1: filter records by ${label}, count logged and sent=true; raw counts are always shown. Sent share = sent/logged; with fewer than ${MIN_LOGS} records the rate comparison and profile shape are not assessed.`,
    evidence: climbEvidence(logs),
    sourceIds: [],
    limitations: LOG_LIMITS.slice(0, 2),
  };
}

export function explainTerrain(
  terrain: Terrain,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  return explainTally(
    terrain,
    logs.filter(log => log.terrain === terrain),
  );
}
export function explainMovement(
  movement: Movement,
  logs: readonly ClimbLog[],
): DecisionExplanation {
  const tally = explainTally(
    movement,
    logs.filter(log => log.movements.includes(movement)),
  );
  return {
    ...tally,
    rule: `${tally.rule} A climb marked several styles contributes once to each selected style; style totals can overlap.`,
  };
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
  return {
    summary: shoulder
      ? `Estimated image-plane shoulder reach: left ${
          input.leftValue ?? 'unavailable'
        }, right ${input.rightValue ?? 'unavailable'}, mean ${
          input.value ?? 'unavailable'
        } degrees.`
      : `Estimated image-plane leg-spread angle: ${
          input.value ?? 'unavailable'
        } degrees.`,
    status: 'estimate',
    rule: shoulder
      ? 'camera-shoulder-reach-v1: compute the image-plane hip-shoulder-elbow angle on each side and their arithmetic mean. Required hips, shoulders, elbows and wrists must be visible; shoulder-elbow-wrist angles must be at least 160 degrees. Image dimensions correct normalized-coordinate aspect ratio; if absent assume a square plane.'
      : 'camera-leg-spread-v1: find the hip midpoint, form vectors from that midpoint to the left and right ankles, and compute their image-plane angle. Image dimensions correct normalized-coordinate aspect ratio; if absent assume a square plane.',
    evidence: [
      {
        id: 'camera-reading',
        label: 'Current camera output and metadata',
        detail: `value=${input.value ?? 'unavailable'} degrees; ${
          shoulder
            ? `left=${input.leftValue ?? 'unavailable'}; right=${
                input.rightValue ?? 'unavailable'
              }; `
            : ''
        }minimum landmark visibility=${
          input.confidence ?? 'unavailable'
        }; method=${input.method ?? 'unavailable'}; protocol=${
          input.protocol ?? 'unavailable'
        }; model/version=${input.modelVersion ?? 'unavailable'}`,
      },
    ],
    sourceIds: shoulder
      ? ['stenum2021', 'barzegar2024']
      : ['draga2020', 'stenum2021', 'barzegar2024'],
    limitations: [
      shoulder
        ? 'Actual hip/shoulder/elbow/wrist coordinates and image dimensions are unavailable in this disclosure; it cannot reproduce the numeric angles from the output alone.'
        : 'Actual hip/ankle coordinates and image dimensions are unavailable in this disclosure; it cannot reproduce the numeric angle from the output alone.',
      'Model/version is unavailable unless supplied with this reading.',
      'The visibility score is not angle accuracy, an error bound or clinical confidence.',
      shoulder
        ? 'Image-plane geometry is not validated shoulder mobility or true 3D joint range; viewpoint and out-of-plane motion affect it. The 160-degree elbow threshold is a product rule.'
        : 'Image-plane geometry is not validated hip mobility or true 3D joint range; viewpoint, bent knees and out-of-plane motion affect it.',
      'These papers concern different protocols, tasks or hardware and do not validate this app measurement or a flexibility-to-terrain mapping.',
    ],
  };
}

/** Verified primary research; background context does not validate the app. */
export const RESEARCH_SOURCES: readonly ResearchSource[] = [
  {
    id: 'michailov2018',
    title:
      'Reliability and Validity of Finger Strength and Endurance Measurements in Rock Climbing',
    authors:
      'Michail L. Michailov, Jiří Baláš, Stoyan K. Tanev, Hristo S. Andonov, Jan Kodejška, Lee Brown',
    year: 2018,
    url: 'https://doi.org/10.1080/02701367.2018.1441484',
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
    studyType: 'Pose validation against motion capture',
    population:
      '32 healthy adults; 31 walking trials analyzed after one exclusion',
    readingDepth: 'full-text methods/results/discussion',
    supports:
      'Reference comparison and controlled camera geometry for a new metric.',
    limitations: [
      'OpenPose walking differs from MediaPipe climbing and frontal leg spread',
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
      'The effects of five weeks of climbing training, on and off the wall, on climbing specific strength, performance, and training experience in female climbers—A randomized controlled trial',
    authors: 'Kaja Langer, Vidar Andersen, Nicolay Stien',
    year: 2024,
    url: 'https://doi.org/10.1371/journal.pone.0306300',
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
