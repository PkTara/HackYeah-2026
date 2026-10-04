import type { ReactNode } from 'react';
import { View } from 'react-native';
import { XP_PER_LEVEL, XP_PER_QUEST } from '@hackyeah/core';
import {
  AppText,
  Gazelle,
  Meter,
  Monkey,
  NavRail,
  PixelText,
  Screen,
  TabBar,
  type Tab,
} from '@hackyeah/ui';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { trailFor } from '../navigation/trail';
import { useGame } from '../state/GameProvider';
import { useDemo } from '../demo/DemoProvider';
import { useRun } from '../state/RunProvider';

type TabRoute = Extract<
  RouteName,
  'Profile' | 'Log' | 'Hands' | 'Data' | 'Run' | 'RunLog' | 'Legs'
>;

const TABS: readonly Tab<TabRoute>[] = [
  { key: 'Profile', label: 'Profile', icon: 'profile' },
  { key: 'Log', label: 'Log', icon: 'log' },
  { key: 'Hands', label: 'Hands', icon: 'hands' },
  { key: 'Data', label: 'Data', icon: 'tests' },
];

/** Gazelle mode: same shape, with Legs in place of Hands and no Tests yet. */
const GAZELLE_TABS: readonly Tab<TabRoute>[] = [
  { key: 'Run', label: 'Profile', icon: 'profile' },
  { key: 'RunLog', label: 'Log', icon: 'log' },
  { key: 'Legs', label: 'Legs', icon: 'shoe' },
];

type Props = {
  children: ReactNode;
  hero?: ReactNode;
};

const isTab = (route: RouteName | undefined): route is TabRoute =>
  [...TABS, ...GAZELLE_TABS].some(t => t.key === route);

/**
 * Screen with app navigation: a tab bar at the bottom on phones, a side rail
 * on wide screens. The active tab is the root of the navigation stack, or the
 * tab a linked screen belongs to (a link to a finger close-up shows Hands).
 */
export function TabScreen({ children, hero }: Props) {
  const demo = useDemo();
  const { root, reset } = useNavigation<RouteName>();
  const { mode } = useRun();
  const tabs = mode === 'gazelle' ? GAZELLE_TABS : TABS;
  const home = trailFor(root, {})[0]?.route;
  const active: TabRoute = isTab(root)
    ? root
    : isTab(home)
      ? home
      : tabs[0].key;
  return (
    <Screen
      hero={hero}
      footer={<TabBar tabs={tabs} active={active} onSelect={reset} />}
      rail={
        <NavRail
          tabs={tabs}
          active={active}
          onSelect={reset}
          header={<RailHeader />}
          footer={<RailLevel />}
        />
      }
    >
      {/* Runs are not part of the demo profile, so gazelle mode says nothing. */}
      {demo.settings.enabled && mode !== 'gazelle' ? (
        <AppText variant="caption">
          Demo: records stay in the separate demo profile.
        </AppText>
      ) : null}
      {children}
    </Screen>
  );
}

function RailHeader() {
  const { pet } = useGame();
  const { mode, pet: gazelle } = useRun();
  return (
    <View style={{ gap: 10 }}>
      {mode === 'gazelle' ? (
        <Gazelle scale={3} cosmetics={gazelle.cosmetics} />
      ) : (
        <Monkey scale={3} cosmetics={pet.cosmetics} />
      )}
      <PixelText
        text={mode === 'gazelle' ? 'Running\nGazelle' : 'Climbing\nMonkey'}
        heading
        scale={3}
        shadow="#22180F"
      />
    </View>
  );
}

/** The active pet's level, at the bottom of the rail. */
function RailLevel() {
  const { pet: monkey } = useGame();
  const { mode, pet: gazelle } = useRun();
  const pet = mode === 'gazelle' ? gazelle : monkey;
  const steps = XP_PER_LEVEL / XP_PER_QUEST;
  return (
    <View style={{ gap: 6 }}>
      <PixelText text={`Lvl ${pet.level}`} scale={3} />
      <Meter
        value={pet.xpInLevel / XP_PER_QUEST}
        segments={steps}
        height={12}
        accessibilityLabel={`${pet.xpInLevel} of ${XP_PER_LEVEL} XP to level ${
          pet.level + 1
        }`}
      />
      <AppText variant="caption" muted>
        {pet.xpInLevel} / {XP_PER_LEVEL} XP
      </AppText>
    </View>
  );
}
