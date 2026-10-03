import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { RAIL_WIDTH } from '../layout';
import { PX, useTheme } from '../theme';
import { ToneContext } from '../tone';
import { Icon } from './Icon';
import { PixelText } from './PixelText';
import type { Tab } from './TabBar';

type Props<Key extends string> = {
  tabs: readonly Tab<Key>[];
  active: Key;
  onSelect: (key: Key) => void;
  /** Top of the rail, e.g. the monkey and the app name. */
  header?: ReactNode;
  /** Bottom of the rail, e.g. the monkey's level. */
  footer?: ReactNode;
};

/** Side navigation for wide screens: a wooden plank down the left edge. */
export function NavRail<Key extends string>({
  tabs,
  active,
  onSelect,
  header,
  footer,
}: Props<Key>) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <ToneContext.Provider value={{ text: '#FFF4DC', textMuted: '#E8CFA6' }}>
      <View
        style={{
          width: RAIL_WIDTH,
          backgroundColor: c.barkDark,
          borderRightWidth: PX,
          borderRightColor: c.outline,
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          gap: theme.spacing.lg,
        }}
      >
        {header}
        <View accessibilityRole="tablist" style={{ gap: theme.spacing.sm }}>
          {tabs.map(tab => (
            <RailItem
              key={tab.key}
              tab={tab}
              selected={tab.key === active}
              onPress={() => onSelect(tab.key)}
            />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        {footer}
      </View>
    </ToneContext.Provider>
  );
}

function RailItem<Key extends string>({
  tab,
  selected,
  onPress,
}: {
  tab: Tab<Key>;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const ink = selected ? c.onPrimary : '#F4E2C0';
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      aria-selected={selected}
      onPress={onPress}
    >
      {({ pressed, hovered, focused }: { pressed: boolean; hovered?: boolean; focused?: boolean }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 48,
            paddingHorizontal: 12,
            backgroundColor: selected
              ? c.primary
              : pressed || hovered
                ? c.bark
                : 'transparent',
            borderWidth: PX,
            borderColor: selected || focused ? c.outline : 'transparent',
          }}
        >
          <Icon name={tab.icon} scale={3} color={ink} />
          <PixelText text={tab.label} color={ink} accessible={false} />
        </View>
      )}
    </Pressable>
  );
}
