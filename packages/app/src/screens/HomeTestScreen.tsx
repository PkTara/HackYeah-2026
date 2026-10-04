import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BASELINE_TESTS,
  ageLabel,
  formatResult,
  type BaselineResult,
  type ResultMethod,
} from '@hackyeah/core';
import { AppText, Button, spacing } from '@hackyeah/ui';
import { homeTestSaved, nextHomeTest } from '../afterSave';
import { DecisionHelp } from '../components/DecisionHelp';
import { explainHomeTest } from '../components/resultExplanations';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { SavedNote } from '../components/SavedNote';
import { TabScreen } from '../components/TabScreen';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { TestStep } from '../onboarding/TestSteps';
import { useGame } from '../state/GameProvider';

/**
 * One home test from setup, done again from the Data tab.
 * Params: id, a test id from BASELINE_TESTS. After a save the page stays,
 * says what was saved against the last result, and offers the next test.
 */
export function HomeTestScreen() {
  const { params } = useNavigation<RouteName>();
  // The navigator reuses the screen for "Next: ...", so a new test gets a
  // fresh stopwatch and no note from the last save.
  return <HomeTest key={String(params.id)} />;
}

function HomeTest() {
  const { params, canGoBack, goBack, reset, navigate } =
    useNavigation<RouteName>();
  const { state, today, saveBaseline } = useGame();
  const index = Math.max(
    0,
    BASELINE_TESTS.findIndex(t => t.id === params.id),
  );
  const test = BASELINE_TESTS[index];
  const last = state.baseline.find(r => r.testId === test.id);
  const [draft, setDraft] = useState<
    Readonly<{ value: number; method: ResultMethod }> | undefined
  >(undefined);
  // The save just made, with the result it replaced.
  const [saved, setSaved] = useState<{
    value: number;
    previous: BaselineResult | undefined;
  } | null>(null);

  // Opened from a web link there is nothing to go back to.
  const leave = () => (canGoBack ? goBack() : reset('Tests'));
  const save = () => {
    if (draft) {
      saveBaseline({ testId: test.id, unit: test.unit, date: today, ...draft });
      setSaved({ value: draft.value, previous: last });
    }
  };
  const message = saved
    ? homeTestSaved(test, saved, saved.previous, today)
    : null;
  const next = nextHomeTest(state.baseline, test.id);
  const shownLast = saved ? saved.previous : last;

  return (
    <TabScreen>
      <View style={styles.column}>
        <Crumbs />
        <PageHeader
          title={test.name}
          subtitle={
            shownLast
              ? `Last time: ${formatResult(
                  shownLast.unit,
                  shownLast.value,
                )}, ${ageLabel(shownLast.date, today)}.`
              : 'Optional. Stop if anything hurts.'
          }
        />
        {last ? (
          <DecisionHelp
            label="last home test result"
            explanation={explainHomeTest(test, last)}
          />
        ) : null}
        <TestStep
          test={test}
          title="How it works"
          result={draft}
          onResult={(value, method) => {
            setSaved(null);
            setDraft(value === null ? undefined : { value, method });
          }}
        />
        <Button
          title={saved ? 'Saved' : 'Save result'}
          icon="check"
          disabled={!draft || Boolean(saved)}
          onPress={save}
        />
        {message ? (
          <SavedNote
            title={message.title}
            lines={message.lines}
            next={[
              ...(next
                ? [
                    {
                      title: `Next: ${next.name}`,
                      onPress: () => navigate('Test', { id: next.id }),
                    },
                  ]
                : []),
              {
                title: 'Done',
                accessibilityLabel: 'Done, return to Data',
                onPress: leave,
              },
            ]}
          />
        ) : !draft ? (
          <AppText variant="caption" muted>
            Time it or count it first. Nothing is saved until you tap Save.
          </AppText>
        ) : null}
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  // One test reads best as a phone-width column, even on a wide screen.
  column: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: spacing.lg,
  },
});
