import type { ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  AppText,
  Icon,
  Panel,
  PixelText,
  Tag,
  spacing,
  useTheme,
} from '@hackyeah/ui';

/** The camera box keeps one height in every state, so nothing jumps. */
export const CAMERA_BOX_HEIGHT = 280;

/**
 * The Camera tray: a permanent camera box with the controls right under it.
 * Off, starting, blocked and unavailable states draw an intentional
 * placeholder (a pixel camera, a short state and one line on what to do)
 * in the same box. In review the box holds the captured reading.
 */
export function AssessmentCameraTray({
  active = false,
  ready = false,
  available = false,
  consent = true,
  reviewing = false,
  error = '',
  unavailable,
  simulated = false,
  reading,
  captured,
  onLayout,
  children,
  below,
}: {
  active?: boolean;
  ready?: boolean;
  available?: boolean;
  consent?: boolean;
  reviewing?: boolean;
  error?: string;
  unavailable?: string;
  /** Demo analysis: a Simulated stamp beside the state. */
  simulated?: boolean;
  /** The latest live value, shown on the preview while recording. */
  reading?: { value: string; label: string };
  /** In review: the captured value and how screen readers hear it. */
  captured?: { value: string; label: string };
  onLayout?: (event: LayoutChangeEvent) => void;
  /** The preview and its markings. */
  children?: ReactNode;
  /** Status and controls, inside the tray under the box. */
  below?: ReactNode;
}) {
  const { colors } = useTheme();
  const live = active && ready;
  const blocked = Boolean(unavailable) || !available || !consent;
  const heading = active ? 'Starting camera…' : 'Camera off';
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
  const stateTag = live ? (
    <Tag text="Live" tone="focus" />
  ) : active ? (
    <Tag text="Starting" tone="muted" />
  ) : captured ? (
    <Tag text="Captured" tone="new" />
  ) : (
    <Tag text="Off" tone="muted" />
  );
  return (
    <Panel
      title="Camera"
      icon="camera"
      badge={stateTag}
    >
      <View
        testID="assessment-camera-box"
        onLayout={onLayout}
        style={[
          styles.preview,
          {
            backgroundColor: colors.backgroundDeep,
            borderColor: colors.outline,
          },
        ]}
      >
        {children}
        {/* While live, a simulated preview stamps itself. */}
        {simulated && !live ? (
          <View pointerEvents="none" style={styles.stamp}>
            <Tag text="Simulated analysis" />
          </View>
        ) : null}
        {live && reading ? (
          <View
            pointerEvents="none"
            accessible
            accessibilityLabel={reading.label}
            style={[
              styles.reading,
              { backgroundColor: colors.primary, borderColor: colors.outline },
            ]}
          >
            <PixelText
              text={reading.value}
              scale={3}
              color={colors.onPrimary}
              accessible={false}
            />
          </View>
        ) : null}
        {!live && captured ? (
          <View
            accessible
            accessibilityLabel={captured.label}
            style={[StyleSheet.absoluteFill, styles.placeholder]}
          >
            <AppText
              variant="caption"
              style={{ color: colors.onBackgroundMuted }}
            >
              Captured reading
            </AppText>
            <PixelText
              text={captured.value}
              scale={6}
              heading
              color={colors.onBackground}
              shadow={colors.outline}
              accessible={false}
            />
            <AppText
              variant="caption"
              style={[
                styles.placeholderText,
                { color: colors.onBackgroundMuted },
              ]}
            >
              The camera is off. Nothing more is sent.
            </AppText>
          </View>
        ) : !live ? (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Icon
              name="camera"
              scale={4}
              color={blocked || error ? colors.onBackgroundMuted : colors.primary}
            />
            <AppText variant="heading" style={{ color: colors.onBackground }}>
              {heading}
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
      {below}
    </Panel>
  );
}

const styles = StyleSheet.create({
  preview: { height: CAMERA_BOX_HEIGHT, overflow: 'hidden', borderWidth: 3 },
  stamp: { position: 'absolute', top: 10, left: 10, zIndex: 1 },
  placeholderText: { textAlign: 'center', maxWidth: 320 },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  reading: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
