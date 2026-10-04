import { AppText, CheckRow, Panel, Tag } from '@hackyeah/ui';
import { usePrivacy } from './PrivacyProvider';

export function PrivacyPanel() {
  const privacy = usePrivacy();
  if (!privacy.available) {
    return null;
  }
  return (
    <Panel
      title="Camera permissions"
      badge={<Tag text="Optional" tone="muted" />}
    >
      <AppText>
        Each is off until you turn it on, and you can change it here any time.
      </AppText>
      <CheckRow
        name="Live camera analysis"
        detail="Allow frames to be sent while a camera assessment is recording."
        tone="agree"
        checked={privacy.choices.cameraAnalysis}
        onPress={() =>
          privacy.update({ cameraAnalysis: !privacy.choices.cameraAnalysis })
        }
      />
      <CheckRow
        name="Private hand photos"
        detail="Allow hand photos and journal entries to be uploaded and retained."
        tone="agree"
        checked={privacy.choices.handPhotos}
        onPress={() =>
          privacy.update({ handPhotos: !privacy.choices.handPhotos })
        }
      />
      <AppText variant="caption" muted>
        The camera only starts when you press Record. Analysis frames are not
        kept by the server, and turning analysis off stops any upload in
        progress.
      </AppText>
      {privacy.error ? (
        <AppText accessibilityRole="alert">{privacy.error}</AppText>
      ) : null}
    </Panel>
  );
}
