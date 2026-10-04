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
        Choose once for this app. You can change these in Settings. Recording an
        assessment sends live frames for analysis; the server does not retain
        those frames.
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
      <AppText variant="caption">
        The camera starts only when you choose it. Revoking analysis permission
        stops active uploads. Hand-photo permission is separate from transient
        analysis.
      </AppText>
      {privacy.error ? (
        <AppText accessibilityRole="alert">{privacy.error}</AppText>
      ) : null}
    </Panel>
  );
}
