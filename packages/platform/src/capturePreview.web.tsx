import { createElement } from 'react';
import type { MediaCapture } from './camera.types';
export function CaptureMediaPreview({ capture }: { capture: MediaCapture }) {
  return createElement(capture.kind === 'video' ? 'video' : 'img', {
    src: capture.uri,
    controls: capture.kind === 'video',
    'aria-label':
      capture.kind === 'video' ? 'Captured video' : 'Captured photo',
    style: { width: '100%', height: 280, objectFit: 'contain' },
  });
}
