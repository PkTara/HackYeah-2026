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
import { BodyScreen } from '../screens/sport/BodyScreen';
import { SportEvidenceScreen } from '../screens/sport/SportEvidenceScreen';
import { SportLogScreen } from '../screens/sport/SportLogScreen';
import { SportProfileScreen } from '../screens/sport/SportProfileScreen';

export const screens = {
  // Tabs
  Profile: ProfileScreen,
  Log: LogScreen,
  Hands: HandsScreen,
  // Tests is the Data tab's old name. Old links and HomeTestScreen's reset
  // still use it; the breadcrumbs and tab bar show it as Data.
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
  /**
   * Live camera assessment, from the Data tab. Params: metric
   * ('leg_spread', the default, or 'shoulder_reach').
   */
  Assessment: AssessmentScreen,
  /** Hand journal photo. Optional params: side and finger, to start there. */
  HandCapture: HandCaptureScreen,

  // Sport mode tabs (gazelle and dolphin). They show the active sport.
  SportProfile: SportProfileScreen,
  SportLog: SportLogScreen,
  SportBody: BodyScreen,
  // Pushed on top of a sport tab
  /** Params: kind, one of the active sport's three kinds. */
  SportEvidence: SportEvidenceScreen,
} satisfies Record<string, ComponentType>;

export type RouteName = keyof typeof screens;

/** Routes of the sport modes; everything else is the monkey's. */
const SPORT_ROUTES: readonly RouteName[] = [
  'SportProfile',
  'SportLog',
  'SportBody',
  'SportEvidence',
];

export function isSportRoute(name: RouteName): boolean {
  return SPORT_ROUTES.includes(name);
}

export function isRouteName(name: string): name is RouteName {
  return Object.prototype.hasOwnProperty.call(screens, name);
}
