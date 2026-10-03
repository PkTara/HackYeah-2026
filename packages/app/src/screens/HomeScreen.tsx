import { useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  counterReducer,
  initialCounterState,
  type CounterAction,
} from '@hackyeah/core';
import { AppText, Button, Card, Screen, useTheme } from '@hackyeah/ui';
import { useCapabilities } from '../capabilities';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';

export function HomeScreen() {
  const theme = useTheme();
  const { platformLabel, haptics } = useCapabilities();
  const { navigate } = useNavigation<RouteName>();
  const [state, dispatch] = useReducer(counterReducer, initialCounterState);

  const act = (action: CounterAction) => {
    haptics.tap();
    dispatch(action);
  };

  return (
    <Screen>
      <AppText variant="title">🌿 Climbing Monkey</AppText>
      <AppText muted>Your climbing camera and hand journal</AppText>
      <AppText muted>Running on {platformLabel}</AppText>

      <Card>
        <AppText variant="heading">Capture your session</AppText>
        <Button
          title="Camera assessment"
          onPress={() => navigate('Assessment')}
        />
        <Button
          title="Hand journal"
          variant="secondary"
          onPress={() => navigate('HandCapture')}
        />
      </Card>

      <Card>
        <AppText variant="heading">Counter</AppText>
        <AppText variant="title" accessibilityLabel="count">
          {state.count}
        </AppText>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <View style={styles.fill}>
            <Button
              title="−"
              variant="secondary"
              onPress={() => act({ type: 'decrement' })}
            />
          </View>
          <View style={styles.fill}>
            <Button title="+" onPress={() => act({ type: 'increment' })} />
          </View>
        </View>
        <Button
          title="Reset"
          variant="secondary"
          onPress={() => act({ type: 'reset' })}
        />
      </Card>

      <Button
        title="About this app"
        variant="secondary"
        onPress={() => navigate('About')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  fill: { flex: 1 },
});
