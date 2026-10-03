import { Pressable, View } from 'react-native';
import type { IconName } from '../pixel/sprites';
import { PX, useTheme } from '../theme';
import { Icon } from './Icon';
import { PixelText } from './PixelText';

export type Tab<Key extends string> = Readonly<{
  key: Key;
  label: string;
  icon: IconName;
}>;

type Props<Key extends string> = {
  tabs: readonly Tab<Key>[];
  active: Key;
  onSelect: (key: Key) => void;
};

/** Bottom navigation: a wooden plank with one raised button per tab. */
export function TabBar<Key extends string>({
  tabs,
  active,
  onSelect,
}: Props<Key>) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: c.barkDark,
        borderTopWidth: PX,
        borderTopColor: c.outline,
        paddingHorizontal: 6,
        paddingTop: 6,
        paddingBottom: 8,
        gap: 6,
      }}
    >
      {tabs.map(tab => {
        const selected = tab.key === active;
        const ink = selected ? c.onPrimary : '#F4E2C0';
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            aria-selected={selected}
            onPress={() => onSelect(tab.key)}
            style={{ flex: 1 }}
          >
            {({ pressed }) => (
              <View
                style={{
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 6,
                  minHeight: 52,
                  justifyContent: 'center',
                  backgroundColor: selected ? c.primary : pressed ? c.bark : 'transparent',
                  borderWidth: PX,
                  borderColor: selected ? c.outline : 'transparent',
                }}
              >
                <Icon name={tab.icon} scale={2} color={ink} />
                <PixelText text={tab.label} color={ink} accessible={false} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
