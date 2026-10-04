import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  RADAR_LEVEL_NAME,
  explainMovementAxis,
  explainMovementRadar,
  movementRadar,
  radarNextStep,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  Disclosure,
  Divider,
  MovementRadar,
  PixelText,
  SampleMark,
  useLayout,
  useTheme,
} from '@hackyeah/ui';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';
import { DecisionHelp, ExplanationSheet } from './DecisionHelp';

/**
 * The movement radar on Profile, under the style list in the same panel:
 * five axes scored from the climber's own climbs and home tests by the rule
 * in packages/core/src/movement.ts. Each axis name opens the same WHY?
 * sheet as the ? beside its row below.
 */
export function MovementRadarSection() {
  const { state } = useGame();
  const { reset } = useNavigation<RouteName>();
  const { colors: c } = useTheme();
  // One column at every width (at most 640 px): a bigger chart when it fits.
  const { mainWidth, gutter, contentMax } = useLayout();
  const column = Math.min(mainWidth - 2 * gutter, contentMax);
  const scale = column >= 560 ? 5 : column >= 470 ? 4 : 3;
  const [open, setOpen] = useState<number | null>(null);

  const scores = useMemo(
    () =>
      movementRadar({
        logs: state.logs,
        baseline: state.baseline,
        assessments: state.assessments,
      }),
    [state.logs, state.baseline, state.assessments],
  );
  const axes = useMemo(
    () =>
      scores.map(score => ({
        label: score.name,
        value: score.value,
        level: RADAR_LEVEL_NAME[score.level],
      })),
    [scores],
  );
  const scored = scores.filter(score => score.scored);
  const sample = scored.some(score => score.sample || score.test?.simulated);
  const selected = open === null ? null : scores[open];

  return (
    <View style={styles.section}>
      <Divider />
      <DecisionHelp
        label="Movement radar"
        explanation={explainMovementRadar(scores)}
      >
        <PixelText text="Movement radar" scale={3} heading />
      </DecisionHelp>
      <AppText variant="caption" muted>
        Five axes from the styles above, your walls and three home tests. Tap
        a name to see why.
      </AppText>

      <MovementRadar
        axes={axes}
        example={sample}
        scale={scale}
        onSelect={setOpen}
      />
      {sample ? <SampleMark text="Includes sample climbs." /> : null}

      <View
        style={[
          styles.next,
          { backgroundColor: c.surfaceShade, borderColor: c.outline },
        ]}
      >
        <PixelText text={scored.length ? 'Next step' : 'Not scored yet'} />
        {scored.length ? null : (
          <AppText variant="caption">
            No axis has enough data. Each needs 3 matching climbs or its home
            test.
          </AppText>
        )}
        <AppText>{radarNextStep(scores)}</AppText>
        <View style={styles.buttons}>
          <Button
            title="Climb log"
            variant="secondary"
            small
            onPress={() => reset('Log')}
          />
          <Button
            title="Home tests"
            variant="secondary"
            small
            onPress={() => reset('Data')}
          />
        </View>
      </View>

      <Disclosure title="How each axis is scored">
        {scores.map(score => (
          <DecisionHelp
            key={score.axis}
            label={`${score.name} axis`}
            title={score.name}
            explanation={explainMovementAxis(score, state.logs)}
          >
            <View style={styles.row}>
              <PixelText text={score.name} />
              <AppText variant="caption" muted={!score.scored}>
                {RADAR_LEVEL_NAME[score.level]}
                {score.scored
                  ? `, ${score.points} ${score.points === 1 ? 'point' : 'points'}`
                  : ''}
              </AppText>
            </View>
          </DecisionHelp>
        ))}
        <AppText variant="caption" muted>
          A sent climb that matches an axis is 1 point, and a home test adds up
          to 3. Started under 4 points, Building from 4, Established from 8.
          A summary of your records, not a skill test.
        </AppText>
      </Disclosure>

      {/* An axis name opens its sheet straight away. */}
      {selected ? (
        <ExplanationSheet
          visible
          onClose={() => setOpen(null)}
          label={`${selected.name} axis`}
          title={selected.name}
          explanation={explainMovementAxis(selected, state.logs)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  next: { borderWidth: 3, padding: 10, gap: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
