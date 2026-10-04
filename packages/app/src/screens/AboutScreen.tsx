import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Column,
  Columns,
  Icon,
  Monkey,
  Panel,
  PixelText,
  useLayout,
} from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { ResearchList } from '../components/DecisionHelp';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { useGame } from '../state/GameProvider';
import { DemoButton } from '../demo/DemoControls';

const PACKAGES = [
  {
    name: 'core',
    text: 'Rules and data: climbs, the focus, quests and XP. Plain TypeScript with tests.',
  },
  {
    name: 'data',
    text: 'Loads and saves your climbs, on this device or through a server.',
  },
  {
    name: 'platform',
    text: 'Services for each OS, like storage and haptics.',
  },
  {
    name: 'ui',
    text: 'The pixel kit. Drawn with plain Views, so it needs no SVG, images or font files and runs the same on phones and the web.',
  },
  {
    name: 'app',
    text: 'The screens and navigation.',
  },
] as const;

const HONEST_BITS = [
  'Record provenance is available in the question-mark explanations.',
  'Quest content is a draft. A climbing coach should review it.',
  'Nothing here is medical advice.',
] as const;

export function AboutScreen() {
  const { platform, platformLabel, haptics } = useCapabilities();
  const { backendKind } = useGame();
  const wide = useLayout().columns === 2;

  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="About"
        subtitle="Climbing Monkey, a HackYeah 2026 prototype."
      />
      <DemoButton parent="About" />

      {/* Wide screens put the honest bits under Platform, so the two columns
          come out about even. Phones keep them last, after How it is built. */}
      <Columns>
        <Column>
          <Panel title="Platform">
            <Fact label="Adapter" value={platform} />
            <Fact label="OS" value={platformLabel} />
            <Fact
              label="Haptics"
              value={haptics.isAvailable ? 'Available' : 'Not available'}
            />
            <Fact
              label="Data"
              value={
                backendKind === 'local'
                  ? 'Stored on this device'
                  : 'Synced with the server'
              }
            />
            <AppText variant="caption" muted>
              Each OS plugs in its own adapter. The screens never check which
              one they run on.
            </AppText>
          </Panel>
          <CreditsPanel />
          {wide ? <HonestBits /> : null}
        </Column>

        <Column>
          <Panel title="How it is built">
            {PACKAGES.map(p => (
              <View key={p.name} style={styles.pkg}>
                <View style={styles.pkgName}>
                  <PixelText text={p.name} />
                  <AppText variant="caption" muted>
                    packages/{p.name}
                  </AppText>
                </View>
                <AppText>{p.text}</AppText>
              </View>
            ))}
          </Panel>
          {wide ? null : <HonestBits />}
        </Column>
      </Columns>
      <Panel title="How a suggestion is made">
        <AppText>
          You record climbs, finger flags and tests. Fixed app rules turn those
          records into your profile, your focus and one quest. Tap the small ?
          beside a result to see the records and the rule behind it.
        </AppText>
        <AppText variant="caption" muted>
          Notes are kept as notes: the app does not read them to make decisions.
          Home tests and reach are stored but do not change your focus or
          quests. A camera reading is an estimate you review before saving.
        </AppText>
      </Panel>
      <Panel title="Research">
        <AppText>
          Studies the team read while building the app, each with what it found.
          They are background only: none of them tested this app, its camera or
          its quests.
        </AppText>
        <ResearchList />
      </Panel>
    </TabScreen>
  );
}

const CREDITS = [
  'Sound effects made with ZzFX by Frank Force (MIT). Turn them on or off in Settings.',
  'Pose analysis on the server uses MediaPipe by Google (Apache-2.0).',
  'Phone camera: react-native-camera-kit and react-native-permissions (MIT).',
  'Research: the studies listed below belong to their authors and journals. Tap a title to open the original.',
] as const;

/** Third-party code credits. The sound effects switch is in Settings. */
function CreditsPanel() {
  return (
    <Panel title="Credits">
      {CREDITS.map(line => (
        <AppText key={line} variant="caption" muted>
          {line}
        </AppText>
      ))}
    </Panel>
  );
}

/** The caveats panel and the AI credit line under it. */
function HonestBits() {
  return (
    <>
      <Panel title="Honest bits">
        {HONEST_BITS.map(line => (
          <View key={line} style={styles.bullet}>
            <Icon name="leaf" />
            <AppText style={styles.grow}>{line}</AppText>
          </View>
        ))}
      </Panel>

      <View style={styles.credit}>
        <Monkey scale={2} still />
        <AppText variant="caption" muted style={styles.grow}>
          AI tools helped build this app. See AI_WORKFLOW.md for what we used
          and how we checked it.
        </AppText>
      </View>
    </>
  );
}

/** One label and value row, e.g. "OS  Web browser". */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <PixelText text={label} />
      <AppText style={styles.value}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 28,
  },
  value: { flexShrink: 1, textAlign: 'right' },
  pkg: { gap: 2 },
  pkgName: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  credit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
