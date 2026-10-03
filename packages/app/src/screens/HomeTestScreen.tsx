import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BASELINE_TESTS,
  ageLabel,
  formatResult,
  type ResultMethod,
} from '@hackyeah/core';
import { AppText, Button, spacing } from '@hackyeah/ui';
import { BackButton } from '../components/BackButton';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { TestStep } from '../onboarding/TestSteps';
import { useGame } from '../state/GameProvider';

/**
 * One home test from setup, done again from the Tests tab.
 * Params: id, a test id from BASELINE_TESTS.
 */
export function HomeTestScreen() {
  const { params, canGoBack, goBack, reset } = useNavigation<RouteName>();
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

  // Opened from a web link there is nothing to go back to.
  const leave = () => (canGoBack ? goBack() : reset('Tests'));
  const save = () => {
    if (draft) {
      saveBaseline({ testId: test.id, unit: test.unit, date: today, ...draft });
      leave();
    }
  };

  return (
    <TabScreen>
      <View style={styles.column}>
        <BackButton />
        <PageHeader
          title={test.name}
          subtitle={
            last
              ? `Last time: ${formatResult(last.unit, last.value)}, ${ageLabel(
                  last.date,
                  today,
                )}.`
              : 'Optional. Stop if anything hurts.'
          }
        />
        <TestStep
          test={test}
          index={index + 1}
          result={draft}
          onResult={(value, method) =>
            setDraft(value === null ? undefined : { value, method })
          }
        />
        <Button
          title="Save result"
          icon="check"
          disabled={!draft}
          onPress={save}
        />
        {!draft ? (
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
