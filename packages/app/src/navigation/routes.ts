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
import { GazelleProfileScreen } from '../screens/gazelle/GazelleProfileScreen';
import { LegsScreen } from '../screens/gazelle/LegsScreen';
import { RunEvidenceScreen } from '../screens/gazelle/RunEvidenceScreen';
import { RunLogScreen } from '../screens/gazelle/RunLogScreen';

export const screens = {
  // Tabs
  Profile: ProfileScreen,
  Log: LogScreen,
  Hands: HandsScreen,
  Tests: TestsScreen,
  Data: TestsScreen,
  // Pushed on top of a tab
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

  // Gazelle mode tabs
  Run: GazelleProfileScreen,
  RunLog: RunLogScreen,
  Legs: LegsScreen,
  // Pushed on top of a gazelle tab
  /** Params: type, a run type from core's RUN_TYPES. */
  RunEvidence: RunEvidenceScreen,
} satisfies Record<string, ComponentType>;

export type RouteName = keyof typeof screens;

/** Routes that belong to gazelle mode; everything else is the monkey's. */
const GAZELLE_ROUTES: readonly RouteName[] = ['Run', 'RunLog', 'Legs', 'RunEvidence'];

export function isGazelleRoute(name: RouteName): boolean {
  return GAZELLE_ROUTES.includes(name);
}

export function isRouteName(name: string): name is RouteName {
  return Object.prototype.hasOwnProperty.call(screens, name);
}
