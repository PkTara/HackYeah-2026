import type { ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { AppText, Panel, Tag, spacing, useTheme } from '@hackyeah/ui';

/** A permanent camera surface, including when there is no active preview. */
export function AssessmentCameraTray({
  active = false,
  ready = false,
  available = false,
  consent = true,
  reviewing = false,
  error = '',
  unavailable,
  onLayout,
  children,
}: {
  active?: boolean;
  ready?: boolean;
  available?: boolean;
  consent?: boolean;
  reviewing?: boolean;
  error?: string;
  unavailable?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const placeholder = unavailable
    ? unavailable
    : !available
    ? 'There is no camera on this device. Use a device with a camera to record.'
    : error
    ? `${error} Check camera access, then try Record again.`
    : !consent
    ? 'Allow live camera analysis in Settings before recording.'
    : active
    ? 'Allow camera access when prompted. Your preview will appear here.'
    : reviewing
    ? 'Recording has ended. Review your measurement below.'
    : 'Your live preview will appear here when you press Record.';
  return (
    <Panel
      title="Camera"
      badge={
        <Tag
          text={active ? (ready ? 'Live' : 'Starting') : 'Off'}
          tone={active ? 'focus' : 'muted'}
        />
      }
    >
      <View
        testID="assessment-camera-box"
        onLayout={onLayout}
        style={[styles.preview, { backgroundColor: colors.backgroundDeep }]}
      >
        {children}
        {!active || !ready ? (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <AppText variant="heading" style={{ color: colors.onBackground }}>
              {active ? 'Starting camera…' : 'Camera off'}
            </AppText>
            <AppText
              variant="caption"
              style={[
                styles.placeholderText,
                { color: colors.onBackgroundMuted },
              ]}
            >
              {placeholder}
            </AppText>
          </View>
        ) : null}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  preview: { height: 280, overflow: 'hidden' },
  placeholderText: { textAlign: 'center' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
