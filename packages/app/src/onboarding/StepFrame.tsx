import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Button,
  Meter,
  MonkeyGuide,
  PX,
  PixelText,
  Screen,
  Breadcrumbs,
  useLayout,
  useTheme,
} from '@hackyeah/ui';
import {
  CHAPTERS,
  PERCHES,
  chapterOf,
  perchOf,
  consentApp,
  type StepId,
} from './flow';
import { BASELINE_TESTS, CONNECTIONS } from '@hackyeah/core';
import { DemoButton } from '../demo/DemoControls';

/** Width of the onboarding column on wide screens. */
const COLUMN_MAX = 600;
/** Wood-plank text, same as the tab bar and rail. */
const PLANK_TEXT = '#FFF4DC';

export type FooterAction = Readonly<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Said by screen readers, e.g. why Next is not available yet. */
  hint?: string;
  /** When the label alone is not specific enough. */
  accessibilityLabel?: string;
}>;

type Props = {
  step: StepId;
  /** The step before, so the monkey hops over from its perch. */
  from: StepId | null;
  /** What the monkey says. */
  line: string;
  back?: () => void;
  skip?: FooterAction;
  next?: FooterAction;
  children: ReactNode;
  onStart?: () => void;
  onApps?: () => void;
  onTests?: () => void;
};

/**
 * Every onboarding step looks the same: a progress plank, the monkey in its
 * jungle strip with a speech bubble, the step itself, and a footer with
 * Back, Skip and Next. No tab bar or rail while it runs.
 */
export function StepFrame({
  step,
  from,
  line,
  back,
  skip,
  next,
  children,
  onStart,
  onApps,
  onTests,
}: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const layout = useLayout();
  const column = Math.min(COLUMN_MAX, width - layout.gutter * 2);
  const app = consentApp(step);
  const test = BASELINE_TESTS.find(t => t.id === step);
  const labels: Partial<Record<StepId, string>> = {
    places: 'Where you climb',
    experience: 'Experience',
    grade: 'Usual grade',
    goal: 'Your goal',
    body: 'Body & reach',
    apps: 'Connected apps',
    tests: 'Home tests',
    done: 'Summary',
  };
  const current = app
    ? CONNECTIONS[app].name
    : test
    ? test.name
    : labels[step] ?? 'Setup';
  const footer =
    back || skip || next ? (
      <Footer
        column={column}
        gutter={layout.gutter}
        back={back}
        skip={skip}
        next={next}
      />
    ) : undefined;

  return (
    <Screen
      hero={
        <View>
          <Progress step={step} column={column} gutter={layout.gutter} />
          <MonkeyGuide
            line={line}
            spot={perchOf(step)}
            from={from ? perchOf(from) : undefined}
            spots={PERCHES}
            celebrate={step === 'done'}
            width={width}
            columnWidth={column}
          />
        </View>
      }
      footer={footer}
    >
      <View
        style={[styles.column, { maxWidth: column, gap: theme.spacing.lg }]}
      >
        {step !== 'welcome' ? (
          <Breadcrumbs
            crumbs={[
              { label: 'Setup', onPress: onStart ?? back },
              ...(app
                ? [{ label: 'Connected apps', onPress: onApps ?? back }]
                : test
                ? [{ label: 'Home tests', onPress: onTests ?? back }]
                : []),
              { label: current },
            ]}
          />
        ) : null}
        {children}
        <DemoButton parent="Setup" />
      </View>
    </Screen>
  );
}

function Progress({
  step,
  column,
  gutter,
}: {
  step: StepId;
  column: number;
  gutter: number;
}) {
  const { colors: c } = useTheme();
  const chapter = chapterOf(step);
  const label =
    step === 'welcome'
      ? 'Climbing Monkey'
      : step === 'done'
      ? 'All done'
      : `Step ${chapter} of ${CHAPTERS}`;
  return (
    <View
      style={[
        styles.plank,
        {
          backgroundColor: c.barkDark,
          borderBottomColor: c.outline,
          paddingHorizontal: gutter,
        },
      ]}
    >
      <View style={[styles.plankRow, { maxWidth: column }]}>
        <PixelText
          text={label}
          color={PLANK_TEXT}
          heading={step === 'welcome'}
          accessible={step === 'welcome'}
        />
        {step === 'welcome' ? null : (
          <View style={styles.grow}>
            <Meter
              value={chapter}
              segments={CHAPTERS}
              height={10}
              accessibilityLabel={label}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function Footer({
  column,
  gutter,
  back,
  skip,
  next,
}: {
  column: number;
  gutter: number;
  back?: () => void;
  skip?: FooterAction;
  next?: FooterAction;
}) {
  const { colors: c } = useTheme();
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: c.barkDark,
          borderTopColor: c.outline,
          paddingHorizontal: gutter,
        },
      ]}
    >
      <View style={[styles.footerRow, { maxWidth: column }]}>
        {back ? (
          <Button title="Back" variant="secondary" onPress={back} />
        ) : null}
        {skip ? (
          <Button
            title={skip.label}
            variant="secondary"
            onPress={skip.onPress}
            accessibilityLabel={skip.accessibilityLabel}
            accessibilityHint={skip.hint}
          />
        ) : null}
        <View style={styles.grow}>
          {next ? (
            <Button
              title={next.label}
              onPress={next.onPress}
              disabled={next.disabled}
              accessibilityLabel={next.accessibilityLabel}
              accessibilityHint={next.hint}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', alignSelf: 'center' },
  grow: { flex: 1 },
  // Fixed height, so the jungle strip sits at the same place on every step.
  plank: {
    height: 44,
    justifyContent: 'center',
    borderBottomWidth: PX,
  },
  plankRow: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footer: { borderTopWidth: PX, paddingTop: 10, paddingBottom: 12 },
  footerRow: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
});
