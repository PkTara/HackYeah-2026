import { dolphinRows } from '../pixel/sprites';
import { FramePet, type FramePetProps } from './FramePet';

/** The swimming-mode pet. Flicks its tail in two frames. */
export function Dolphin(props: FramePetProps) {
  return <FramePet rows={dolphinRows} ms={260} {...props} />;
}
