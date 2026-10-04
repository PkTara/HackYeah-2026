import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ageLabel, shortDate } from '@hackyeah/core';
import { AppText, Button, PX, Panel, PixelText, useTheme } from '@hackyeah/ui';
import { nextHomeTest, reachSaved } from '../afterSave';
import { DecisionHelp } from '../components/DecisionHelp';
import { explainReach } from '../components/resultExplanations';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { SavedNote } from '../components/SavedNote';
import { TabScreen } from '../components/TabScreen';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { trailFor } from '../navigation/trail';
import { useGame } from '../state/GameProvider';
const MIN_CM = 100;
const MAX_CM = 250;
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

export function BodyReachScreen() {
  return (
    <TabScreen>
      <View style={styles.column}>
        <Crumbs />
        <PageHeader
          title="Body & reach"
          subtitle="Arm span and height describe your reach. They are never scored as a weakness."
        />
        <ReachPanel />
      </View>
    </TabScreen>
  );
}

/** Manual arm span and height. */
function ReachPanel() {
  const { state, today, saveReach, syncError } = useGame();
  const navigation = useNavigation<RouteName>();
  const reach = state.reach;
  const { colors: c } = useTheme();
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
  const toData = () => {
    const trail = trailFor(navigation.route, navigation.params);
    if (trail.length > 1) {
      navigation.backTo(trail.slice(0, -1));
    } else {
      navigation.reset('Data');
    }
  };
  const message = reach ? reachSaved(reach.armSpanCm, reach.heightCm) : null;
  const nextTest = nextHomeTest(state.baseline);

  return (
    <Panel title="Measure">
      <AppText>
        Arms out wide, fingertip to fingertip. Then your height, without shoes.
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
        <View style={styles.field}>
          <PixelText text="Ape index" />
          <View
            style={[
              styles.input,
              { backgroundColor: c.surfaceShade, borderColor: c.outline },
            ]}
          >
            <AppText style={styles.derivedValue}>
              {parseCm(arm) !== null && parseCm(height) !== null
                ? signedCm(Number(arm) - Number(height))
                : 'None yet'}
            </AppText>
          </View>
          <AppText variant="caption" muted>
            Arm span minus height
          </AppText>
        </View>
      </View>

      {reach ? (
        <View style={styles.saved}>
          <AppText variant="caption" muted style={styles.grow}>
            Saved {ageLabel(reach.date, today)} ({shortDate(reach.date)})
          </AppText>
          <DecisionHelp
            label="reach difference"
            explanation={explainReach(reach)}
          />
        </View>
      ) : null}
      <Button title="Save reach" icon="check" onPress={save} />
      {/* If the save fails, the app's sync notice shows instead. */}
      {saved && message && !syncError ? (
        <SavedNote
          title={message.title}
          lines={message.lines}
          next={[
            ...(nextTest
              ? [
                  {
                    title: `Next: ${nextTest.name}`,
                    onPress: () => navigation.navigate('Test', { id: nextTest.id }),
                  },
                ]
              : []),
            {
              title: 'Done',
              accessibilityLabel: 'Done, return to Data',
              onPress: toData,
            },
          ]}
        />
      ) : null}
    </Panel>
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

const styles = StyleSheet.create({
  // A short form reads best as a phone-width column, even on a wide screen.
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 120, gap: 6 },
  input: {
    minHeight: 48,
    borderWidth: PX,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 20,
    fontWeight: '800',
  },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  derivedValue: { fontSize: 20, fontWeight: '800' },
});
