import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ICONS, SPRITE_COLORS, type IconName } from '../pixel/sprites';
import { useTone } from '../tone';
import { PixelArt } from './PixelArt';

type Props = {
  name: IconName;
  /** Device pixels per art pixel. Icons are 12 art pixels square. */
  scale?: number;
  /**
   * Colour for the '#' outline pixels. Defaults to the surface text colour.
   * 'W' (paper) pixels are left empty so the surface shows through.
   */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** True for names the sprite sheet has, e.g. hints that come from core. */
export function isIconName(name: string | undefined): name is IconName {
  return (
    name !== undefined && Object.prototype.hasOwnProperty.call(ICONS, name)
  );
}

export function Icon({ name, scale = 2, color, style }: Props) {
  const tone = useTone();
  const ink = color ?? tone.text;
  const colors = useMemo(() => ({ ...SPRITE_COLORS, '#': ink, W: '' }), [ink]);
  return (
    <PixelArt rows={ICONS[name]} colors={colors} scale={scale} style={style} />
  );
}
