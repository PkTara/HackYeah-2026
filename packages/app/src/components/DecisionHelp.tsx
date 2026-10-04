import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RESEARCH_SOURCES,
  type DecisionExplanation,
  type ResearchSource,
} from '@hackyeah/core';
import {
  AppText,
  Disclosure,
  Divider,
  HelpMark,
  PixelText,
  SampleMark,
  Sheet,
} from '@hackyeah/ui';

/** Above this many records, "Your inputs" starts folded away. */
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
  const { evidence, rule, sourceIds, limitations, status } = explanation;
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
      {evidence.length > SHORT_INPUTS ? (
        <Disclosure
          title="Your inputs"
          note={`${evidence.length} records`}
          accessibilityLabel={`Your inputs, ${evidence.length} records`}
        >
          <Records evidence={evidence} />
        </Disclosure>
      ) : (
        <Section title="Your inputs">
          {evidence.length === 0 ? (
            <AppText variant="caption">
              No records were saved with this result, so they cannot be shown.
            </AppText>
          ) : (
            <Records evidence={evidence} />
          )}
        </Section>
      )}

      <Divider />
      <Section title="How it works">
        {rule
          .split('\n')
          .filter(line => line.trim())
          .map((line, index) => (
            <AppText key={index} variant="caption">
              {line}
            </AppText>
          ))}
        <AppText variant="caption" muted>
          {status === 'estimate'
            ? "The formula is the app's own. It has not been checked against a lab measurement."
            : 'Chosen by the team, not taken from a study.'}
        </AppText>
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

function Records({ evidence }: { evidence: DecisionExplanation['evidence'] }) {
  return (
    <View style={styles.records}>
      {evidence.map((record, index) => (
        <View key={`${record.id}-${index}`} style={styles.record}>
          <View style={styles.recordHead}>
            <AppText variant="caption" style={styles.strong}>
              {record.label}
            </AppText>
            <AppText variant="caption" muted>
              Ref {record.id}
            </AppText>
          </View>
          {record.detail ? (
            <AppText variant="caption">{record.detail}</AppText>
          ) : null}
        </View>
      ))}
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
  section: { gap: 8 },
  records: { gap: 12 },
  record: { gap: 2 },
  recordHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  strong: { fontWeight: '800' },
  citation: { gap: 4 },
  link: { textDecorationLine: 'underline' },
});
