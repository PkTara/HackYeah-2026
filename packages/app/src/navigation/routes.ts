import type { ComponentType } from 'react';
import { AboutScreen } from '../screens/AboutScreen';
import { AnatomyScreen } from '../screens/AnatomyScreen';
import { EvidenceScreen } from '../screens/EvidenceScreen';
import { FingerScreen } from '../screens/FingerScreen';
import { HandsScreen } from '../screens/HandsScreen';
import { HomeTestScreen } from '../screens/HomeTestScreen';
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
  Anatomy: AnatomyScreen,
  /** Params: id, a home test id from core's BASELINE_TESTS. */
  Test: HomeTestScreen,
} satisfies Record<string, ComponentType>;

export type RouteName = keyof typeof screens;

export function isRouteName(name: string): name is RouteName {
  return Object.prototype.hasOwnProperty.call(screens, name);
}
