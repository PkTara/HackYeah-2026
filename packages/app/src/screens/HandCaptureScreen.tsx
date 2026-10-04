import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { FINGERS, type Finger, type Side } from '@hackyeah/core';
import {
  FINGER_REGION,
  type HandPhotoEntry,
  type HandRegion,
  type MediaClient,
} from '@hackyeah/data';
import {
  AppText,
  Button,
  Chip,
  Divider,
  PX,
  Panel,
  PixelText,
  WarningSign,
  spacing,
  useTheme,
} from '@hackyeah/ui';
import {
  CameraTray,
  NeedsServer,
  ReviewTray,
  ServerNote,
  Status,
} from '../capture/parts';
import { useCapture } from '../capture/useCapture';
import { Crumbs } from '../components/Crumbs';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';
import { FINGER_NAME, SIDE_NAME, fingerLabel, spotsText } from '../labels';
import { useMedia } from '../media';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useGame } from '../state/GameProvider';
import { useDemo } from '../demo/DemoProvider';
import { usePrivacy } from '../privacy/PrivacyProvider';

export const HAND_CONSENT =
  'I consent to uploading and retaining this hand photo and journal entry.';

const SIDES: readonly Side[] = ['left', 'right'];
const VIEWS = [
  { key: 'palm', label: 'Palm' },
  { key: 'back', label: 'Back' },
] as const;
/** The hand outside the fingers, as the server names it. */
const OTHER_REGIONS = [
  { key: 'palm', label: 'Palm' },
  { key: 'back', label: 'Back of hand' },
  { key: 'wrist', label: 'Wrist' },
] as const;
const PAIN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const fingerOf = (region: HandRegion | null): Finger | undefined =>
  FINGERS.find(f => FINGER_REGION[f] === region);

/**
 * Hand journal photo, from the Hands tab or a finger close-up: a private
 * photo with the side, the place and how it feels. A finger entry goes
 * into the same finger flags as the close-up: pain above 0 (or not rated)
 * flags it, 0 clears it, and the spots already marked are kept.
 */
export function HandCaptureScreen() {
  const media = useMedia();
  return (
    <TabScreen>
      <Crumbs />
      <PageHeader
        title="Hand photo"
        subtitle="A private photo for your hand journal, with how it feels."
      />
      {media ? (
        <HandCapture media={media} />
      ) : (
        <NeedsServer what="The hand photo journal" />
      )}
    </TabScreen>
  );
}

function HandCapture({ media }: { media: MediaClient }) {
  const demo = useDemo();
  const simulated = demo.settings.enabled && demo.settings.handPhotos;
  const { params, navigate } = useNavigation<RouteName>();
  const { state, refresh } = useGame();
  const theme = useTheme();
  const c = useCapture('hand');
  // Opened from a finger close-up, that finger is picked already.
  const [side, setSide] = useState<Side | null>(
    params.side === 'left' || params.side === 'right' ? params.side : null,
  );
  const [region, setRegion] = useState<HandRegion | null>(() => {
    const finger = FINGERS.find(f => f === params.finger);
    return finger ? FINGER_REGION[finger] : null;
  });
  const [view, setView] = useState<'palm' | 'back' | null>(null);
  const [pain, setPain] = useState<number | null | undefined>(undefined);
  const [note, setNote] = useState('');
  const consent = usePrivacy().choices.handPhotos;
  const cancel = useRef(c.cancel);
  cancel.current = c.cancel;
  const [notice, setNotice] = useState('');

  // Retention permission belongs to setup/settings; captures still get reviewed.
  useEffect(() => {
    setNotice('');
  }, [c.capture]);
  useEffect(() => {
    if (!consent) {
      cancel.current();
    }
  }, [consent]);

  const finger = fingerOf(region);
  const flag =
    side && finger
      ? state.flags.find(f => f.side === side && f.finger === finger)
      : undefined;
  const ready =
    side !== null && region !== null && view !== null && pain !== undefined;

  const save = () => {
    const photo = c.capture;
    if (
      !photo ||
      side === null ||
      region === null ||
      view === null ||
      pain === undefined ||
      !consent ||
      c.busy
    ) {
      return;
    }
    const entry: HandPhotoEntry = {
      side,
      view,
      region,
      pain,
      spots: flag?.spots ?? [],
      note,
    };
    c.run(
      () => media.saveHandPhoto(photo, entry, consent),
      () => {
        setNotice(
          simulated
            ? 'Saved simulated entry to your demo hand journal. No photo was uploaded or retained.'
            : 'Saved to your hand journal.',
        );
        refresh(); // a finger entry changes its flag
      },
      'Could not save it. Try again.',
    );
  };

  return (
    <>
      <CameraTray capture={c} />
      <ReviewTray capture={c} />

      {c.capture ? (
        <Panel title="Details">
          <Field label="Hand">
            {SIDES.map(s => (
              <Chip
                key={s}
                label={SIDE_NAME[s]}
                selected={side === s}
                onPress={() => setSide(s)}
                accessibilityLabel={`${SIDE_NAME[s]} hand`}
              />
            ))}
          </Field>
          <Field label="Photo of the">
            {VIEWS.map(v => (
              <Chip
                key={v.key}
                label={v.label}
                selected={view === v.key}
                onPress={() => setView(v.key)}
                accessibilityLabel={`Photo of the ${v.label.toLowerCase()}`}
              />
            ))}
          </Field>
          <Divider />
          <Field label="Where">
            {FINGERS.map(f => (
              <Chip
                key={f}
                label={FINGER_NAME[f]}
                selected={region === FINGER_REGION[f]}
                onPress={() => setRegion(FINGER_REGION[f])}
                accessibilityLabel={
                  f === 'thumb' ? 'Thumb' : `${FINGER_NAME[f]} finger`
                }
              />
            ))}
            {OTHER_REGIONS.map(r => (
              <Chip
                key={r.key}
                label={r.label}
                selected={region === r.key}
                onPress={() => setRegion(r.key)}
              />
            ))}
          </Field>
          <Field label="Pain, 0 to 10">
            {PAIN.map(n => (
              <Chip
                key={n}
                label={String(n)}
                selected={pain === n}
                warn={n > 0}
                onPress={() => setPain(n)}
                accessibilityLabel={n === 0 ? 'Pain 0, none' : `Pain ${n}`}
              />
            ))}
            <Chip
              label="Sore, no number"
              selected={pain === null}
              warn
              onPress={() => setPain(null)}
            />
          </Field>
          {side && finger ? (
            <AppText variant="caption" muted>
              {fingerSentence(side, finger, pain, flag?.spots)}
            </AppText>
          ) : null}
          <Divider />
          <View style={styles.field}>
            <PixelText text="Note" accessible={false} />
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={2000}
              multiline
              accessibilityLabel="Note"
              placeholder="What happened, how it feels"
              placeholderTextColor={theme.colors.textMuted}
              selectionColor={theme.colors.outline}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceLight,
                  borderColor: theme.colors.outline,
                  color: theme.colors.text,
                },
              ]}
            />
          </View>
        </Panel>
      ) : null}

      {c.capture ? (
        <Panel title="Save">
          <ServerNote server={media.server} simulated={simulated}>
            The photo stays there, private to your profile, until you delete
            your profile.
          </ServerNote>
          <AppText variant="caption">
            {consent
              ? 'Private hand-photo permission is enabled in Settings. Saving keeps this entry in your journal.'
              : 'Enable Private hand photos in Settings to save this entry.'}
          </AppText>
          {!consent ? (
            <Button
              title="Settings"
              variant="secondary"
              onPress={() =>
                navigate('Settings', { from: 'HandCapture', ...params })
              }
            />
          ) : null}
          <Divider />
          <Button
            title="Save to journal"
            icon="check"
            disabled={!ready || !consent || c.busy}
            onPress={save}
          />
          {!ready ? (
            <AppText variant="caption" muted>
              Pick the hand, what the photo shows, where it is and the pain
              first.
            </AppText>
          ) : null}
          <Status error={c.error} notice={notice} />
        </Panel>
      ) : c.error ? (
        <Panel variant="alert">
          <Status error={c.error} />
        </Panel>
      ) : null}

      <Panel variant="quiet">
        <View style={styles.note}>
          <WarningSign />
          <AppText variant="caption" style={styles.grow}>
            This is your own note, not a diagnosis. Nobody looks at the photo
            and the app cannot tell from it what is wrong. If you felt a pop,
            see swelling or bruising, or it keeps hurting, stop climbing and see
            a physio or doctor.
          </AppText>
        </View>
      </Panel>
    </>
  );
}

/** What a finger entry does to that finger's flag. */
function fingerSentence(
  side: Side,
  finger: Finger,
  pain: number | null | undefined,
  spots: readonly string[] | undefined,
): string {
  const name = fingerLabel(side, finger);
  if (pain === 0) {
    return spots
      ? `Pain 0 clears the flag on your ${name.toLowerCase()}.`
      : `Pain 0 records that your ${name.toLowerCase()} is fine.`;
  }
  const kept = spots?.length
    ? ` It keeps the spots you marked: ${spotsText(finger, spots)}.`
    : '';
  return `Saving flags your ${name.toLowerCase()}, as the finger close-up does.${kept}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <PixelText text={label} accessible={false} />
      <View accessibilityLabel={label} style={styles.chips}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    minHeight: 72,
    borderWidth: PX,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
});
