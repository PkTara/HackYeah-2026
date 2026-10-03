import { StyleSheet } from 'react-native';
import { Button } from '@hackyeah/ui';
import { useNavigation } from '../navigation/Navigator';

/** Small Back key for screens pushed on top of a tab. Hidden at the root. */
export function BackButton() {
  const { canGoBack, goBack } = useNavigation();
  if (!canGoBack) {
    return null;
  }
  return (
    <Button
      title="Back"
      variant="secondary"
      small
      onPress={goBack}
      style={styles.back}
    />
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
});
