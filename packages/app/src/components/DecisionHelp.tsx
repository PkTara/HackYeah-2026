import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  RESEARCH_SOURCES,
  type DecisionExplanation,
  type ResearchSource,
} from '@hackyeah/core';
import { AppText, Tag, useTheme } from '@hackyeah/ui';

const STATUS = {
  app_rule: 'App rule',
  draft: 'Draft suggestion',
  estimate: 'Camera estimate',
  example: 'Example',
} as const;

/** Inline disclosures keep the associated result visible on native and web. */
export function DecisionHelp({
  label,
  explanation,
  sources = RESEARCH_SOURCES,
}: {
  label: string;
  explanation: DecisionExplanation;
  sources?: readonly ResearchSource[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { colors: c } = useTheme();
  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Why ${label}?`}
          accessibilityHint="Shows the inputs, rule, research and limits"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={[
            styles.help,
            { backgroundColor: c.surfaceLight, borderColor: c.outline },
          ]}
        >
          <AppText accessible={false} style={styles.question}>
            ?
          </AppText>
        </Pressable>
        <AppText variant="caption">{label}</AppText>
        <Tag text={STATUS[explanation.status]} tone="muted" />
      </View>
      {expanded ? (
        <View
          style={[
            styles.details,
            { backgroundColor: c.surfaceShade, borderColor: c.outline },
          ]}
        >
          <AppText accessibilityRole="header">{explanation.summary}</AppText>
          <AppText style={styles.heading}>Rule</AppText>
          <AppText>{explanation.rule}</AppText>
          <AppText style={styles.heading}>Research</AppText>
          {explanation.sourceIds.length === 0 ? (
            <AppText>No published source is attached to this rule.</AppText>
          ) : null}
          {explanation.sourceIds.map(id => {
            const source = sources.find(s => s.id === id);
            return source ? (
              <ResearchPaper key={id} source={source} />
            ) : (
              <AppText key={id}>Source unavailable: {id}</AppText>
            );
          })}
          <AppText style={styles.heading}>Limits</AppText>
          {explanation.limitations.map((limit, index) => (
            <AppText key={index}>{limit}</AppText>
          ))}
          <AppText style={styles.heading}>
            Your inputs ({explanation.evidence.length})
          </AppText>
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
        </View>
      ) : null}
    </View>
  );
}

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
        <AppText style={styles.link}>{source.title}</AppText>
      </Pressable>
      <AppText variant="caption">
        {source.authors}, {source.year}. {source.studyType}. {source.population}
      </AppText>
      <AppText variant="caption">
        Read: {source.readingDepth}. Verified: {source.verifiedAt}
      </AppText>
      <AppText>{source.supports}</AppText>
      {source.limitations.map((limit, index) => (
        <AppText variant="caption" key={index}>
          {limit}
        </AppText>
      ))}
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
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  help: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: { fontWeight: '800', fontSize: 22 },
  heading: { fontWeight: '800' },
  details: { padding: 12, borderWidth: 3, gap: 10 },
  link: { textDecorationLine: 'underline', fontWeight: '700' },
});
