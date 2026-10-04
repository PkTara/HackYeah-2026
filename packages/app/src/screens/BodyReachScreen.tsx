import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ageLabel, shortDate } from '@hackyeah/core';
import {
  AppText,
  Button,
  Icon,
  PX,
  Panel,
  PixelText,
  useTheme,
} from '@hackyeah/ui';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
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
      <Crumbs />
      <PageHeader title="Body & reach" />
      <ReachPanel />
    </TabScreen>
  );
}

/** Manual arm span and height. */
function ReachPanel() {
  const { state, today, saveReach, syncError } = useGame();
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

  return (
    <Panel title="Body & reach">
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
        <View style={styles.field}>
          <PixelText text="Ape index" />
          <View
            style={[
              styles.input,
              { backgroundColor: c.surfaceLight, borderColor: c.outline },
            ]}
          >
            <AppText style={styles.derivedValue}>
              {parseCm(arm) !== null && parseCm(height) !== null
                ? signedCm(Number(arm) - Number(height))
                : 'Enter valid values'}
            </AppText>
          </View>
          <AppText variant="caption" muted>
            Arm span minus height
          </AppText>
        </View>
      </View>

      {reach ? (
        <AppText variant="caption" muted>
          Manual · {ageLabel(reach.date, today)} ({shortDate(reach.date)})
        </AppText>
      ) : null}
      <Button
        title="Save reach"
        variant="secondary"
        small
        icon="check"
        onPress={save}
      />
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
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  derivedValue: { fontSize: 20, fontWeight: '800' },
});
