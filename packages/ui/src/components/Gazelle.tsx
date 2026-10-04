import { gazelleRows } from '../pixel/sprites';
import { FramePet, type FramePetProps } from './FramePet';

/** The running-mode pet. Gallops in two frames. */
export function Gazelle(props: FramePetProps) {
  return <FramePet rows={gazelleRows} ms={180} {...props} />;
}
