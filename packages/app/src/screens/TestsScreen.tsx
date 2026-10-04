import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AREA_LABEL,
  BASELINE_TESTS,
  ageLabel,
  formatResult,
  shortDate,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Column,
  Columns,
  Icon,
  Panel,
  type IconName,
} from '@hackyeah/ui';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { DataRow } from '../components/DataRow';
import { StateLabel } from '../components/StateLabel';
import { AssessmentSummary } from '../components/AssessmentSummary';
import { ActivitySummary } from './ActivityScreen';
import { TERRAIN_NAME, fingerLabel } from '../labels';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useSetup } from '../onboarding/OnboardingGate';
import { useInputReadiness, type Readiness } from '../readiness';
import { useGame } from '../state/GameProvider';
import { DemoButton } from '../demo/DemoControls';
import { useDemo } from '../demo/DemoProvider';

const CONFIRM_MS = 3000;
const METHOD_TEXT = {
  stopwatch: 'timed',
  counter: 'counted',
  typed: 'typed in',
};

/**
 * The Data tab: every input the monkey uses, grouped the way a climber
 * thinks about them (climbs and hands, body, home tests, camera, activity).
 * Each group says in one line what it is for and each item says whether it
 * can be used here, so nothing that cannot run looks like it can. The rows
 * open the detail pages; App settings sit at the bottom. The file keeps its
 * old name from when the tab was Tests.
 */
export function TestsScreen() {
  const demo = useDemo();
  const { navigate, reset } = useNavigation<RouteName>();
  const { state, today, backendKind } = useGame();
  const { redoSetup } = useSetup();
  const readiness = useInputReadiness();
  const latest = state.logs[state.logs.length - 1];
  // The same order as in setup.
  const tests = BASELINE_TESTS;
  const done = tests.filter(t =>
    state.baseline.some(r => r.testId === t.id),
  ).length;

  const climbs = (
    <Group
      title="Climbs and hands"
      icon="log"
      purpose="What you climbed and what hurts. These shape your focus and quest."
      state="ready"
    >
      <DataRow
        title="Climb log"
        subtitle={
          latest
            ? `${state.logs.length} climbs. Latest ${
                latest.grade
              } ${TERRAIN_NAME[latest.terrain].toLowerCase()}, ${shortDate(
                latest.date,
              )}`
            : 'No climbs yet. Log one after a session.'
        }
        accessibilityLabel="Open climbing log"
        onPress={() => reset('Log')}
      />
      <DataRow
        title="Finger check-in"
        subtitle={
          state.flags.length === 0
            ? 'Nothing flagged. Quests run as normal.'
            : `${state.flags
                .map(f => fingerLabel(f.side, f.finger))
                .join(', ')} flagged. Finger quests wait.`
        }
        accessibilityLabel="Open hands"
        onPress={() => reset('Hands')}
        divider={false}
      />
    </Group>
  );

  const body = (
    <Group
      title="Body and reach"
      icon="profile"
      purpose="Typed in from a tape measure or a force gauge. Optional."
      state="ready"
    >
      <DataRow
        title="Body & reach"
        subtitle={
          state.reach
            ? `${state.reach.armSpanCm} cm arm span, ${
                state.reach.heightCm
              } cm tall. ${shortDate(state.reach.date)}`
            : 'Arm span and height. Needs a tape measure.'
        }
        accessibilityLabel="Open body and reach"
        onPress={() => navigate('BodyReach')}
      />
      <AssessmentSummary
        compact
        records={state.assessments}
        metrics={['finger_force']}
        onOpen={metric => navigate('MeasurementDetail', { metric })}
        emptyText="Needs a force gauge or load cell."
        lastDivider={false}
      />
    </Group>
  );

  const home = (
    <Group
      title="Home tests"
      icon="tests"
      purpose={`A stopwatch or counter on this device. ${done} of ${tests.length} done.`}
      state="ready"
    >
      {tests.map((test, i) => {
        const result = state.baseline.find(r => r.testId === test.id);
        return (
          <DataRow
            key={test.id}
            title={test.name}
            subtitle={
              result
                ? `${formatResult(result.unit, result.value)}, ${
                    METHOD_TEXT[result.method]
                  } ${ageLabel(result.date, today)}`
                : `Not done yet. ${AREA_LABEL[test.area]}.`
            }
            action={result ? 'Redo' : 'Open'}
            accessibilityLabel={`${
              result ? 'Redo' : 'Do'
            } ${test.name.toLowerCase()}`}
            onPress={() => navigate('Test', { id: test.id })}
            divider={i < tests.length - 1}
          />
        );
      })}
    </Group>
  );

  const camera = (
    <Group
      title="Camera"
      icon="camera"
      purpose="Live angle estimates from your camera. A guide, not a clinical test."
    >
      <AssessmentSummary
        compact
        records={state.assessments}
        metrics={['leg_spread', 'shoulder_reach_left', 'shoulder_reach_right']}
        state={readiness.cameraAssessment}
        onOpen={metric => navigate('MeasurementDetail', { metric })}
        lastDivider={false}
      />
    </Group>
  );

  const activity = (
    <Group
      title="Activity"
      icon="clock"
      purpose="Workouts and sleep from health apps add context. They never change grades."
    >
      <ActivitySummary divider={false} />
    </Group>
  );

  return (
    <TabScreen>
      <PageHeader
        title="Data"
        subtitle="Everything the monkey knows comes from here. All of it is optional."
      />
      <Columns>
        <Column>
          {climbs}
          {home}
        </Column>
        <Column>
          {body}
          {camera}
          {activity}
          <Panel variant="quiet" title="App">
            <View style={styles.buttons}>
              <Button
                title="Settings"
                variant="secondary"
                small
                onPress={() => navigate('Settings')}
              />
              <Button
                title="About this build"
                variant="secondary"
                small
                onPress={() => navigate('About')}
              />
              <DemoButton />
              <Button
                title="Redo setup"
                variant="secondary"
                small
                onPress={redoSetup}
              />
            </View>
            {backendKind === 'local' && !demo.settings.enabled ? (
              <ResetDemo />
            ) : null}
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
  );
}

/** One group of inputs: a titled sign, one line on what it is for, its rows. */
function Group({
  title,
  icon,
  purpose,
  state,
  children,
}: {
  title: string;
  icon: IconName;
  purpose: string;
  /** For a group whose items all share one state. */
  state?: Readiness;
  children: ReactNode;
}) {
  return (
    <Panel title={title} icon={icon}>
      <View style={styles.purpose}>
        <AppText variant="caption" muted style={styles.grow}>
          {purpose}
        </AppText>
        {state ? <StateLabel state={state} /> : null}
      </View>
      <View>{children}</View>
    </Panel>
  );
}

/** Needs two taps, so a stray tap cannot wipe what you logged. */
function ResetDemo() {
  const { resetDemo, syncError } = useGame();
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);

  // The second tap only counts for a few seconds.
  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const press = () => {
    if (armed) {
      resetDemo();
      setArmed(false);
      setDone(true);
    } else {
      setArmed(true);
      setDone(false);
    }
  };

  return (
    <>
      <AppText variant="caption" muted>
        Reset puts the example data back. Anything you added is removed.
      </AppText>
      <Button
        title={armed ? 'Tap again to reset' : 'Reset demo data'}
        variant="danger"
        small
        onPress={press}
        accessibilityHint={
          armed ? undefined : 'Asks for a second tap before anything is removed'
        }
      />
      <View accessibilityLiveRegion="polite">
        {/* A failed reset shows the app's sync notice instead. */}
        {done && !syncError ? (
          <View style={styles.inline}>
            <Icon name="check" />
            <AppText variant="caption">Demo data restored.</AppText>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  purpose: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  grow: { flex: 1 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
