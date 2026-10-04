/** Welcome and the questions about the climber, one per step. */
import { StyleSheet, View } from 'react-native';
import {
  CLIMB_PLACES,
  EXPERIENCES,
  EXPERIENCE_LABEL,
  GOALS,
  GOAL_LABEL,
  PLACE_LABEL,
  USUAL_GRADES,
  gradeLabel,
  type ClimbPlace,
  type ClimbingGoal,
  type Experience,
  type UsualGrade,
} from '@hackyeah/core';
import { AppText, Chip, Panel, Tag, type IconName } from '@hackyeah/ui';
import { DecisionHelp } from '../components/DecisionHelp';
import { NumberedList } from './bits';
import { NumberField } from './NumberField';

export function WelcomeStep() {
  return (
    <Panel title="Setup">
      <AppText>A few quick questions, one at a time. About 2 minutes.</AppText>
      <NumberedList
        items={[
          'How you climb and what you want from it',
          'Your height and arm span, if you like',
          'Apps you already use, if you like',
          'Six quick tests at home, if you like',
        ]}
      />
      <AppText variant="caption" muted>
        Only the first four are needed. Anything skipped can be added later
        on the Data tab.
      </AppText>
    </Panel>
  );
}

/** Shown under a question until it has an answer. */
function PickHint({ show, text }: { show: boolean; text: string }) {
  return (
    <AppText variant="caption" muted>
      {show ? text : ' '}
    </AppText>
  );
}

const PLACE_ICON: Readonly<Record<ClimbPlace, IconName>> = {
  'bouldering-gym': 'overhang',
  'rope-gym': 'vertical',
  outdoors: 'leaf',
};

export function PlacesStep({
  places,
  onToggle,
}: {
  places: readonly ClimbPlace[];
  onToggle: (place: ClimbPlace) => void;
}) {
  return (
    <Panel title="Where you climb">
      <View style={styles.stack}>
        {CLIMB_PLACES.map(place => {
          const selected = places.includes(place);
          return (
            <Chip
              key={place}
              label={PLACE_LABEL[place]}
              icon={selected ? 'check' : PLACE_ICON[place]}
              selected={selected}
              onPress={() => onToggle(place)}
            />
          );
        })}
      </View>
      <AppText variant="caption" muted>
        Pick one or more.
      </AppText>
    </Panel>
  );
}

export function ExperienceStep({
  value,
  onPick,
}: {
  value: Experience | null;
  onPick: (value: Experience) => void;
}) {
  return (
    <Panel title="How long">
      <View style={styles.stack}>
        {EXPERIENCES.map(e => (
          <Chip
            key={e}
            label={EXPERIENCE_LABEL[e]}
            selected={value === e}
            onPress={() => onPick(e)}
          />
        ))}
      </View>
      <PickHint show={value === null} text="Pick one to go on." />
    </Panel>
  );
}

export function GradeStep({
  value,
  onPick,
}: {
  value: UsualGrade | null;
  onPick: (value: UsualGrade) => void;
}) {
  return (
    <Panel title="Usual grade">
      <View style={[styles.grid]}>
        {USUAL_GRADES.map(g => (
          <View key={g} style={g === 'not-sure' ? styles.wide : styles.cell}>
            <Chip
              label={gradeLabel(g)}
              selected={value === g}
              onPress={() => onPick(g)}
            />
          </View>
        ))}
      </View>
      <AppText variant="caption" muted>
        Bouldering grades. Pick what you send most sessions, not your best ever.
      </AppText>
      <PickHint show={value === null} text="Pick one to go on." />
    </Panel>
  );
}

export function GoalStep({
  value,
  onPick,
}: {
  value: ClimbingGoal | null;
  onPick: (value: ClimbingGoal) => void;
}) {
  return (
    <Panel title="Your goal">
      <View style={styles.stack}>
        {GOALS.map(goal => (
          <Chip
            key={goal}
            label={GOAL_LABEL[goal]}
            selected={value === goal}
            onPress={() => onPick(goal)}
          />
        ))}
      </View>
      <PickHint show={value === null} text="Pick one to go on." />
    </Panel>
  );
}

export type BodyText = Readonly<{ height: string; arm: string }>;

export function BodyStep({
  text,
  errors,
  onChange,
  onSubmit,
}: {
  text: BodyText;
  errors: Readonly<{ height: string | null; arm: string | null }>;
  onChange: (text: BodyText) => void;
  onSubmit: () => void;
}) {
  return (
    <Panel title="Reach" badge={<Tag text="Optional" tone="muted" />}>
      <AppText>
        Stand with your arms out wide and measure fingertip to fingertip. Then
        measure your height without shoes.
      </AppText>
      <View style={styles.fields}>
        <NumberField
          label="Height"
          unit="cm"
          value={text.height}
          error={errors.height}
          onChangeText={height => onChange({ ...text, height })}
          onSubmit={onSubmit}
          accessibilityLabel="Height in cm"
        />
        <NumberField
          label="Arm span"
          unit="cm"
          value={text.arm}
          error={errors.arm}
          onChangeText={arm => onChange({ ...text, arm })}
          onSubmit={onSubmit}
          accessibilityLabel="Arm span in cm"
        />
      </View>
      <DecisionHelp
        label="reach protocol"
        explanation={{
          summary: 'Manual height and arm span',
          status: 'app_rule',
          rule: 'Record the two measurements in whole centimetres. The Data tab shows ape index as arm span minus height.',
          evidence: [
            {
              id: 'reach-input',
              label: 'Current unsaved fields',
              detail: `Height: ${text.height || 'not entered'} cm; arm span: ${
                text.arm || 'not entered'
              } cm.`,
            },
          ],
          sourceIds: [],
          limitations: [
            'Self-reported body measurements. No local focus or quest rule uses these values. No ability score is inferred.',
          ],
        }}
      />
      <AppText variant="caption" muted>
        This only describes your reach. It is never scored as a weakness.
      </AppText>
    </Panel>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  // Four grades per row on any phone width; "Not sure" gets its own row.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexBasis: '20%', flexGrow: 1 },
  wide: { flexBasis: '100%' },
  fields: { flexDirection: 'row', gap: 12 },
});
