import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RESEARCH_SOURCES,
  isDecisionFlow,
  type DecisionExplanation,
  type EvidenceRecord,
  type ResearchSource,
} from '@hackyeah/core';
import {
  AppText,
  Disclosure,
  Divider,
  HelpMark,
  Icon,
  PX,
  PixelBox,
  PixelText,
  SampleMark,
  Sheet,
  Tag,
  isIconName,
  useTheme,
  useUiSound,
} from '@hackyeah/ui';
import { DecisionFlow, TeamStamp } from './DecisionFlow';

/** Above this many records, only the first few show until asked. */
const SHORT_INPUTS = 3;

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type HelpProps = {
  /** Names the result: "Focus", "Slab tally". Read as "Why: Focus". */
  label: string;
  explanation: DecisionExplanation;
  /** One sentence to lead with instead of the explanation's summary. */
  takeaway?: string;
  /** The sheet's heading, when the value has a better name than the label. */
  title?: string;
  sources?: readonly ResearchSource[];
};

/**
 * A generated value with a small superscript "?" after it. The question
 * mark opens one explanation sheet: what the result means, the records
 * behind it, the rule in plain words, research where a published claim is
 * made, and its limits. Without children the label itself is shown.
 */
export function DecisionHelp({
  label,
  explanation,
  takeaway,
  title,
  sources = RESEARCH_SOURCES,
  children,
}: HelpProps & { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const name = capital(label);
  return (
    <View style={styles.anchorRow}>
      {children ? (
        <View style={styles.anchor}>{children}</View>
      ) : (
        <AppText variant="caption" muted style={styles.anchor}>
          {name}
        </AppText>
      )}
      <HelpMark
        accessibilityLabel={`Why: ${name}`}
        accessibilityHint="Shows the records, rule and limits behind this"
        onPress={() => setOpen(true)}
      />
      <ExplanationSheet
        visible={open}
        onClose={() => setOpen(false)}
        label={label}
        explanation={explanation}
        takeaway={takeaway}
        title={title}
        sources={sources}
      />
    </View>
  );
}

/** The explanation sheet on its own, for values that open it themselves. */
export function ExplanationSheet({
  visible,
  onClose,
  ...body
}: HelpProps & { visible: boolean; onClose: () => void }) {
  return (
    <Sheet
      visible={visible}
      title="Why?"
      onClose={onClose}
      closeLabel="Close explanation"
    >
      {visible ? <ExplanationBody {...body} /> : null}
    </Sheet>
  );
}

function ExplanationBody({
  label,
  explanation,
  takeaway,
  title,
  sources = RESEARCH_SOURCES,
}: HelpProps) {
  const { rule, sourceIds, limitations, status, flow } = explanation;
  const origin =
    status === 'estimate'
      ? "The formula is the app's own. It has not been checked against a lab measurement."
      : 'Chosen by the team, not taken from a study.';
  return (
    <>
      <PixelText text={capital(title ?? label)} scale={3} heading wrap />
      <AppText>{takeaway ?? explanation.summary}</AppText>
      {status === 'example' ? (
        <SampleMark text="Built from sample data, not your own records." />
      ) : status === 'draft' ? (
        <AppText variant="caption" muted>
          Draft content from the team, not yet reviewed by an expert.
        </AppText>
      ) : null}

      <Divider />
      <Section title="Your inputs">
        <Inputs explanation={explanation} />
      </Section>

      <Divider />
      <Section title="How it works">
        {isDecisionFlow(flow) ? (
          <>
            <DecisionFlow flow={flow} />
            <View style={styles.legend}>
              {flow.nodes.some(node => node.team) ? <TeamStamp /> : null}
              <AppText variant="caption" muted style={styles.anchor}>
                {origin}
              </AppText>
            </View>
            <Disclosure title="Rule in words">
              <RuleLines rule={rule} />
            </Disclosure>
          </>
        ) : (
          <>
            <RuleLines rule={rule} />
            <AppText variant="caption" muted>
              {origin}
            </AppText>
          </>
        )}
      </Section>

      {sourceIds.length > 0 ? (
        <>
          <Divider />
          <Section title="Research">
            <AppText variant="caption" muted>
              Background only. None of these studies tested this app.
            </AppText>
            <ResearchList ids={sourceIds} sources={sources} />
          </Section>
        </>
      ) : null}

      {limitations.length > 0 ? (
        <>
          <Divider />
          <Section title="Limits">
            {limitations.map((limit, index) => (
              <AppText key={index} variant="caption">
                {limit}
              </AppText>
            ))}
          </Section>
        </>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <PixelText text={title} heading />
      {children}
    </View>
  );
}

function RuleLines({ rule }: { rule: string }) {
  return (
    <>
      {rule
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => (
          <AppText key={index} variant="caption">
            {line}
          </AppText>
        ))}
    </>
  );
}

/**
 * What fed the decision: one plain line first, then the records as short
 * rows. Long lists show the first few until "Show all" is pressed.
 */
function Inputs({ explanation }: { explanation: DecisionExplanation }) {
  const { evidence, status, inputSummary } = explanation;
  const [all, setAll] = useState(false);
  if (evidence.length === 0) {
    return (
      <AppText variant="caption">
        {inputSummary ? `${inputSummary} ` : ''}No records were saved with this
        result, so they cannot be shown.
      </AppText>
    );
  }
  const shown =
    all || evidence.length <= SHORT_INPUTS
      ? evidence
      : evidence.slice(0, SHORT_INPUTS);
  const samples = evidence.filter(record => record.view?.sample).length;
  return (
    <>
      <AppText>
        {inputSummary ??
          (evidence.length === 1 ? '1 record.' : `${evidence.length} records.`)}
      </AppText>
      {/* The sheet already says when the whole result is built from
          examples; mark a mix of example and own records once here. */}
      {samples > 0 && status !== 'example' ? (
        <SampleMark
          text={
            samples === evidence.length
              ? 'Example records, not your own.'
              : 'Includes example records.'
          }
        />
      ) : null}
      <View style={styles.records}>
        {shown.map((record, index) => (
          <Record key={`${record.id}-${index}`} record={record} />
        ))}
      </View>
      {evidence.length > SHORT_INPUTS ? (
        <MoreKey
          open={all}
          total={evidence.length}
          onPress={() => setAll(value => !value)}
        />
      ) : null}
    </>
  );
}

/** "Show all 6" under a folded list, "Show fewer" once it is open. */
function MoreKey({
  open,
  total,
  onPress,
}: {
  open: boolean;
  total: number;
  onPress: () => void;
}) {
  const c = useTheme().colors;
  const playSound = useUiSound();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show all ${total} records`}
      accessibilityState={{ expanded: open }}
      aria-expanded={open}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={styles.more}
    >
      {({ pressed }) => (
        <>
          <PixelBox
            fill={c.surface}
            outline={c.outline}
            shade={c.surfaceShade}
            shadow={c.backgroundDeep}
            lift={pressed ? 0 : PX}
            style={pressed ? styles.sunk : null}
            contentStyle={styles.key}
          >
            <PixelText
              text={open ? '-' : '+'}
              color={c.text}
              accessible={false}
            />
          </PixelBox>
          <PixelText
            text={open ? 'Show fewer' : `Show all ${total}`}
            accessible={false}
          />
        </>
      )}
    </Pressable>
  );
}

/**
 * One record as a short row: a badge (grade, distance) or an icon, two lines
 * of words, the date and an outcome stamp. Records without a drawn form,
 * such as server snapshots, show their label and detail. Either way a
 * screen reader hears the full label and detail.
 */
function Record({ record }: { record: EvidenceRecord }) {
  const c = useTheme().colors;
  const { view } = record;
  const spoken = `${record.label}. ${record.detail}`;
  if (!view) {
    return (
      <View
        accessible
        accessibilityLabel={spoken}
        testID={`record-${record.id}`}
        style={styles.plain}
      >
        <AppText variant="caption" style={styles.strong}>
          {record.label}
        </AppText>
        {record.detail ? (
          <AppText variant="caption">{record.detail}</AppText>
        ) : null}
      </View>
    );
  }
  const icon = isIconName(view.icon) ? view.icon : undefined;
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      testID={`record-${record.id}`}
      style={styles.record}
    >
      <View
        style={[
          styles.badge,
          { backgroundColor: c.surfaceShade, borderColor: c.outline },
        ]}
      >
        {view.badge ? (
          <>
            <PixelText
              text={view.badge}
              scale={view.badge.length > 2 ? 2 : 3}
              accessible={false}
            />
            {view.badgeNote ? (
              <AppText variant="caption" style={styles.badgeNote}>
                {view.badgeNote}
              </AppText>
            ) : null}
          </>
        ) : icon ? (
          <Icon name={icon} scale={3} />
        ) : null}
      </View>
      <View style={styles.grow}>
        <View style={styles.titleRow}>
          {view.badge && icon ? <Icon name={icon} /> : null}
          <AppText variant="caption" style={[styles.strong, styles.anchor]}>
            {view.title}
          </AppText>
        </View>
        {view.note ? <AppText variant="caption">{view.note}</AppText> : null}
        {view.when ? (
          <AppText variant="caption" muted>
            {view.when}
          </AppText>
        ) : null}
      </View>
      {view.outcome ? (
        <View>
          <Tag
            text={view.outcome.text}
            tone={view.outcome.done ? 'new' : 'muted'}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * One plain takeaway and a short citation per study, with the full study
 * details behind a single "Study details" control. The paper only opens
 * when its title is pressed.
 */
export function ResearchList({
  ids,
  sources = RESEARCH_SOURCES,
}: {
  /** Which sources to show, in order. All of `sources` when left out. */
  ids?: readonly string[];
  sources?: readonly ResearchSource[];
}) {
  const wanted = ids ?? sources.map(source => source.id);
  const found = wanted
    .map(id => sources.find(source => source.id === id))
    .filter((source): source is ResearchSource => source !== undefined);
  const missing = wanted.filter(id => !sources.some(s => s.id === id));
  return (
    <View style={styles.records}>
      {found.map(source => (
        <Citation key={source.id} source={source} />
      ))}
      {missing.map(id => (
        <AppText key={id} variant="caption">
          A cited study ({id}) is not in the app's library, so its details
          cannot be shown.
        </AppText>
      ))}
      {found.length > 0 ? (
        <Disclosure title="Study details">
          {found.map(source => (
            <StudyDetails key={source.id} source={source} />
          ))}
        </Disclosure>
      ) : null}
    </View>
  );
}

/** "Sanchez et al., 2012" from the full author list. */
function shortAuthors(source: ResearchSource): string {
  const authors = source.authors.split(',');
  const surname = authors[0].trim().split(' ').pop();
  return `${surname}${authors.length > 1 ? ' et al.' : ''}, ${source.year}`;
}

function Citation({ source }: { source: ResearchSource }) {
  const [error, setError] = useState(false);
  const open = async () => {
    setError(false);
    try {
      await Linking.openURL(source.url);
    } catch {
      setError(true);
    }
  };
  return (
    <View style={styles.citation}>
      <AppText variant="caption">{source.finding}</AppText>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open study: ${source.title}`}
        onPress={open}
      >
        <AppText variant="caption" muted>
          {shortAuthors(source)}.{' '}
          <Text style={styles.link}>{source.title}</Text>
        </AppText>
      </Pressable>
      {error ? (
        <AppText variant="caption" accessibilityRole="alert">
          Could not open the study. Try again.
        </AppText>
      ) : null}
    </View>
  );
}

function StudyDetails({ source }: { source: ResearchSource }) {
  return (
    <View style={styles.citation}>
      <AppText variant="caption" style={styles.strong}>
        {source.title}
      </AppText>
      <AppText variant="caption">
        {source.authors}, {source.year}.
      </AppText>
      <AppText variant="caption">
        {source.studyType}. {source.population}.
      </AppText>
      <AppText variant="caption">Can support: {source.supports}</AppText>
      {source.limitations.map((limit, index) => (
        <AppText key={index} variant="caption">
          Limit: {limit}.
        </AppText>
      ))}
      <AppText variant="caption" muted>
        We read: {source.readingDepth}. Checked {source.verifiedAt}.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  anchorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  anchor: { flexShrink: 1 },
  grow: { flex: 1 },
  section: { gap: 8 },
  records: { gap: 10 },
  plain: { gap: 2 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 46,
    minHeight: 46,
    borderWidth: PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNote: { lineHeight: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  key: {
    width: 26,
    height: 26,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunk: { marginTop: PX },
  strong: { fontWeight: '800' },
  citation: { gap: 4 },
  link: { textDecorationLine: 'underline' },
});
