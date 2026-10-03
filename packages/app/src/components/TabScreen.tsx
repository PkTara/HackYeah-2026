import type { ReactNode } from 'react';
import { View } from 'react-native';
import { XP_PER_LEVEL, XP_PER_QUEST } from '@hackyeah/core';
import {
  AppText,
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

type TabRoute = Extract<RouteName, 'Profile' | 'Log' | 'Hands' | 'Tests'>;

const TABS: readonly Tab<TabRoute>[] = [
  { key: 'Profile', label: 'Profile', icon: 'profile' },
  { key: 'Log', label: 'Log', icon: 'log' },
  { key: 'Hands', label: 'Hands', icon: 'hands' },
  { key: 'Tests', label: 'Tests', icon: 'tests' },
];

type Props = {
  children: ReactNode;
  hero?: ReactNode;
};

const isTab = (route: RouteName | undefined): route is TabRoute =>
  TABS.some(t => t.key === route);

/**
 * Screen with app navigation: a tab bar at the bottom on phones, a side rail
 * on wide screens. The active tab is the root of the navigation stack, or the
 * tab a linked screen belongs to (a link to a finger close-up shows Hands).
 */
export function TabScreen({ children, hero }: Props) {
  const { root, reset } = useNavigation<RouteName>();
  const home = trailFor(root, {})[0]?.route;
  const active: TabRoute = isTab(root) ? root : isTab(home) ? home : 'Profile';
  return (
    <Screen
      hero={hero}
      footer={<TabBar tabs={TABS} active={active} onSelect={reset} />}
      rail={
        <NavRail
          tabs={TABS}
          active={active}
          onSelect={reset}
          header={<RailHeader />}
          footer={<RailLevel />}
        />
      }
    >
      {children}
    </Screen>
  );
}

function RailHeader() {
  const { pet } = useGame();
  return (
    <View style={{ gap: 10 }}>
      <Monkey scale={3} cosmetics={pet.cosmetics} />
      <PixelText text={'Climbing\nMonkey'} heading scale={3} shadow="#22180F" />
    </View>
  );
}

function RailLevel() {
  const { pet } = useGame();
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
