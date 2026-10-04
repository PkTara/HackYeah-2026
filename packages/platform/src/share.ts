/**
 * Sharing on Android and iOS, through React Native's built-in Share API (no
 * native library). The share sheet has its own Copy action, so the app does
 * not copy by itself here. Files (CSV, JSON, a printable page) go as message
 * text, because attaching a real file needs a native file library.
 *
 * The web build uses share.web.ts instead.
 */
import { Share } from 'react-native';
import type { ShareCapability } from './types';

export const nativeShare: ShareCapability = {
  async share({ title, text }) {
    try {
      const result = await Share.share(
        { title, message: text },
        { subject: title, dialogTitle: title },
      );
      return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
    } catch {
      return 'failed';
    }
  },
  canCopy: false,
  async copy() {
    return false;
  },
};

/** What capabilities.ts wires in. */
export const platformShare: ShareCapability | undefined = nativeShare;
