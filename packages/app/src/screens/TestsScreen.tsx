import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AREA_LABEL,
  BASELINE_TESTS,
  ageLabel,
  formatResult,
  shortDate,
} from '@hackyeah/core';
import { AppText, Button, Column, Columns, Icon, Panel } from '@hackyeah/ui';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { DataRow } from '../components/DataRow';
import { AssessmentSummary } from '../components/AssessmentSummary';
import { ActivitySummary } from './ActivityScreen';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useSetup } from '../onboarding/OnboardingGate';
import { useGame } from '../state/GameProvider';
import { DemoButton } from '../demo/DemoControls';
import { useDemo } from '../demo/DemoProvider';

const CONFIRM_MS = 3000;
const METHOD_TEXT = {
  stopwatch: 'timed',
  counter: 'counted',
  typed: 'typed in',
};

export function TestsScreen() {
  const demo = useDemo();
  const { navigate } = useNavigation<RouteName>();
  const { state, today, backendKind } = useGame();
  const { redoSetup } = useSetup();
  const homeRows = (ids: string[]) =>
    BASELINE_TESTS.filter(t => ids.includes(t.id)).map(test => {
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
        />
      );
    });
  return (
    <TabScreen>
      <PageHeader
        title="Data"
        subtitle="Measurements, movement, activity and recovery."
      />
      <Columns>
        <Column>
          <AppText variant="caption" muted>
            Body & reach
          </AppText>
          <DataRow
            title="Body & reach"
            subtitle={
              state.reach
                ? `${state.reach.armSpanCm} cm arm span · ${
                    state.reach.heightCm
                  } cm height · Manual · ${shortDate(state.reach.date)}`
                : 'Arm span, height and ape index'
            }
            accessibilityLabel="Open body and reach"
            onPress={() => navigate('BodyReach')}
          />
          <AppText variant="caption" muted>
            Strength & endurance
          </AppText>
          <AssessmentSummary
            compact
            records={state.assessments}
            metrics={['finger_force']}
            onOpen={metric => navigate('MeasurementDetail', { metric })}
          />
          {homeRows(['dead-hang', 'pull-ups', 'push-ups', 'plank'])}
        </Column>
        <Column>
          <AppText variant="caption" muted>
            Mobility & movement
          </AppText>
          <AssessmentSummary
            compact
            records={state.assessments}
            metrics={[
              'leg_spread',
              'shoulder_reach_left',
              'shoulder_reach_right',
            ]}
            onOpen={metric => navigate('MeasurementDetail', { metric })}
          />
          {homeRows(['sit-and-reach', 'one-leg-balance'])}
          <AppText variant="caption" muted>
            Activity & recovery
          </AppText>
          <ActivitySummary />
          <Panel variant="quiet">
            <Button
              title="About this build"
              variant="secondary"
              small
              onPress={() => navigate('About')}
            />
            <DemoButton />
            <Button
              title="Settings"
              variant="secondary"
              small
              onPress={() => navigate('Settings')}
            />
            <Button
              title="Redo setup"
              variant="secondary"
              small
              onPress={redoSetup}
            />
            {backendKind === 'local' && !demo.settings.enabled ? (
              <ResetDemo />
            ) : null}
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
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
});
