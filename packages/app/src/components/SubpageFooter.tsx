import { View } from 'react-native';
import { Button, spacing } from '@hackyeah/ui';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { trailFor } from '../navigation/trail';

export type SubpageCompletion = {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
};
const PRIMARY = new Set<RouteName>([
  'Profile',
  'Log',
  'Hands',
  'Data',
  'Tests',
]);

/** A second, bottom-of-page return path paired with the canonical breadcrumbs. */
export function SubpageFooter({
  title = 'Close',
  onPress,
  disabled = false,
}: SubpageCompletion) {
  const navigation = useNavigation<RouteName>();
  if (PRIMARY.has(navigation.route)) {
    return null;
  }
  const close = () => {
    if (disabled) {
      return;
    }
    if (onPress) {
      onPress();
      return;
    }
    const trail = trailFor(navigation.route, navigation.params);
    if (trail.length > 1) {
      navigation.backTo(trail.slice(0, -1));
    } else if (navigation.canGoBack) {
      navigation.goBack();
    } else {
      navigation.reset('Data');
    }
  };
  return (
    <View style={{ paddingTop: spacing.md, paddingBottom: spacing.sm }}>
      <Button
        title={title}
        variant="secondary"
        disabled={disabled}
        onPress={close}
      />
    </View>
  );
}
