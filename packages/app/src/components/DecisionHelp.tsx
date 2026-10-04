import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  RESEARCH_SOURCES,
  type DecisionExplanation,
  type ResearchSource,
} from '@hackyeah/core';
import { AppText, ToneContext, useTheme } from '@hackyeah/ui';
import { ExpandableTray } from './ExpandableTray';

/** Inline disclosures keep the associated result visible on native and web. */
export function DecisionHelp({
  label,
  explanation,
  sources = RESEARCH_SOURCES,
  children,
  takeaway,
}: {
  label: string;
  explanation: DecisionExplanation;
  sources?: readonly ResearchSource[];
  children?: ReactNode;
  takeaway?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { colors: c } = useTheme();
  const readingIsBackground =
    explanation.status === 'app_rule' || explanation.status === 'example';
  const research = explanation.sourceIds.map(id => {
    const source = sources.find(item => item.id === id);
    return source ? (
      <ResearchPaper key={id} source={source} />
    ) : (
      <AppText key={id}>Source unavailable: {id}</AppText>
    );
  });
  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        {children ? (
          <View style={styles.anchor}>{children}</View>
        ) : (
          <AppText variant="caption">{label}</AppText>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Why ${label}?`}
          accessibilityHint="Shows the inputs, rule, research and limits"
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() => setExpanded(!expanded)}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={styles.help}
        >
          <AppText accessible={false} style={styles.question}>
            ?
          </AppText>
        </Pressable>
      </View>
      {expanded ? (
        <ToneContext.Provider value={{ text: c.text, textMuted: c.textMuted }}>
          <View
            style={[
              styles.details,
              { backgroundColor: c.surfaceShade, borderColor: c.outline },
            ]}
          >
            <AppText accessibilityRole="header">
              {takeaway ?? explanation.summary}
            </AppText>
            {!readingIsBackground && research.length > 0 ? (
              <View style={styles.stack}>
                <AppText variant="caption" muted>
                  Related research; this app's{' '}
                  {explanation.status === 'estimate'
                    ? 'measurement'
                    : 'suggestion'}{' '}
                  is unvalidated.
                </AppText>
                {research}
              </View>
            ) : null}
            <ExpandableTray
              title="How it works"
              accessibilityLabel={`How it works for ${label}`}
            >
              {takeaway && takeaway !== explanation.summary ? (
                <AppText variant="caption">{explanation.summary}</AppText>
              ) : null}
              <AppText>{explanation.rule}</AppText>
              {explanation.limitations.map((limit, index) => (
                <AppText key={index} variant="caption">
                  • {limit}
                </AppText>
              ))}
              {readingIsBackground && research.length > 0 ? (
                <View style={styles.stack}>
                  <AppText variant="caption" muted>
                    Background reading
                  </AppText>
                  {research}
                </View>
              ) : null}
            </ExpandableTray>
            <ExpandableTray
              title="Your inputs"
              count={explanation.evidence.length}
              accessibilityLabel={`Your inputs for ${label}`}
            >
              {explanation.evidence.length === 0 ? (
                <AppText>Input records unavailable.</AppText>
              ) : null}
              {explanation.evidence.map((record, index) => (
                <View key={`${record.id}-${index}`} style={styles.stack}>
                  <AppText variant="caption">
                    {record.label} ({record.id})
                  </AppText>
                  <AppText>{record.detail}</AppText>
                </View>
              ))}
            </ExpandableTray>
          </View>
        </ToneContext.Provider>
      ) : null}
    </View>
  );
}

const SOURCE_TOPICS: Readonly<Record<string, string>> = {
  michailov2018: 'Finger testing',
  mermier2000: 'Climbing performance',
  draga2020: 'Flexibility',
  orth2018: 'Learning through practice',
  seifert2017: 'Route preview',
  stenum2021: '2D movement estimates',
  barzegar2024: 'Camera joint angles',
  schweizer2001: 'Crimp grip loading',
  klauser2002: 'Finger pulley imaging',
  paxton2012: 'Ligament lab study',
  shaw2017: 'Nutrition and collagen markers',
  baar2019: 'Tendon case report',
  walker2020: 'Coached video feedback',
  sanchez2012: 'Route inspection',
  medernach2021: 'Bouldering decisions',
  langer2024: 'Climbing training trial',
  stien2024: 'Movement practice pilot',
};

/** Only this deliberate press opens a remote paper; sources are bundled. */
export function ResearchPaper({ source }: { source: ResearchSource }) {
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
    <View style={styles.stack}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open original paper: ${source.title}`}
        onPress={open}
      >
        <AppText style={styles.link}>
          {SOURCE_TOPICS[source.id] ?? source.title} ·{' '}
          {source.authors.split(',')[0]}
          {source.authors.includes(',') ? ' et al.' : ''}, {source.year}
        </AppText>
      </Pressable>
      <ExpandableTray
        title="Study details"
        accessibilityLabel={`Study details: ${source.title}`}
      >
        <AppText>{source.title}</AppText>
        <AppText variant="caption">
          {source.authors}, {source.year}
        </AppText>
        <AppText variant="caption">
          {source.studyType} · {source.population}
        </AppText>
        <AppText>{source.supports}</AppText>
        {source.limitations.map((limit, index) => (
          <AppText variant="caption" key={index}>
            • {limit}
          </AppText>
        ))}
        <AppText variant="caption" muted>
          Read: {source.readingDepth} · Checked: {source.verifiedAt}
        </AppText>
      </ExpandableTray>
      {error ? (
        <AppText accessibilityRole="alert">
          Could not open this paper. Try again.
        </AppText>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
  anchor: { flexShrink: 1 },
  help: {
    width: 18,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  question: { fontWeight: '700', fontSize: 12, lineHeight: 16 },
  details: { padding: 12, borderWidth: 3, gap: 10 },
  link: { textDecorationLine: 'underline', fontWeight: '700' },
});
