import type { ComponentType } from 'react';
import { AboutScreen } from '../screens/AboutScreen';
import { EvidenceScreen } from '../screens/EvidenceScreen';
import { FingerScreen } from '../screens/FingerScreen';
import { HandsScreen } from '../screens/HandsScreen';
import { LogScreen } from '../screens/LogScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TestsScreen } from '../screens/TestsScreen';

export const screens = {
  // Tabs
  Profile: ProfileScreen,
  Log: LogScreen,
  Hands: HandsScreen,
  Tests: TestsScreen,
  // Pushed on top of a tab
  Evidence: EvidenceScreen,
  About: AboutScreen,
  /** Params: side ('left' | 'right') and finger. */
  Finger: FingerScreen,
} satisfies Record<string, ComponentType>;

export type RouteName = keyof typeof screens;
