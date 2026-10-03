import type { ComponentType } from 'react';
import { AboutScreen } from '../screens/AboutScreen';
import { HomeScreen } from '../screens/HomeScreen';

export const screens = {
  Home: HomeScreen,
  About: AboutScreen,
} satisfies Record<string, ComponentType>;

export type RouteName = keyof typeof screens;
