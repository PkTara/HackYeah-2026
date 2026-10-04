import { useState } from 'react';
import { CONNECTION_IDS, CONNECTIONS } from '@hackyeah/core';
import { AppText, Button, Panel, Tag } from '@hackyeah/ui';
import { useDemo } from './DemoProvider';

export function IntegrationsPanel() {
  const demo = useDemo();
  const [synced, setSynced] = useState(false);
  if (!demo.settings.enabled) {
    return null;
  }
  const providers = CONNECTION_IDS.filter(id => demo.settings.connections[id]);
  return (
    <Panel title="Connected activity" badge={<Tag text="Demo data" />}>
      <AppText variant="caption">
        Example imports. Workouts provide activity context; they do not invent
        route grades or climbing scores.
      </AppText>
      {providers.length ? (
        providers.map(id => (
          <AppText key={id}>
            {id === 'strava'
              ? 'Strava: Bouldering, 60 min'
              : `${CONNECTIONS[id].name}: Sleep, 7 h 45 min`}
            {id === 'strava'
              ? ''
              : '\n' +
                CONNECTIONS[id].name +
                ': ' +
                (id === 'garmin' ? 'Running, 25 min' : 'Climbing, 45 min')}
          </AppText>
        ))
      ) : (
        <AppText>
          No simulated integrations selected. Real connections are unavailable
          in this build.
        </AppText>
      )}
      {providers.length ? (
        <Button
          title="Sync demo integrations"
          variant="secondary"
          small
          onPress={() => setSynced(true)}
        />
      ) : null}
      {synced && providers.length ? (
        <AppText accessibilityLiveRegion="polite">
          Demo sync complete. Example workouts and sleep refreshed.
        </AppText>
      ) : null}
    </Panel>
  );
}
