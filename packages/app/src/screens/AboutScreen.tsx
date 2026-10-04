import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Column,
  Columns,
  Icon,
  Monkey,
  Panel,
  PixelText,
  Toggle,
  useLayout,
} from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { useSfx } from '../sfx';
import { TabScreen } from '../components/TabScreen';
import { useGame } from '../state/GameProvider';

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
  'Sample climbs are labelled Example.',
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
          <SoundPanel />
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
    </TabScreen>
  );
}

/**
 * The sound effects switch. It lives here because About is the app's only
 * settings page; the music keeps its own key in the corner.
 */
function SoundPanel() {
  const { available, on, setOn } = useSfx();
  return (
    <Panel title="Sound">
      {available ? (
        <Toggle
          name="Sound effects"
          detail="Quiet clicks, typing and a chime when you save. The music has its own key in the corner."
          value={on}
          onValueChange={setOn}
        />
      ) : (
        <AppText>Sound effects are not available on this device yet.</AppText>
      )}
      <AppText variant="caption" muted>
        Sound effects made with ZzFX by Frank Force (MIT).
      </AppText>
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
