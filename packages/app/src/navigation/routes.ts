import type { ComponentType } from 'react';
import { AboutScreen } from '../screens/AboutScreen';
import { AssessmentScreen, HandCaptureScreen } from '../screens/CaptureScreen';
import { HomeScreen } from '../screens/HomeScreen';

export const screens = {
  Home: HomeScreen,
  About: AboutScreen,
  Assessment: AssessmentScreen,
  HandCapture: HandCaptureScreen,
} satisfies Record<string, ComponentType>;

export type RouteName = keyof typeof screens;
