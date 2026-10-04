import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  Monkey,
  Panel,
  PixelText,
  Screen,
  useTheme,
} from '@hackyeah/ui';
import { useGame } from '../state/GameProvider';
import { DemoButton } from '../demo/DemoControls';

/** Shows a loading or retry screen until the first load from the backend works. */
export function StatusGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { status, retry } = useGame();

  if (status === 'ready') {
    return <>{children}</>;
  }

  return (
    <Screen>
      <View
        style={{ alignItems: 'center', gap: theme.spacing.lg, paddingTop: 80 }}
      >
        <Monkey scale={5} still={status === 'error'} />
        {status === 'loading' ? (
          <PixelText
            text="Loading"
            scale={4}
            color={theme.colors.onBackground}
            shadow={theme.colors.backgroundDeep}
          />
        ) : (
          <Panel
            title="No signal"
            variant="alert"
            style={{ alignSelf: 'stretch' }}
          >
            <AppText>
              Could not load your climbs. Check your connection and try again.
            </AppText>
            <Button title="Try again" onPress={retry} />
          </Panel>
        )}
        <DemoButton />
      </View>
    </Screen>
  );
}
