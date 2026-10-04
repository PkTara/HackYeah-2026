import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Icon,
  PX,
  ToneContext,
  useTheme,
} from '@hackyeah/ui';

export type NextStep = Readonly<{
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
}>;

/**
 * What a save changed and where to go next. Every input page ends a save
 * with one of these, so the climber never has to guess whether it worked
 * or what it did: a title ("Saved V3 vertical"), one or two plain lines on
 * what changed, and at most two next steps.
 */
export function SavedNote({
  title,
  lines = [],
  next = [],
}: {
  title: string;
  lines?: readonly string[];
  next?: readonly NextStep[];
}) {
  const { colors: c } = useTheme();
  return (
    <ToneContext.Provider value={{ text: c.text, textMuted: c.textMuted }}>
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.box,
          { backgroundColor: c.surfaceLight, borderColor: c.outline },
        ]}
      >
        <View style={[styles.head, { backgroundColor: c.leaf }]}>
          <Icon name="check" color="#FFFFFF" />
          <AppText style={styles.title}>{title}</AppText>
        </View>
        <View style={styles.body}>
          {lines.map(line => (
            <AppText key={line} variant="caption">
              {line}
            </AppText>
          ))}
          {next.length ? (
            <View style={styles.next}>
              {next.map((step, i) => (
                <Button
                  key={step.title}
                  title={step.title}
                  small
                  variant={i === 0 ? 'primary' : 'secondary'}
                  accessibilityLabel={step.accessibilityLabel}
                  onPress={step.onPress}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </ToneContext.Provider>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: PX },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  title: { flex: 1, color: '#FFFFFF', fontWeight: '800' },
  body: { padding: 10, gap: 6 },
  next: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
