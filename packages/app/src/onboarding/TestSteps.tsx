/** The optional home tests, one per step, and the summary at the end. */
import { StyleSheet, View } from 'react-native';
import {
  AREA_LABEL,
  BASELINE_LIMITS,
  BASELINE_TESTS,
  CONNECTIONS,
  EXPERIENCE_LABEL,
  GOAL_LABEL,
  PLACE_LABEL,
  describeReach,
  formatResult,
  gradeLabel,
  type BaselineTest,
  type OnboardingResult,
  type ResultMethod,
} from '@hackyeah/core';
import { AppText, Button, Panel, PixelText, Tag, useTheme } from '@hackyeah/ui';
import { DecisionHelp } from '../components/DecisionHelp';
import { explainHomeTest } from '../components/resultExplanations';
import { Fact, NumberedList, SafetyLine } from './bits';
import { RepCounter } from './RepCounter';
import { Stopwatch } from './Stopwatch';

export function TestsIntroStep({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <Panel title="Home tests" badge={<Tag text="Optional" tone="muted" />}>
      <AppText>
        One test per screen. Each gives your profile a starting point to compare
        with later.
      </AppText>
      <View
        accessible
        accessibilityLabel={`The tests: ${BASELINE_TESTS.map(t => t.name).join(
          ', ',
        )}`}
        style={styles.tags}
      >
        {BASELINE_TESTS.map(test => (
          <Tag key={test.id} text={test.name} tone="muted" />
        ))}
      </View>
      <AppText variant="caption">
        You need a pull-up bar, some floor and a ruler. Skip any test you cannot
        do.
      </AppText>
      <SafetyLine text="Warm up first. Skip the tests if you are injured, and stop if anything hurts." />
      <Button title="Start tests" icon="tests" onPress={onStart} />
      <Button title="Skip for now" variant="secondary" onPress={onSkip} />
    </Panel>
  );
}

export function TestStep({
  test,
  index,
  title = test.name,
  result,
  onResult,
}: {
  test: BaselineTest;
  /** 1 to 6, shown as "N of 6" during setup. Left out when done on its own. */
  index?: number;
  /** Panel title; the test's name unless the page already shows it. */
  title?: string;
  result: Readonly<{ value: number; method: ResultMethod }> | undefined;
  onResult: (value: number | null, method: ResultMethod) => void;
}) {
  const { colors: c } = useTheme();
  const limits = BASELINE_LIMITS[test.unit];
  return (
    <>
      <Panel
        title={title}
        badge={
          index ? (
            <Tag text={`${index} of ${BASELINE_TESTS.length}`} tone="muted" />
          ) : undefined
        }
      >
        <AppText>{test.measures}</AppText>
        <View style={styles.inline}>
          <AppText variant="caption" muted>
            On your profile:
          </AppText>
          <Tag text={AREA_LABEL[test.area]} tone="focus" />
        </View>
        <AppText variant="caption">You need: {test.equipment}</AppText>
        <View style={[styles.rule, { backgroundColor: c.surfaceShade }]} />
        <PixelText text="How to" />
        <NumberedList items={test.steps} />
        <SafetyLine text={test.safety} />
        <DecisionHelp
          label={`${test.name.toLowerCase()} protocol`}
          explanation={explainHomeTest(test, result)}
        />
      </Panel>

      <Panel
        title={
          test.unit === 'seconds'
            ? 'Your time'
            : test.unit === 'reps'
            ? 'Your reps'
            : 'Your reach'
        }
      >
        {test.input === 'stopwatch' ? (
          <Stopwatch
            value={result?.value ?? null}
            max={limits.max}
            label={test.name}
            onChange={onResult}
          />
        ) : (
          <RepCounter
            value={result?.value ?? null}
            min={limits.min}
            max={limits.max}
            unit={test.unit}
            label={test.name}
            describe={test.unit === 'cm' ? describeReach : undefined}
            onChange={onResult}
          />
        )}
      </Panel>
    </>
  );
}

export function DoneStep({ result }: { result: OnboardingResult | null }) {
  if (!result) {
    return null;
  }
  const { details, connections, baseline } = result;
  const demo = connections.filter(c => c.choice === 'demo');
  return (
    <Panel title="Saved" icon="check">
      <Fact label="Where you climb">
        {details.places.map(p => PLACE_LABEL[p]).join(', ')}
      </Fact>
      <Fact label="Climbing for">{EXPERIENCE_LABEL[details.experience]}</Fact>
      <Fact label="Usual grade">{gradeLabel(details.grade)}</Fact>
      <Fact label="Goal">{GOAL_LABEL[details.goal]}</Fact>
      <Fact label="Reach">
        {details.body
          ? `${details.body.heightCm} cm tall, ${details.body.armSpanCm} cm arm span`
          : 'Skipped'}
      </Fact>
      <Fact label="Apps">
        {demo.length > 0
          ? demo.map(c => `${CONNECTIONS[c.id].name} (demo)`).join(', ')
          : 'None connected'}
      </Fact>
      <Fact label="Home tests">
        {baseline.length === 0 ? (
          <AppText>Skipped for now</AppText>
        ) : (
          <View style={styles.results}>
            <AppText>
              {baseline.length} of {BASELINE_TESTS.length} done
            </AppText>
            {baseline.map(r => (
              <AppText key={r.testId} variant="caption">
                {BASELINE_TESTS.find(t => t.id === r.testId)?.name}:{' '}
                {formatResult(r.unit, r.value)}
              </AppText>
            ))}
          </View>
        )}
      </Fact>
      <AppText variant="caption" muted>
        All of it is what you told the monkey. A connected server can use your
        goal to prioritize quests. Local quests use climb logs, finger flags and
        quest progress.
      </AppText>
    </Panel>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  rule: { height: 3 },
  results: { gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
