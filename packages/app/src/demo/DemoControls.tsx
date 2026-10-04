import { Modal, View } from 'react-native';
import {
  AppText,
  Button,
  CheckRow,
  Column,
  Columns,
  Panel,
  Screen,
  Tag,
} from '@hackyeah/ui';
import { useDemo } from './DemoProvider';
import { CONNECTION_IDS, CONNECTIONS } from '@hackyeah/core';

export function DemoButton() {
  const demo = useDemo();
  if (!demo.storage) {
    return null;
  }
  return (
    <Button
      title="Demo controls"
      variant="secondary"
      small
      onPress={demo.open}
    />
  );
}

export function DemoControls() {
  const demo = useDemo();
  if (!demo.visible) {
    return null;
  }
  return (
    <Modal visible onRequestClose={demo.close} animationType="slide">
      <Screen>
        <View
          style={{
            gap: 12,
            width: '100%',
            maxWidth: 1000,
            alignSelf: 'center',
          }}
        >
          <Panel
            title="Demo controls"
            badge={
              <Tag text={demo.settings.enabled ? 'Demo on' : 'Demo off'} />
            }
          >
            <AppText>
              Choose what to simulate. Demo records use a separate profile;
              switching off brings your normal profile back.
            </AppText>
            <CheckRow
              name="Demo mode"
              detail="Use a separate demo profile."
              checked={demo.settings.enabled}
              tone="agree"
              onPress={() => demo.update({ enabled: !demo.settings.enabled })}
            />
            <Button title="Close demo controls" small onPress={demo.close} />
          </Panel>
          <Columns>
            <Column>
              <Panel title="Profile">
                <CheckRow
              name="Sample profile"
              tone="agree"
                  detail="Example climbs, hand flags, tests and 40 XP."
                  checked={demo.settings.profile}
                  onPress={() =>
                    demo.update({ profile: !demo.settings.profile })
                  }
                />
              </Panel>
              <Panel title="Camera and media">
                <AppText variant="caption">
                  Tick to simulate, untick to use the real service. Real webcam
                  + simulated analysis works without a pose model.
                </AppText>
                <CheckRow
                  name="Webcam input"
                  detail="Use an animated sample instead of the real camera."
                  tone="agree"
                  checked={demo.settings.camera}
                  onPress={() => demo.update({ camera: !demo.settings.camera })}
                />
                <CheckRow
                  name="Analysis results"
                  detail="Simulate photo, clip and live pose results."
                  tone="agree"
                  checked={demo.settings.analysis}
                  onPress={() =>
                    demo.update({ analysis: !demo.settings.analysis })
                  }
                />
                <CheckRow
                  name="Hand-photo storage"
                  detail="Simulate saving hand photos and journal entries locally."
                  tone="agree"
                  checked={demo.settings.handPhotos}
                  onPress={() =>
                    demo.update({ handPhotos: !demo.settings.handPhotos })
                  }
                />
                <AppText variant="caption">
                  Real analysis and real photo storage need a real capture and a
                  configured backend. They use a separate demo server identity.
                </AppText>
              </Panel>
              <Panel title="Tests">
                <CheckRow
                  name="Home-test results"
                  detail="Offer example results without doing the exercises."
                  tone="agree"
                  checked={demo.settings.testResults}
                  onPress={() =>
                    demo.update({ testResults: !demo.settings.testResults })
                  }
                />
                <CheckRow
                  name="Unavailable tests"
                  detail="Show simulated previews for tests that need hardware or unfinished features."
                  tone="agree"
                  checked={demo.settings.previews}
                  onPress={() =>
                    demo.update({ previews: !demo.settings.previews })
                  }
                />
              </Panel>
            </Column>
            <Column>
              <Panel
                title="Health integrations"
                badge={<Tag text="Simulated" />}
              >
                <AppText>
                  Tick a provider to show example workouts and sleep on the
                  profile. Unticked providers are unavailable in this build.
                </AppText>
                {CONNECTION_IDS.map(id => (
                  <CheckRow
                    key={id}
                    name={CONNECTIONS[id].name}
                    detail={
                      id === 'strava'
                        ? 'Simulate workouts.'
                        : 'Simulate workouts and sleep.'
                    }
                    tone="agree"
                    checked={demo.settings.connections[id]}
                    onPress={() =>
                      demo.update({
                        connections: {
                          ...demo.settings.connections,
                          [id]: !demo.settings.connections[id],
                        },
                      })
                    }
                  />
                ))}
              </Panel>
            </Column>
          </Columns>
          <Panel title="Start the next demo">
            <AppText>
              Restore the sample climbs, flags, tests and monkey progress, and
              clear the local demo journal. Your mock switches stay as selected.
            </AppText>
            <Button
              title="Reset demo"
              disabled={!demo.settings.enabled}
              onPress={() => {
                demo.reset();
              }}
              variant="secondary"
            />
          </Panel>
          {demo.error ? (
            <AppText accessibilityRole="alert">{demo.error}</AppText>
          ) : null}
        </View>
      </Screen>
    </Modal>
  );
}
