import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  addLiveSample,
  type MediaClient,
  type PoseReading,
} from '@hackyeah/data';
import {
  AppText,
  Button,
  CheckRow,
  Divider,
  Panel,
  PixelText,
  Tag,
  WarningSign,
  spacing,
} from '@hackyeah/ui';
import {
  CameraTray,
  NeedsServer,
  ReviewTray,
  ServerNote,
  Status,
} from '../capture/parts';
import { useCapture, type Capture } from '../capture/useCapture';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { useMedia } from '../media';
import { useDemo } from '../demo/DemoProvider';

export const NOT_VALIDATED =
  'A projected angle from the camera, not a validated flexibility test.';

/**
 * Camera assessment from the Tests tab: leg spread as the picture shows it.
 * Take a photo, record a clip (web) or go live; nothing leaves the device
 * until the climber ticks the consent box, and nothing is saved until they
 * review the result and press Save.
 */
export function AssessmentScreen() {
  const media = useMedia();
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Leg spread"
        subtitle="The angle between your legs, as your camera sees it."
      />
      {media ? (
        <Assessment media={media} />
      ) : (
        <NeedsServer what="The camera assessment" />
      )}
    </TabScreen>
  );
}

function Assessment({ media }: { media: MediaClient }) {
  const demo = useDemo();
  const simulated = demo.settings.enabled && demo.settings.analysis;
  const c = useCapture('assessment');
  const [consent, setConsent] = useState(false);
  const [reading, setReading] = useState<PoseReading | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState('');

  // A new photo or clip needs its own consent and its own result.
  useEffect(() => {
    setConsent(false);
    setReading(null);
    setConfirmed(false);
    setNotice('');
  }, [c.capture]);

  const toggleConsent = () => {
    if (consent) {
      c.cancel(); // stop sending straight away
    }
    setConsent(!consent);
  };

  const analyse = () => {
    const shot = c.capture;
    if (!shot || !consent || c.busy) {
      return;
    }
    c.run(
      () => media.analyze(shot, consent),
      next => {
        setReading(next);
        setConfirmed(false);
      },
      'The analysis did not work. Try again.',
    );
  };

  const goLive = () => {
    if (c.live) {
      c.stopLive();
      return;
    }
    setReading(null);
    setConfirmed(false);
    setNotice('');
    c.startLive(media, consent, sample => {
      setReading(old => addLiveSample(old, sample));
      setConfirmed(false);
    });
  };

  const save = () => {
    const result = reading?.result;
    if (!result || !confirmed || c.busy || c.live) {
      return;
    }
    c.run(
      () => media.saveAssessment(result, confirmed),
      () =>
        setNotice(
          simulated
            ? 'Saved simulated result to your demo profile.'
            : 'Saved to your profile as your own reading.',
        ),
      'Could not save it. Try again.',
    );
  };

  const kind = c.capture?.kind === 'video' ? 'clip' : 'photo';

  return (
    <>
      <Panel variant="quiet" title="Set up">
        <AppText>
          Stand facing the camera with your whole body in view, then spread your
          feet as wide as is comfortable. Hips and ankles need to be clear.
        </AppText>
      </Panel>

      <CameraTray capture={c}>
        {c.active ? (
          <LiveControls
            capture={c}
            consent={consent}
            onPress={goLive}
            simulated={simulated}
          />
        ) : null}
      </CameraTray>

      <ReviewTray capture={c} />

      {c.capture || c.active ? (
        <Panel title="Send">
          <ServerNote server={media.server} simulated={simulated}>
            The server works out the angle and keeps nothing. A result is saved
            only when you press Save.
          </ServerNote>
          <CheckRow
            name="Send for analysis"
            detail={
              simulated
                ? 'I agree to simulate this capture locally.'
                : 'I consent to sending this capture to the server for analysis.'
            }
            tone="agree"
            checked={consent}
            onPress={toggleConsent}
          />
          {c.capture ? (
            <>
              <Divider />
              <Button
                title={`Analyse ${kind}`}
                disabled={!consent || c.busy}
                onPress={analyse}
              />
            </>
          ) : null}
          <Status error={c.error} />
        </Panel>
      ) : c.error ? (
        <Panel variant="alert">
          <Status error={c.error} />
        </Panel>
      ) : null}

      {reading ? (
        <ResultTray
          reading={reading}
          live={c.live}
          busy={c.busy}
          confirmed={confirmed}
          onConfirm={() => setConfirmed(!confirmed)}
          onSave={save}
          notice={notice}
        />
      ) : null}

      <Panel variant="quiet">
        <View style={styles.note}>
          <WarningSign />
          <AppText variant="caption" style={styles.grow}>
            {NOT_VALIDATED} Camera height, angle and clothing change the number.
            It describes one picture, not how flexible you are.
          </AppText>
        </View>
      </Panel>
    </>
  );
}

function LiveControls({
  capture: c,
  consent,
  onPress,
  simulated,
}: {
  capture: Capture;
  consent: boolean;
  onPress: () => void;
  simulated: boolean;
}) {
  return (
    <View style={styles.part}>
      <Button
        title={c.live ? 'Stop live' : 'Go live'}
        variant={c.live ? 'danger' : 'secondary'}
        small
        style={styles.start}
        disabled={!c.camera || c.recording || (!c.live && (!consent || c.busy))}
        onPress={onPress}
      />
      <AppText variant="caption" muted>
        {simulated
          ? 'Live generates example results on this device until stopped.'
          : c.live
          ? 'Live: about two frames a second go to the server while this runs.'
          : consent
          ? 'Live sends about two frames a second until you stop it.'
          : 'Live needs the consent box below ticked first.'}
      </AppText>
    </View>
  );
}

function ResultTray({
  reading,
  live,
  busy,
  confirmed,
  onConfirm,
  onSave,
  notice,
}: {
  reading: PoseReading;
  live: boolean;
  busy: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  onSave: () => void;
  notice: string;
}) {
  const demo = useDemo();
  const simulated = demo.settings.enabled && demo.settings.analysis;
  const { result, last, valid, total } = reading;
  return (
    <Panel
      title="Result"
      badge={<Tag text={`${valid} of ${total} usable`} tone="muted" />}
    >
      {simulated ? <Tag text="Simulated result" /> : null}
      {result && result.value !== null ? (
        <>
          <View style={styles.result}>
            <PixelText
              text={`${Math.round(result.value)} deg`}
              scale={6}
              accessible={false}
            />
            <AppText>
              Estimated image-plane angle: {Math.round(result.value)}{' '}
              {result.unit}
            </AppText>
          </View>
          <AppText variant="caption" muted>
            {NOT_VALIDATED}
          </AppText>
          <Divider />
          <CheckRow
            name="I have reviewed it"
            detail={
              simulated
                ? 'Keep this simulated result in the demo profile'
                : 'Save it to my profile as my own reading'
            }
            tone="agree"
            checked={confirmed}
            onPress={onConfirm}
          />
          <Button
            title="Save result"
            icon="check"
            disabled={!confirmed || busy || live}
            onPress={onSave}
          />
          {live ? (
            <AppText variant="caption" muted>
              Stop live to save the latest result.
            </AppText>
          ) : null}
        </>
      ) : (
        <AppText>
          No valid measurement
          {last?.reason ? `: ${last.reason}` : '.'} Retake with your whole body
          in view.
        </AppText>
      )}
      <Status error="" notice={notice} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  part: { gap: spacing.sm },
  start: { alignSelf: 'flex-start' },
  result: { gap: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
});
