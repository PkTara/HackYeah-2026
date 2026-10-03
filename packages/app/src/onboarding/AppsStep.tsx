/**
 * Connect other apps. None of these integrations is built yet, so the step
 * says so plainly: agreeing only records a demo connection and reads nothing.
 * Each app asks on its own, and its consent screen lists what it would and
 * would never read.
 */
import { StyleSheet, View } from 'react-native';
import {
  CONNECTIONS,
  type ConnectionChoice,
  type ConnectionId,
} from '@hackyeah/core';
import {
  AppText,
  Button,
  PX,
  Panel,
  PixelText,
  Tag,
  useTheme,
} from '@hackyeah/ui';

type Choices = Readonly<Partial<Record<ConnectionId, ConnectionChoice>>>;

export function AppsStep({
  apps,
  choices,
  onAsk,
  onChoose,
}: {
  apps: readonly ConnectionId[];
  choices: Choices;
  /** Opens the consent screen for one app. */
  onAsk: (id: ConnectionId) => void;
  /** Records a choice, or clears it with null. */
  onChoose: (id: ConnectionId, choice: ConnectionChoice | null) => void;
}) {
  return (
    <Panel title="Your apps" badge={<Tag text="Optional" tone="muted" />}>
      <AppText>
        Each app asks for your OK on its own. These connections are not built
        yet, so agreeing only saves your choice. Nothing is read.
      </AppText>
      {apps.map(id => (
        <AppRow
          key={id}
          id={id}
          choice={choices[id]}
          onConnect={() => onAsk(id)}
          onChoose={choice => onChoose(id, choice)}
        />
      ))}
    </Panel>
  );
}

function AppRow({
  id,
  choice,
  onConnect,
  onChoose,
}: {
  id: ConnectionId;
  choice: ConnectionChoice | undefined;
  onConnect: () => void;
  onChoose: (choice: ConnectionChoice | null) => void;
}) {
  const { colors: c } = useTheme();
  const info = CONNECTIONS[id];
  return (
    <View
      style={[styles.card, { backgroundColor: c.surfaceLight, borderColor: c.outline }]}
    >
      <View style={styles.head}>
        <PixelText text={info.name} heading />
        {choice === 'demo' ? (
          <Tag text="Demo" />
        ) : choice === 'declined' ? (
          <Tag text="Not now" tone="muted" />
        ) : null}
      </View>
      {choice === 'demo' ? (
        <AppText variant="caption">
          Connected (demo). Nothing is read in this build.
        </AppText>
      ) : (
        <AppText variant="caption" muted>
          Would read: {info.reads}
        </AppText>
      )}
      <View style={styles.buttons}>
        {choice === 'demo' ? (
          <Button
            title="Disconnect"
            variant="secondary"
            small
            accessibilityLabel={`Disconnect ${info.name}`}
            onPress={() => onChoose(null)}
          />
        ) : (
          <>
            <Button
              title="Connect"
              variant={choice === 'declined' ? 'secondary' : 'primary'}
              small
              accessibilityLabel={`Connect ${info.name}`}
              onPress={onConnect}
            />
            {choice === 'declined' ? null : (
              <Button
                title="Not now"
                variant="secondary"
                small
                accessibilityLabel={`Not now for ${info.name}`}
                onPress={() => onChoose('declined')}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

/** One app's permission, in plain words, with a clear yes and no. */
export function ConsentStep({
  id,
  onChoose,
}: {
  id: ConnectionId;
  onChoose: (choice: ConnectionChoice) => void;
}) {
  const { colors: c } = useTheme();
  const info = CONNECTIONS[id];
  return (
    <Panel title={info.name} badge={<Tag text="Demo" />}>
      <View style={styles.section}>
        <PixelText text="It would read" />
        <AppText>{info.reads}</AppText>
      </View>
      <View style={styles.section}>
        <PixelText text="It never reads" />
        <AppText>{info.neverReads}</AppText>
      </View>
      <View
        style={[styles.note, { backgroundColor: c.surfaceShade, borderColor: c.outline }]}
      >
        <AppText variant="caption">
          This build cannot connect to {info.name} yet. Allow saves your choice
          as a demo connection, and nothing is read.
        </AppText>
      </View>
      <Button
        title="Allow (demo)"
        icon="check"
        accessibilityLabel={`Allow ${info.name} (demo)`}
        onPress={() => onChoose('demo')}
      />
      <Button
        title="Not now"
        variant="secondary"
        accessibilityLabel={`Not now for ${info.name}`}
        onPress={() => onChoose('declined')}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: PX, padding: 12, gap: 8 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { gap: 4 },
  note: { borderWidth: PX - 1, padding: 10 },
});
