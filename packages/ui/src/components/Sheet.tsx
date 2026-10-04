import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLayout } from '../layout';
import { useUiSound } from '../sound';
import { PX, useTheme } from '../theme';
import { Panel } from './Panel';
import { PixelBox } from './PixelBox';
import { PixelText } from './PixelText';

type Props = {
  visible: boolean;
  /** Written on the panel's wooden tab. Keep it short. */
  title: string;
  onClose: () => void;
  /** What a screen reader hears for the close key. */
  closeLabel?: string;
  children: ReactNode;
};

/** Pressable state; hovered is only reported on the web. */
type PressState = { pressed: boolean; hovered?: boolean };

/**
 * A pixel sign over the page, for detail that belongs to one value. Phones
 * get it from the bottom edge, wider screens in the middle. It closes with
 * the X key, a tap on the dimmed page, Escape on the web or Back on Android.
 * The web Modal keeps keyboard focus inside and gives it back on close.
 */
export function Sheet({
  visible,
  title,
  onClose,
  closeLabel = 'Close',
  children,
}: Props) {
  const c = useTheme().colors;
  const { height } = useWindowDimensions();
  const phone = !useLayout().rail;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          phone ? styles.bottom : styles.middle,
          { backgroundColor: `${c.backgroundDeep}D9` },
        ]}
      >
        <Pressable
          accessible={false}
          focusable={false}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.frame}>
          <Panel
            title={title}
            badge={<CloseKey label={closeLabel} onPress={onClose} />}
          >
            <ScrollView
              style={{ maxHeight: Math.max(240, height * 0.86 - 72) }}
              contentContainerStyle={styles.content}
            >
              {children}
            </ScrollView>
          </Panel>
        </View>
      </View>
    </Modal>
  );
}

/** A small square key with an X, sitting on the panel's top edge. */
function CloseKey({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme().colors;
  const playSound = useUiSound();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      hitSlop={8}
    >
      {({ pressed, hovered }: PressState) => (
        <PixelBox
          fill={hovered ? c.surfaceLight : c.surface}
          outline={c.outline}
          light={c.surfaceLight}
          shade={c.surfaceShade}
          shadow={c.backgroundDeep}
          lift={pressed ? 0 : PX}
          style={pressed ? styles.sunk : null}
          contentStyle={styles.key}
        >
          <PixelText text="X" color={c.text} accessible={false} />
        </PixelBox>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  bottom: { justifyContent: 'flex-end' },
  middle: { justifyContent: 'center' },
  frame: { width: '100%', maxWidth: 560 },
  content: { gap: 14, paddingBottom: 4 },
  key: {
    width: 30,
    height: 30,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunk: { marginTop: PX },
});
