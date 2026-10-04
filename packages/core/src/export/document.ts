/**
 * Builds one reader's document from a snapshot. Each section is a small
 * function; the audience definition decides which ones run and in what
 * order. Text is plain and short, and every number carries a label saying
 * where it came from.
 */
import { RESEARCH_SOURCES, type ResearchSource } from '../evidence';
import {
  AUDIENCES,
  AUDIENCE_ORDER,
  DRAFT_LINE,
  NOT_RECORDED,
  PAUSE_LINE,
  XP_LINE,
  sectionsFor,
} from './audiences';
import { createLabeler, provenanceOfAll, type Labeler } from './provenance';
import {
  WEEKDAYS,
  activeDays,
  beforeAndSince,
  byKind,
  daysBetween,
  longDate,
  longest,
  median,
  perWeek,
  restDays,
  round1,
  roundNice,
  sum,
  weekdayCounts,
  weeklyRows,
} from './stats';
import type {
  AudienceId,
  Block,
  ExportChoices,
  ExportDocument,
  ExportSection,
  ExportSession,
  ExportSnapshot,
  SectionId,
} from './types';

/** Longest typed reason or question kept. */
export const MAX_TYPED = 200;

/** One line, trimmed and capped. Typed text is never saved anywhere. */
export function cleanTyped(text: string | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TYPED);
}

type Ctx = Readonly<{
  s: ExportSnapshot;
  audience: AudienceId;
  choices: ExportChoices;
  tag: Labeler['tag'];
  /** Picked questions, in order, plus the typed one. */
  questions: readonly string[];
  /** Sections in this document, so notes mention only what is shown. */
  included: ReadonlySet<SectionId>;
}>;

/** "1 climbing day", "1.5 climbing days". */
const perWeekDays = (days: number, span: number) => {
  const n = round1(perWeek(days, span));
  return `${n} ${n === '1' ? 'climbing day' : 'climbing days'}`;
};

/** "+10", "-2.5": a change, never "better" or "worse". */
const signed = (n: number) => `${n > 0 ? '+' : ''}${round1(n)}`;

const text = (t: string): Block => ({ kind: 'text', text: t });
const list = (items: readonly string[], ordered = false): Block => ({
  kind: 'list',
  items,
  ordered,
});
const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const lower = (t: string) =>
  // Keep codes like "A2" as they are.
  /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
const agoText = (days: number) =>
  days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
const kindName = (s: ExportSnapshot, kind: string) =>
  s.words.kindName[kind] ?? kind;
const isClimb = (s: ExportSnapshot) => s.mode === 'climb';

function periodDays(s: ExportSnapshot): number {
  return daysBetween(s.period.from, s.period.to);
}

/** "In the last 4 weeks", "So far". */
function whenText(s: ExportSnapshot): string {
  return s.period.weeks === null
    ? 'So far'
    : `In the last ${s.period.weeks} weeks`;
}

function sessionLine(ctx: Ctx, x: ExportSession): string {
  const { s, tag } = ctx;
  if (isClimb(s)) {
    return `${x.date}, ${lower(kindName(s, x.kind))}, ${
      x.grade ?? 'grade not recorded'
    }, ${x.styles.join(' and ') || 'style not recorded'}${
      x.holds.length ? `, holds: ${x.holds.join(', ')}` : ''
    }, ${x.done ? s.words.doneWord : s.words.notDoneWord}${tag(x.provenance)}`;
  }
  return `${x.date}, ${lower(kindName(s, x.kind))}, ${lower(
    s.words.placeName[x.place ?? ''] ?? x.place ?? '',
  )}, ${x.distance} ${x.unit}, ${x.minutes} min${
    x.pace ? `, ${x.pace}` : ''
  }, ${x.done ? s.words.doneWord : s.words.notDoneWord}${tag(x.provenance)}`;
}

const SECTIONS: Readonly<
  Record<SectionId, (ctx: Ctx) => ExportSection | null>
> = {
  reason: ctx => {
    const reason = cleanTyped(ctx.choices.reason);
    return reason
      ? { id: 'reason', heading: 'Why I am here', blocks: [text(reason)] }
      : null;
  },

  activity: ctx => {
    const { s, tag } = ctx;
    const w = s.words;
    const n = s.sessions.length;
    const label = () => tag(provenanceOfAll(s.sessions));
    if (ctx.audience === 'family') {
      const line =
        n === 0
          ? `${whenText(s)} I did not log any ${w.sessions}.`
          : `${whenText(s)} I logged ${plural(n, w.session, w.sessions)}${
              s.period.weeks === null
                ? '.'
                : `, about ${round1(perWeek(n, periodDays(s)))} a week.`
            }`;
      return { id: 'activity', heading: '', blocks: [text(line)] };
    }
    const heading = ctx.audience === 'you' ? 'Summary' : 'Activity';
    if (n === 0) {
      return {
        id: 'activity',
        heading,
        blocks: [text(`No ${w.sessions} logged in this period.`)],
      };
    }
    const days = activeDays(s.sessions);
    const span = periodDays(s);
    const lines: string[] = [];
    if (isClimb(s)) {
      lines.push(
        `I logged ${plural(n, 'climb', 'climbs')} on ${plural(
          days,
          'climbing day',
          'climbing days',
        )}, about ${perWeekDays(days, span)} a week.${label()}`,
        'Time is not recorded for climbs.',
      );
    } else {
      lines.push(
        `I logged ${plural(n, w.session, w.sessions)} on ${plural(
          days,
          'day',
          'days',
        )}, about ${round1(perWeek(n, span))} a week.${label()}`,
        `Moving time: about ${roundNice(
          perWeek(sum(s.sessions.map(x => x.minutes)), span),
        )} minutes a week. Intensity is not recorded.`,
        `Distance: about ${roundNice(
          perWeek(sum(s.sessions.map(x => x.distance)), span),
        )} ${w.unit} a week.`,
      );
    }
    const notDone = s.sessions.filter(x => !x.done).length;
    lines.push(`${notDone} of ${n} ${w.sessions} were ${w.notDoneWord}.`);
    return { id: 'activity', heading, blocks: [text(lines.join('\n'))] };
  },

  otherSports: ctx => {
    const { s, tag } = ctx;
    if (s.otherSports.length === 0) {
      return null;
    }
    return {
      id: 'otherSports',
      heading: ctx.audience === 'family' ? '' : 'My other sports',
      blocks: [
        list(
          s.otherSports.map(o =>
            o.count === 0
              ? `${o.modeName}: no ${o.sessions} logged in this period.`
              : `${o.modeName}: ${plural(o.count, o.session, o.sessions)} on ${plural(
                  o.activeDays,
                  'day',
                  'days',
                )}.${ctx.audience === 'family' ? '' : tag(o.provenance)}`,
          ),
        ),
      ],
    };
  },

  weekly: ctx => {
    const { s, tag } = ctx;
    const total = s.period.weeks ?? Math.ceil(periodDays(s) / 7);
    const shown = Math.min(total, 12);
    const weeks = weeklyRows(s.sessions, s.period.to, shown);
    const head = isClimb(s)
      ? ['Week ending', 'Climbs', capital(s.words.doneWord), 'Days']
      : [
          'Week ending',
          capital(s.words.sessions),
          'Days',
          'Minutes',
          `Distance (${s.words.unit})`,
        ];
    const rows = weeks.map(wk =>
      isClimb(s)
        ? [
            wk.end,
            String(wk.sessions.length),
            String(wk.sessions.filter(x => x.done).length),
            String(activeDays(wk.sessions)),
          ]
        : [
            wk.end,
            String(wk.sessions.length),
            String(activeDays(wk.sessions)),
            String(sum(wk.sessions.map(x => x.minutes))),
            round1(sum(wk.sessions.map(x => x.distance))),
          ],
    );
    return {
      id: 'weekly',
      heading: 'Week by week',
      blocks: [
        { kind: 'table', head, rows },
        text(
          `Totals added up by the app from my logs.${tag('app_rule')}${
            shown < total ? ` Only the last ${shown} weeks are shown.` : ''
          }`,
        ),
      ],
    };
  },

  effort: () => ({
    id: 'effort',
    heading: 'Effort',
    blocks: [
      text(
        'Effort ratings are not recorded in this app. This sheet shows what I did, not how hard it felt.',
      ),
    ],
  }),

  byKind: ctx => {
    const { s, tag } = ctx;
    const counts = byKind(s.sessions, s.kinds);
    const blocks: Block[] = [
      {
        kind: 'table',
        head: [s.words.kindLabel, 'Logged', capital(s.words.doneWord), 'Share'],
        rows: counts.map(c => [
          kindName(s, c.kind),
          String(c.logged),
          String(c.done),
          c.logged >= 3
            ? `${Math.round((c.done / c.logged) * 100)}%`
            : 'not enough logs to compare',
        ]),
      },
      text(
        `A share is shown once a type has 3 logs. That is an app threshold, not a research one.${tag(
          'app_rule',
        )}`,
      ),
    ];
    if (isClimb(s) && s.sessions.length > 0) {
      const tallyOf = (values: readonly string[]) => {
        const map = new Map<string, number>();
        for (const v of values) {
          map.set(v, (map.get(v) ?? 0) + 1);
        }
        return [...map.entries()].map(([k, v]) => `${k} (${v})`).join(', ');
      };
      const items = [
        `Styles logged: ${
          tallyOf(s.sessions.flatMap(x => x.styles)) || 'none recorded'
        }.`,
        `Hold types logged: ${
          tallyOf(s.sessions.flatMap(x => x.holds)) || 'none recorded'
        }.`,
        ...s.kinds.map(k => {
          const grades = s.sessions
            .filter(x => x.kind === k && x.grade)
            .map(x => x.grade as string);
          return `Grades on ${lower(kindName(s, k))}, as I wrote them: ${
            tallyOf(grades) || 'none'
          }.`;
        }),
      ];
      blocks.push(list(items));
    }
    return {
      id: 'byKind',
      heading: `By ${lower(s.words.kindLabel)}`,
      blocks,
    };
  },

  recent: ctx => {
    const { s } = ctx;
    const all = ctx.audience === 'you';
    const shown = all ? s.sessions : s.sessions.slice(0, 15);
    if (shown.length === 0) {
      return {
        id: 'recent',
        heading: `Recent ${s.words.sessions}`,
        blocks: [text(`No ${s.words.sessions} logged in this period.`)],
      };
    }
    return {
      id: 'recent',
      heading: all
        ? `All ${s.words.sessions} in this period`
        : `Recent ${s.words.sessions}`,
      blocks: [
        list(shown.map(x => sessionLine(ctx, x))),
        ...(shown.length < s.sessions.length
          ? [
              text(
                `The latest ${shown.length} of ${s.sessions.length} are shown.`,
              ),
            ]
          : []),
      ],
    };
  },

  pattern: ctx => {
    const { s, tag } = ctx;
    const climb = isClimb(s);
    // Climbing counts days, because a day holds many climbs.
    const counts = weekdayCounts(
      climb
        ? [...new Set(s.sessions.map(x => x.date))].map(
            date => ({ date }) as ExportSession,
          )
        : s.sessions,
    );
    const lines = [
      `${climb ? 'Climbing days' : capital(s.words.sessions)} per weekday: ${WEEKDAYS.map(
        (d, i) => `${d} ${counts[i]}`,
      ).join(', ')}.${tag(provenanceOfAll(s.sessions))}`,
    ];
    if (climb) {
      lines.push('Time is not recorded for climbs.');
    } else {
      for (const k of s.kinds) {
        const m = median(
          s.sessions
            .filter(x => x.kind === k && x.minutes !== null)
            .map(x => x.minutes as number),
        );
        if (m !== null) {
          lines.push(
            `Typical ${lower(kindName(s, k))} ${s.words.session}: about ${Math.round(
              m,
            )} minutes.`,
          );
        }
      }
    }
    return {
      id: 'pattern',
      heading: 'Training pattern',
      blocks: [text(lines.join('\n'))],
    };
  },

  longest: ctx => {
    const { s } = ctx;
    const top = longest(s.sessions, 3);
    return {
      id: 'longest',
      heading: `Longest ${s.words.sessions}`,
      blocks: [
        top.length
          ? list(top.map(x => sessionLine(ctx, x)))
          : text(`No ${s.words.sessions} logged in this period.`),
      ],
    };
  },

  restDays: ctx => {
    const { s, tag } = ctx;
    return {
      id: 'restDays',
      heading: 'Rest days',
      blocks: [
        text(
          `${restDays(s.sessions, s.period.from, s.period.to)} of ${periodDays(
            s,
          )} days had no logged ${
            isClimb(s) ? 'climbing' : s.words.session
          }.${tag('app_rule')}\nOnly logged sessions count. Other activity is not recorded.`,
        ),
      ],
    };
  },

  goal: ctx => {
    const { s, tag } = ctx;
    return {
      id: 'goal',
      heading: 'My goal',
      blocks: [
        text(
          s.about
            ? `My goal from setup: ${s.about.goal}.${tag(
                s.demoProfile ? 'example' : 'entered',
              )}`
            : 'No goal recorded. Setup was not finished.',
        ),
      ],
    };
  },

  notRecorded: () => ({
    id: 'notRecorded',
    heading: 'Not in this record',
    blocks: [text(NOT_RECORDED)],
  }),

  flags: ctx => {
    const { s, tag, audience } = ctx;
    if (audience === 'family') {
      return {
        id: 'flags',
        heading: '',
        blocks: [
          text(
            s.flags.length === 0
              ? 'Nothing is marked sore right now.'
              : [
                  ...s.flags.map(
                    f =>
                      `My ${lower(f.where)} has been sore since ${longDate(
                        f.since,
                      )}.`,
                  ),
                  'The app pauses some quests while it is sore.',
                ].join('\n'),
          ),
        ],
      };
    }
    if (s.flags.length === 0) {
      return {
        id: 'flags',
        heading: 'What is sore',
        blocks: [text('No sore spots flagged.')],
      };
    }
    const detailed = audience === 'physio' || audience === 'you';
    const items = s.flags.map(
      f =>
        `${f.where}${
          f.spots.length
            ? `, ${f.spots.join(', ')}`
            : isClimb(s) && detailed
            ? ', not sure where'
            : ''
        }, first flagged ${f.since} (${agoText(f.days)}).${tag(f.provenance)}`,
    );
    return {
      id: 'flags',
      heading: 'What is sore',
      blocks: [
        list(items),
        text(
          audience === 'physio'
            ? 'Where I marked pain, not a diagnosis. Pain ratings are not kept with the flag. I will tell you how it feels.'
            : 'Where I marked pain, not a diagnosis. Pain ratings are not kept with the flag.',
        ),
      ],
    };
  },

  loadAroundFlags: ctx => {
    const { s, tag, audience } = ctx;
    if (s.flags.length === 0) {
      return null;
    }
    const w = s.words;
    const blocks: Block[] = [];
    for (const f of s.flags) {
      const { before, after, afterDays } = beforeAndSince(
        s.allSessions,
        f.since,
        s.period.to,
      );
      if (audience !== 'physio') {
        blocks.push(
          text(
            `Since my ${lower(f.where)} was flagged: ${plural(
              after.length,
              w.session,
              w.sessions,
            )}. In the 4 weeks before: ${plural(
              before.length,
              w.session,
              w.sessions,
            )}.${tag('app_rule')}`,
          ),
        );
        continue;
      }
      const rows: string[][] = [
        [capital(w.sessions), String(before.length), String(after.length)],
      ];
      if (!isClimb(s)) {
        rows.push(
          [
            'Minutes',
            String(sum(before.map(x => x.minutes))),
            String(sum(after.map(x => x.minutes))),
          ],
          [
            `Distance (${w.unit})`,
            round1(sum(before.map(x => x.distance))),
            round1(sum(after.map(x => x.distance))),
          ],
        );
      }
      for (const k of s.kinds) {
        rows.push([
          kindName(s, k),
          String(before.filter(x => x.kind === k).length),
          String(after.filter(x => x.kind === k).length),
        ]);
      }
      blocks.push(
        text(`${f.where}, first flagged ${f.since}.${tag('app_rule')}`),
        {
          kind: 'table',
          head: [
            '',
            '4 weeks before',
            `Since (${plural(afterDays, 'day', 'days')})`,
          ],
          rows,
        },
      );
    }
    blocks.push(
      text('Plain counts from my logs. No score is worked out from them.'),
    );
    return {
      id: 'loadAroundFlags',
      heading: 'Before and since',
      blocks,
    };
  },

  grip: ctx => {
    const { s, tag } = ctx;
    const crimps = (xs: readonly ExportSession[]) =>
      `${xs.filter(x => x.holds.includes('crimp')).length} of ${xs.length}`;
    const lines =
      s.flags.length === 0
        ? [
            `Climbs with crimps logged in this period: ${crimps(
              s.sessions,
            )}.${tag('app_rule')}`,
          ]
        : s.flags.flatMap(f => {
            const { before, after } = beforeAndSince(
              s.allSessions,
              f.since,
              s.period.to,
            );
            return [
              `Climbs with crimps in the 4 weeks before my ${lower(
                f.where,
              )} was flagged: ${crimps(before)}. Since: ${crimps(after)}.${tag(
                'app_rule',
              )}`,
            ];
          });
    lines.push(
      'Hold types are what I logged. They give context, not a cause.',
    );
    return { id: 'grip', heading: 'Grip context', blocks: [text(lines.join('\n'))] };
  },

  measurements: ctx => {
    const { s, tag } = ctx;
    if (s.measurements.length === 0) {
      return {
        id: 'measurements',
        heading: 'My measurements',
        blocks: [text('No measurements or home tests recorded.')],
      };
    }
    const items = s.measurements.map(m => {
      const side =
        m.side === 'both'
          ? ', both hands'
          : m.side && m.metric === 'finger_force'
          ? `, ${m.side} hand`
          : '';
      const change =
        m.previous && m.previous.value !== m.value
          ? ` Changed by ${signed(m.value - m.previous.value)} ${
              m.display.split(' ').slice(1).join(' ') || m.unit
            } since ${m.previous.date}, same method and setup.`
          : m.previous
          ? ` Same as on ${m.previous.date}, same method and setup.`
          : '';
      return `${m.date}, ${m.name}${side}: ${m.display}.${
        m.setup ? ` ${capital(m.setup)}.` : ''
      } Method: ${m.method}.${tag(m.provenance)}${change}`;
    });
    const blocks: Block[] = [list(items)];
    if (s.measurements.some(m => m.method === 'camera estimate')) {
      blocks.push(
        text(
          'Camera estimates are angles in a flat image, not measured joint ranges.',
        ),
      );
    }
    if (s.measurements.some(m => m.metric === 'finger_force')) {
      blocks.push(
        text(
          'Finger strength depends on the grip, edge, arm position and gauge, so each reading lists its setup.',
        ),
      );
    }
    return { id: 'measurements', heading: 'My measurements', blocks };
  },

  paused: ctx => {
    const { s, tag } = ctx;
    const lines =
      s.flags.length === 0
        ? ['Nothing is flagged, so the app pauses nothing.']
        : [
            `While something is flagged, the app pauses ${s.words.pausedWhat}.${tag(
              'app_rule',
            )}`,
            ...(s.paused.length ? [`Paused now: ${s.paused.join(', ')}.`] : []),
            PAUSE_LINE,
          ];
    return {
      id: 'paused',
      heading: 'Paused by the app',
      blocks: [text(lines.join('\n'))],
    };
  },

  plan: ctx => {
    const { s, tag, audience } = ctx;
    if (audience === 'family') {
      return s.quest
        ? {
            id: 'plan',
            heading: '',
            blocks: [text(`My next step: ${s.quest.title}.`)],
          }
        : null;
    }
    const blocks: Block[] = [
      text(`Focus: ${s.focus.name}.${tag('app_rule')} ${s.focus.summary}`),
    ];
    if (audience === 'you') {
      blocks.push(list(s.focus.rule), text(s.focus.limitations.join(' ')));
    }
    if (s.quest) {
      blocks.push(
        text(
          `Quest: ${s.quest.title}. ${s.quest.task} About ${s.quest.minutes} minutes.${tag(
            'app_rule',
          )}${s.quest.draft ? `\n${DRAFT_LINE}` : ''}`,
        ),
      );
    } else {
      blocks.push(text('No quest is waiting for this focus right now.'));
    }
    return { id: 'plan', heading: 'Plan now', blocks };
  },

  progress: ctx => {
    const { s, tag } = ctx;
    const n = s.progress.completedQuestIds.length;
    return {
      id: 'progress',
      heading: 'Progress in the app',
      blocks: [
        text(
          `Level ${s.progress.level}, ${s.progress.xp} XP, ${plural(
            n,
            'quest',
            'quests',
          )} done.${tag('app_rule')}\n${XP_LINE}`,
        ),
      ],
    };
  },

  about: ctx => {
    const { s, tag } = ctx;
    const a = s.about;
    const label = () => tag(s.demoProfile ? 'example' : 'entered');
    return {
      id: 'about',
      heading: 'Setup answers',
      blocks: [
        a
          ? list([
              `Places: ${a.places.join(', ') || 'none picked'}.${label()}`,
              `Experience: ${a.experience}.`,
              `Usual grade: ${a.usualGrade}.`,
              `Goal: ${a.goal}.`,
              `Home tests skipped in setup: ${
                a.skippedTests.join(', ') || 'none'
              }.`,
              'No app connections are active in this build.',
            ])
          : text(
              'Setup was not finished, so there are no setup answers. No app connections are active in this build.',
            ),
      ],
    };
  },

  provenance: ctx => {
    const { s } = ctx;
    const w = s.words;
    const lines = [`${capital(w.sessions)}: ${w.logHow}`];
    if (s.flags.length && ctx.included.has('flags')) {
      lines.push(
        `Sore spots: I marked them on the ${w.bodyTab} tab. The app keeps the side, the place and the first date.`,
      );
    }
    if (s.measurements.length && ctx.included.has('measurements')) {
      lines.push(
        'Measurements: typed in from my own tape or gauge, timed or counted by the app, or estimated by the camera. Each one says which.',
      );
    }
    lines.push(
      `Weekly totals, counts${isClimb(s) ? '' : ', pace'} and focus: worked out by the app from those ${w.sessions} with fixed rules.`,
    );
    if (s.demoProfile) {
      lines.push('The demo profile is made-up data for trying the app.');
    } else if (s.containsExamples) {
      lines.push(
        `Example ${w.sessions} came with the app so it is not empty on first use.`,
      );
    }
    return {
      id: 'provenance',
      heading: 'How was this data created?',
      blocks: [text(lines.join('\n'))],
    };
  },

  questions: ctx => {
    if (ctx.questions.length === 0) {
      return null;
    }
    return {
      id: 'questions',
      heading: AUDIENCES[ctx.audience].questionsHeading,
      blocks: [list(ctx.questions, ctx.audience !== 'family')],
    };
  },

  afterVisit: ctx => {
    const who =
      ctx.audience === 'physio'
        ? 'physio'
        : ctx.audience === 'nutrition'
        ? 'dietitian'
        : 'doctor';
    return {
      id: 'afterVisit',
      heading: 'After the visit',
      blocks: [
        { kind: 'blank', label: `What the ${who} said, in my own words:` },
        { kind: 'blank', label: 'What I will do next:' },
      ],
    };
  },

  whyLayout: ctx => {
    const ids =
      ctx.audience === 'you'
        ? [
            ...new Set(
              AUDIENCE_ORDER.flatMap(id => AUDIENCES[id].sourceIds),
            ),
          ]
        : AUDIENCES[ctx.audience].sourceIds;
    const sources = ids
      .map(id => RESEARCH_SOURCES.find(src => src.id === id))
      .filter((src): src is ResearchSource => src !== undefined);
    return {
      id: 'whyLayout',
      heading: ctx.audience === 'you' ? 'Why these formats' : 'Why this layout',
      blocks: [
        text(
          'Research behind the layout of these sheets. None of these studies tested this app.',
        ),
        list(sources.map(citation)),
      ],
    };
  },
};

/** "Sansoni et al., 2015" from the author list. */
export function shortCitation(source: ResearchSource): string {
  const authors = source.authors.split(',');
  const surname = authors[0].trim().split(' ').pop();
  return `${surname}${authors.length > 1 ? ' et al.' : ''}, ${source.year}`;
}

function citation(source: ResearchSource): string {
  const depth = source.readingDepth.toLowerCase().startsWith('abstract')
    ? ' Read at abstract level.'
    : '';
  return `${shortCitation(source)}: ${source.finding}${depth} ${source.url}`;
}

/** The questions that will be printed: picked prompts, then the typed one. */
export function pickedQuestions(
  audience: AudienceId,
  s: ExportSnapshot,
  choices: ExportChoices,
): string[] {
  const offered = AUDIENCES[audience].questions(s);
  const picked = choices.questions
    ? choices.questions.filter(q => offered.some(o => o.text === q))
    : offered.filter(o => o.defaultOn).map(o => o.text);
  const typed = cleanTyped(choices.customQuestion);
  return typed ? [...picked, typed] : picked;
}

/** Whether a section is in the document: locked, chosen, or its default. */
export function isIncluded(
  audience: AudienceId,
  id: SectionId,
  choices: ExportChoices,
  mode: ExportSnapshot['mode'],
): boolean {
  const def = sectionsFor(AUDIENCES[audience], mode).find(d => d.id === id);
  if (!def) {
    return false;
  }
  return def.locked ? true : choices.include?.[id] ?? def.defaultOn;
}

const TITLE: Readonly<Record<AudienceId, (mode: string) => string>> = {
  doctor: m => `${m} record for my doctor`,
  physio: m => `${m} record for my physio`,
  coach: m => `${m} training for my coach`,
  nutrition: m => `${m} training for my dietitian`,
  family: m => `An update from my ${m.toLowerCase()} app`,
  you: m => `My ${m.toLowerCase()} record`,
  data: m => `${m} data file`,
};

export function buildDocument(
  audience: AudienceId,
  s: ExportSnapshot,
  choices: ExportChoices = {},
): ExportDocument {
  const labeler = createLabeler();
  const defs = sectionsFor(AUDIENCES[audience], s.mode).filter(def =>
    isIncluded(audience, def.id, choices, s.mode),
  );
  const ctx: Ctx = {
    s,
    audience,
    choices,
    tag: labeler.tag,
    questions: pickedQuestions(audience, s, choices),
    included: new Set(defs.map(def => def.id)),
  };
  const sections = defs
    .map(def => SECTIONS[def.id](ctx))
    .filter((x): x is ExportSection => x !== null);

  const family = audience === 'family';
  const period =
    s.period.weeks === null
      ? `Covers everything logged, ${s.period.from} to ${s.period.to}.`
      : `Covers ${s.period.from} to ${s.period.to} (${s.period.weeks} weeks).`;
  const banner = s.demoProfile
    ? 'Example data. This record is made-up demo data, not about a real person.'
    : s.containsExamples
    ? family
      ? 'Some of this is example data that came with the app.'
      : 'Some entries are example data. They are marked [example].'
    : null;
  if (banner && !family && !s.demoProfile) {
    labeler.tag('example');
  }
  const intro = [
    ...(family ? [] : [`Made ${s.generatedOn} in Climbing Monkey. ${period}`]),
    ...(banner ? [banner] : []),
    ...(family ? [] : [AUDIENCES[audience].notThis]),
  ];
  return {
    title: TITLE[audience](s.words.modeName),
    intro,
    sections,
    closing: family ? [AUDIENCES.family.notThis] : [],
    legend: family ? [] : labeler.legend(),
  };
}
