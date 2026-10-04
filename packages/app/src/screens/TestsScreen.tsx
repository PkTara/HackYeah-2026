import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  AREA_LABEL,
  BASELINE_TESTS,
  ageLabel,
  formatResult,
  shortDate,
  type BaselineResult,
  type BaselineTest,
  type Reach,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Column,
  Columns,
  Icon,
  PX,
  Panel,
  PixelText,
  Tag,
  useTheme,
} from '@hackyeah/ui';
import { DecisionHelp } from '../components/DecisionHelp';
import {
  explainReach,
  explainHomeTest,
} from '../components/resultExplanations';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useSetup } from '../onboarding/OnboardingGate';
import { useMedia } from '../media';
import { useGame } from '../state/GameProvider';

const MIN_CM = 100;
const MAX_CM = 250;
/** How long the reset button waits for the second tap. */
const CONFIRM_MS = 3000;

/** Tests from the design that this build does not run yet. */
const NOT_BUILT = [
  {
    title: 'Shoulder reach',
    text: 'This camera test will compare your left and right shoulder.',
  },
  {
    title: 'Finger strength',
    text: 'This needs a hangboard or a force gauge, and it is never guessed from a photo.',
  },
] as const;

/** How a result was taken, in the words the climber used. */
const METHOD_TEXT: Record<BaselineResult['method'], string> = {
  stopwatch: 'timed',
  counter: 'counted',
  typed: 'typed in',
};

/** Whole centimetres from 100 to 250, otherwise null. */
function parseCm(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const cm = Number(trimmed);
  return cm >= MIN_CM && cm <= MAX_CM ? cm : null;
}

function cmError(text: string): string | null {
  if (text.trim() === '') {
    return 'Enter a number.';
  }
  return parseCm(text) === null
    ? `Use a whole number from ${MIN_CM} to ${MAX_CM}.`
    : null;
}

/** 3 -> "+3 cm", -2 -> "-2 cm" */
function signedCm(cm: number): string {
  return `${cm > 0 ? '+' : ''}${cm} cm`;
}

/**
 * Assessments: the home tests from setup, manual reach, the camera
 * assessment (it needs the server), and honest "not built yet" cards.
 */
export function TestsScreen() {
  const { navigate } = useNavigation<RouteName>();
  const { backendKind } = useGame();
  const { redoSetup } = useSetup();

  return (
    <TabScreen>
      <PageHeader
        title="Tests"
        subtitle="Optional checks you do yourself. They add to your profile and are never scored."
      />

      {/* Wide screens: the working tests on the left, the rest next to it. */}
      <Columns>
        <Column>
          <HomeTestsPanel />
          <ReachPanel />
        </Column>

        <Column>
          <CameraPanel />
          {NOT_BUILT.map(test => (
            <Panel
              key={test.title}
              variant="quiet"
              title={test.title}
              badge={<Tag text="Soon" tone="muted" />}
            >
              <AppText>{test.text}</AppText>
            </Panel>
          ))}

          <Panel variant="quiet">
            <Button
              title="About this build"
              variant="secondary"
              small
              onPress={() => navigate('About')}
            />
            <Button
              title="Redo setup"
              variant="secondary"
              small
              onPress={redoSetup}
            />
            {/* Only the on-device demo store can be reset. */}
            {backendKind === 'local' ? <ResetDemo /> : null}
          </Panel>
        </Column>
      </Columns>
    </TabScreen>
  );
}

/**
 * Leg spread with the camera. It needs the server, which analyses the
 * picture; the on-device demo says so instead of offering it.
 */
function CameraPanel() {
  const { navigate } = useNavigation<RouteName>();
  const media = useMedia();
  return (
    <Panel
      variant={media ? 'sign' : 'quiet'}
      title="Leg spread"
      badge={<Tag text={media ? 'Camera' : 'Needs server'} tone="muted" />}
    >
      <AppText>
        Take a photo, record a clip or go live. The server estimates the angle
        between your legs as the picture shows it: a projected angle, not a
        validated flexibility test.
      </AppText>
      {media ? (
        <>
          <AppText variant="caption" muted>
            Nothing leaves this device until you agree to send it.
          </AppText>
          <Button
            title="Camera assessment"
            icon="tests"
            onPress={() => navigate('Assessment')}
          />
        </>
      ) : (
        <AppText variant="caption" muted>
          This needs the Climbing Monkey server, and this build keeps everything
          on this device. Start it with npm run backend:start and open the app
          with VITE_MONKEY_API_URL set (API_BASE_URL on a phone).
        </AppText>
      )}
    </Panel>
  );
}

/** The six home tests from setup: latest result each, and a way to redo one. */
function HomeTestsPanel() {
  const { navigate } = useNavigation<RouteName>();
  const { state, today } = useGame();
  const { colors: c } = useTheme();
  const done = state.baseline.length;

  return (
    <Panel
      title="Home tests"
      badge={<Tag text={`${done} of ${BASELINE_TESTS.length}`} tone="muted" />}
    >
      <AppText variant="caption" muted>
        About a minute each, no gear beyond a bar and a ruler. What you
        measured, not a score.
      </AppText>
      {BASELINE_TESTS.map(test => (
        <View key={test.id}>
          {/* Linked rows share one tray, split by a rule. */}
          <View style={[styles.rule, { backgroundColor: c.surfaceShade }]} />
          <HomeTestRow
            test={test}
            result={state.baseline.find(r => r.testId === test.id)}
            today={today}
            onPress={() => navigate('Test', { id: test.id })}
          />
        </View>
      ))}
    </Panel>
  );
}

function HomeTestRow({
  test,
  result,
  today,
  onPress,
}: {
  test: BaselineTest;
  result: BaselineResult | undefined;
  today: string;
  onPress: () => void;
}) {
  const name = test.name.toLowerCase();
  return (
    <View style={styles.resultHelp}>
      <View style={styles.testRow}>
        <View style={styles.grow}>
          <AppText>{test.name}</AppText>
          <AppText variant="caption" muted>
            {result
              ? `${formatResult(result.unit, result.value)}, ${
                  METHOD_TEXT[result.method]
                } ${ageLabel(result.date, today)}`
              : `Not done yet. ${AREA_LABEL[test.area]}.`}
          </AppText>
        </View>
        <Button
          title={result ? 'Redo' : 'Do it'}
          variant={result ? 'secondary' : 'primary'}
          small
          accessibilityLabel={`${result ? 'Redo' : 'Do'} ${name}`}
          onPress={onPress}
        />
      </View>
      <DecisionHelp
        label={`${name} result`}
        explanation={explainHomeTest(test, result)}
      />
    </View>
  );
}

/** Manual arm span and height. */
function ReachPanel() {
  const { state, today, saveReach, syncError } = useGame();
  const reach = state.reach;
  const [arm, setArm] = useState(reach ? String(reach.armSpanCm) : '');
  const [height, setHeight] = useState(reach ? String(reach.heightCm) : '');
  // Errors show after the first save attempt, then update as you type.
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState(false);

  // Show the stored numbers again after a save, a reload or a demo reset.
  useEffect(() => {
    setArm(reach ? String(reach.armSpanCm) : '');
    setHeight(reach ? String(reach.heightCm) : '');
  }, [reach]);

  const save = () => {
    const armSpanCm = parseCm(arm);
    const heightCm = parseCm(height);
    if (armSpanCm === null || heightCm === null) {
      setTried(true);
      setSaved(false);
      return;
    }
    saveReach({ armSpanCm, heightCm });
    setTried(false);
    setSaved(true);
  };

  return (
    <Panel title="Reach">
      {reach ? <ReachResult reach={reach} today={today} /> : null}

      <AppText>
        Stand with your arms out wide and measure fingertip to fingertip. Then
        measure your height without shoes.
      </AppText>

      <View style={styles.fields}>
        <CmField
          label="Arm span"
          value={arm}
          error={tried ? cmError(arm) : null}
          onChangeText={text => {
            setArm(text);
            setSaved(false);
          }}
          onSubmit={save}
        />
        <CmField
          label="Height"
          value={height}
          error={tried ? cmError(height) : null}
          onChangeText={text => {
            setHeight(text);
            setSaved(false);
          }}
          onSubmit={save}
        />
      </View>

      <Button title="Save reach" icon="check" onPress={save} />
      {/* Screen readers announce the confirmation when it appears. If the
          save fails, the app's sync notice shows instead. */}
      <View accessibilityLiveRegion="polite">
        {saved && reach && !syncError ? (
          <View style={styles.inline}>
            <Icon name="check" />
            <AppText variant="caption">Saved.</AppText>
          </View>
        ) : null}
      </View>
    </Panel>
  );
}

function ReachResult({ reach, today }: { reach: Reach; today: string }) {
  const { colors: c } = useTheme();
  const when = `${ageLabel(reach.date, today)} (${shortDate(reach.date)})`;
  return (
    <>
      <View
        style={[
          styles.result,
          { backgroundColor: c.surfaceShade, borderColor: c.outline },
        ]}
      >
        <View style={styles.stats}>
          <Stat label="Arm span" value={`${reach.armSpanCm} cm`} />
          <Stat label="Height" value={`${reach.heightCm} cm`} />
        </View>
        <View style={[styles.rule, { backgroundColor: c.outline }]} />
        <View style={styles.stat}>
          <AppText variant="caption" muted>
            Ape index: arm span minus height
          </AppText>
          <PixelText
            text={signedCm(reach.armSpanCm - reach.heightCm)}
            scale={6}
          />
        </View>
      </View>
      <DecisionHelp
        label="reach difference"
        explanation={explainReach(reach)}
      />
      <AppText variant="caption" muted>
        Stored reach dated {when}.
      </AppText>
      <AppText>
        This describes your body. It is not a strength or a weakness.
      </AppText>
      {/* Splits the result from the form below, which measures again. */}
      <View style={[styles.rule, { backgroundColor: c.surfaceShade }]} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <PixelText text={value} scale={3} />
    </View>
  );
}

/** Number box in the pixel style: hard outline, square corners, big digits. */
function CmField({
  label,
  value,
  error,
  onChangeText,
  onSubmit,
}: {
  label: string;
  value: string;
  error: string | null;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) {
  const { colors: c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {/* The input carries its own label for screen readers. */}
      <PixelText text={`${label} (cm)`} accessible={false} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={3}
        accessibilityLabel={`${label} in cm`}
        selectionColor={c.outline}
        style={[
          styles.input,
          {
            backgroundColor: focused ? c.primary : c.surfaceLight,
            borderColor: error ? c.danger : c.outline,
            color: focused ? c.onPrimary : c.text,
          },
        ]}
      />
      <View accessibilityLiveRegion="polite">
        {error ? (
          <AppText variant="caption" style={{ color: c.danger }}>
            {error}
          </AppText>
        ) : null}
      </View>
    </View>
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
  resultHelp: { gap: 8 },
  fields: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 6 },
  input: {
    minHeight: 48,
    borderWidth: PX,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 20,
    fontWeight: '800',
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  result: { borderWidth: PX, padding: 12, gap: 10 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1, gap: 4 },
  rule: { height: PX },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
  },
  grow: { flex: 1, gap: 2 },
});
