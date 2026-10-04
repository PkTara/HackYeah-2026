import { BodyReachScreen } from '../screens/BodyReachScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { MeasurementDetailScreen } from '../screens/MeasurementDetailScreen';
import type { ComponentType } from 'react';
import { AboutScreen } from '../screens/AboutScreen';
import { AnatomyScreen } from '../screens/AnatomyScreen';
import { AssessmentScreen } from '../screens/AssessmentScreen';
import { EvidenceScreen } from '../screens/EvidenceScreen';
import { FingerScreen } from '../screens/FingerScreen';
import { HandCaptureScreen } from '../screens/HandCaptureScreen';
import { HandsScreen } from '../screens/HandsScreen';
import { HomeTestScreen } from '../screens/HomeTestScreen';
import { LogScreen } from '../screens/LogScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TestsScreen } from '../screens/TestsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FingerStrengthScreen } from '../screens/FingerStrengthScreen';

export const screens = {
  // Tabs
  Profile: ProfileScreen,
  Log: LogScreen,
  Hands: HandsScreen,
  Tests: TestsScreen,
  Data: TestsScreen,
  // Pushed on top of a tab
  BodyReach: BodyReachScreen,
  Activity: ActivityScreen,
  MeasurementDetail: MeasurementDetailScreen,
  Evidence: EvidenceScreen,
  About: AboutScreen,
  Settings: SettingsScreen,
  FingerStrength: FingerStrengthScreen,
  /** Params: side ('left' | 'right') and finger. */
  Finger: FingerScreen,
  Anatomy: AnatomyScreen,
  /** Params: id, a home test id from core's BASELINE_TESTS. */
  Test: HomeTestScreen,
  /** Camera assessment (leg spread), from the Tests tab. */
  Assessment: AssessmentScreen,
  /** Hand journal photo. Optional params: side and finger, to start there. */
  HandCapture: HandCaptureScreen,
} satisfies Record<string, ComponentType>;

export type RouteName = keyof typeof screens;

export function isRouteName(name: string): name is RouteName {
  return Object.prototype.hasOwnProperty.call(screens, name);
}
