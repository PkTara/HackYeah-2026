import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  AppText,
  Breadcrumbs,
  Button,
  Chip,
  Panel,
  PX,
  PixelText,
  Tag,
  spacing,
  useTheme,
} from '@hackyeah/ui';
import {
  isFingerForceSetup,
  FINGER_INSTRUMENT_MAX_LENGTH,
  type AssessmentRecord,
  type AssessmentUnit,
  type FingerForceSetup,
} from '@hackyeah/core';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { SavedNote } from '../components/SavedNote';
import { TabScreen } from '../components/TabScreen';
import { useDemo } from '../demo/DemoProvider';
import { useGame } from '../state/GameProvider';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { trailFor } from '../navigation/trail';
import { NumberField } from '../onboarding/NumberField';

export function FingerStrengthScreen() {
  const { colors } = useTheme();
  const { route, params, backTo } = useNavigation<RouteName>();
  const trail = trailFor(route, params);
  const demo = useDemo();
  const { saveAssessment } = useGame();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const [simulated, setSimulated] = useState(false);
  const [force, setForce] = useState('');
  const [instrument, setInstrument] = useState('');
  const [edge, setEdge] = useState('');
  const [effort, setEffort] = useState('');
  const [unit, setUnit] = useState<Extract<AssessmentUnit, 'N' | 'kgf'>>('N');
  const [side, setSide] = useState<AssessmentRecord['side']>();
  const [grip, setGrip] = useState<FingerForceSetup['grip']>();
  const [arm, setArm] = useState<FingerForceSetup['arm_position']>();
  const [review, setReview] = useState<AssessmentRecord | null>(null);
  const setup = {
    instrument: instrument.trim(),
    grip,
    edge_mm: Number(edge.replace(',', '.')),
    arm_position: arm,
    effort_seconds: Number(effort.replace(',', '.')),
  };
  const value = Number(force.replace(',', '.'));
  const valid =
    Number.isFinite(value) && value > 0 && !!side && isFingerForceSetup(setup);
  const saveResult = async () => {
    if (!review || savingRef.current || saved) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await saveAssessment(review);
      setSaved(true);
    } catch {
      setError(
        'Could not save this reading. Check your connection and try again.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const editReview = () => {
    if (!savingRef.current) {
      setReview(null);
    }
  };
  const reviewResult = () => {
    if (savingRef.current) {
      return;
    }
    setSaved(false);
    setError('');
    if (!valid || !isFingerForceSetup(setup)) {
      return;
    }
    setReview({
      id: `force-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      metric: 'finger_force',
      value,
      unit,
      method: 'manual',
      protocol: 'instrument-finger-force-v1',
      occurredAt: new Date().toISOString(),
      side,
      setup,
      simulated,
    });
  };
  return (
    <TabScreen
      completion={{
        disabled: saving,
        ...(review ? { onPress: editReview } : {}),
      }}
    >
      <View style={styles.column}>
        {review ? (
          <Breadcrumbs
            crumbs={[
              ...trail.map((step, i) => ({
                label: step.label,
                short: step.short,
                onPress:
                  i === trail.length - 1
                    ? editReview
                    : () => backTo(trail.slice(0, i + 1)),
              })),
              { label: 'Review' },
            ]}
          />
        ) : (
          <Crumbs />
        )}
        <PageHeader
          title="Finger strength"
          subtitle="The force your fingers hold on an edge, read from a gauge."
        />
        {simulated && !review ? (
          <AppText>
            Simulated instrument reading: example values, still reviewed before
            saving.
          </AppText>
        ) : null}
        {review ? (
          <Panel
            title="Review your reading"
            badge={review.simulated ? <Tag text="Simulated" /> : undefined}
          >
            <PixelText
              text={`${review.value} ${review.unit}`}
              scale={4}
              heading
              accessible={false}
            />
            <AppText>{`${review.value} ${
              review.unit === 'N' ? 'newtons' : 'kilogram-force'
            } · ${
              review.side === 'both' ? 'Both hands' : `${review.side} hand`
            }`}</AppText>
            {review.simulated ? (
              <AppText variant="caption">Simulated instrument reading</AppText>
            ) : null}
            <AppText variant="caption" muted>{`${
              review.setup!.instrument
            } · ${review.setup!.grip.replace('_', ' ')} · ${
              review.setup!.edge_mm
            } mm edge · ${review.setup!.arm_position} arm · ${
              review.setup!.effort_seconds
            } seconds`}</AppText>
            {saved ? null : (
              <AppText variant="caption" muted>
                Check the number and the setup. You typed them in, so the app
                cannot check them for you.
              </AppText>
            )}
            <Button
              title={saving ? 'Saving…' : saved ? 'Saved' : 'Save result'}
              disabled={saving || saved}
              onPress={saveResult}
            />
            {saved ? (
              <SavedNote
                title="Saved to your profile"
                lines={[
                  'Finger strength shows it next to your earlier readings. Compare readings taken with the same setup.',
                ]}
                next={[
                  {
                    title: 'See results',
                    accessibilityLabel: 'See finger strength results',
                    onPress: () =>
                      backTo(trail.slice(0, Math.max(1, trail.length - 1))),
                  },
                ]}
              />
            ) : null}
            {error ? (
              <AppText accessibilityRole="alert">{error}</AppText>
            ) : null}
            <Button
              title={saved ? 'Record another reading' : 'Edit reading'}
              disabled={saving}
              variant="secondary"
              onPress={editReview}
            />
          </Panel>
        ) : (
          <Panel title="Instrument reading">
            <AppText>
              Pull on a force gauge or load cell for a few seconds, then type in
              what it read. Stop if it hurts.
            </AppText>
            <NumberField
              label="Force"
              unit={unit === 'N' ? 'newtons' : 'kilogram-force'}
              value={force}
              onChangeText={setForce}
              accessibilityLabel="Force reading"
              maxLength={12}
            />
            <View style={styles.choices}>
              <Chip
                label="Newtons (N)"
                selected={unit === 'N'}
                onPress={() => setUnit('N')}
              />
              <Chip
                label="Kilogram-force (kgf)"
                selected={unit === 'kgf'}
                onPress={() => setUnit('kgf')}
              />
            </View>
            <PixelText text="Instrument" />
            <TextInput
              value={instrument}
              onChangeText={setInstrument}
              accessibilityLabel="Instrument"
              maxLength={FINGER_INSTRUMENT_MAX_LENGTH}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.outline,
                },
              ]}
            />
            <PixelText text="Measured side" />
            <View style={styles.choices}>
              {(['left', 'right', 'both'] as const).map(choice => (
                <Chip
                  key={choice}
                  label={
                    choice === 'both'
                      ? 'Both hands'
                      : `${choice === 'left' ? 'Left' : 'Right'} hand`
                  }
                  selected={side === choice}
                  onPress={() => setSide(choice)}
                />
              ))}
            </View>
            <PixelText text="Grip" />
            <View style={styles.choices}>
              {(['open_hand', 'half_crimp', 'full_crimp'] as const).map(
                (choice, i) => (
                  <Chip
                    key={choice}
                    label={['Open hand', 'Half crimp', 'Full crimp'][i]}
                    selected={grip === choice}
                    onPress={() => setGrip(choice)}
                  />
                ),
              )}
            </View>
            <NumberField
              label="Edge depth"
              unit="mm"
              value={edge}
              onChangeText={setEdge}
              accessibilityLabel="Edge depth in millimetres"
              maxLength={8}
            />
            <PixelText text="Arm position" />
            <View style={styles.choices}>
              <Chip
                label="Straight arm"
                selected={arm === 'straight'}
                onPress={() => setArm('straight')}
              />
              <Chip
                label="Bent arm"
                selected={arm === 'bent'}
                onPress={() => setArm('bent')}
              />
            </View>
            <NumberField
              label="Effort duration"
              unit="seconds"
              value={effort}
              onChangeText={setEffort}
              accessibilityLabel="Effort duration in seconds"
              maxLength={8}
            />
            <AppText variant="caption" muted>
              Fill in every field to review. Nothing is saved until you
              confirm the review.
            </AppText>
            {demo.settings.enabled && demo.settings.testResults ? (
              <Button
                title="Fill example reading"
                variant="secondary"
                onPress={() => {
                  setForce('320');
                  setUnit('N');
                  setInstrument('Demo load cell');
                  setSide('left');
                  setGrip('half_crimp');
                  setEdge('20');
                  setArm('straight');
                  setEffort('5');
                  setSimulated(true);
                }}
              />
            ) : null}
            <Button
              title="Review result"
              disabled={saving || !valid}
              onPress={reviewResult}
            />
          </Panel>
        )}
      </View>
    </TabScreen>
  );
}
const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: { minHeight: 48, padding: 12, fontSize: 18, borderWidth: PX },
});
