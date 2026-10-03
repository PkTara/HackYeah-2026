import type { ReactNode } from 'react';
import { Screen, TabBar, type Tab } from '@hackyeah/ui';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';

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

/** Screen with the bottom tab bar. The active tab is the root of the stack. */
export function TabScreen({ children, hero }: Props) {
  const { root, reset } = useNavigation<RouteName>();
  const active = TABS.some(t => t.key === root) ? (root as TabRoute) : 'Profile';
  return (
    <Screen
      hero={hero}
      footer={<TabBar tabs={TABS} active={active} onSelect={reset} />}
    >
      {children}
    </Screen>
  );
}
