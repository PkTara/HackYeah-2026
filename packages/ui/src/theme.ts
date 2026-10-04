import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

/**
 * Jungle palette. Day is a sunny canopy with cream signs; night swaps to dark
 * moss signs with cream text. Components only use these tokens.
 */
const palette = {
  light: {
    background: '#1E4D2B', // canopy green behind everything
    backgroundDeep: '#123320', // hard shadows on the background
    onBackground: '#FFF4DC',
    onBackgroundMuted: '#B9D8A8',
    surface: '#FFF4DC', // cream sign
    surfaceLight: '#FFFBEF', // top bevel
    surfaceShade: '#EADBB8', // bottom bevel, dividers
    outline: '#22180F',
    text: '#22180F',
    textMuted: '#6B5640',
    primary: '#FFD23F', // banana
    primaryShade: '#D9A300',
    onPrimary: '#22180F',
    leaf: '#3E8E4A',
    leafLight: '#7BC255',
    bark: '#6B4423',
    barkLight: '#8A5A33',
    barkDark: '#4A2E17',
    danger: '#C93A27',
    onDanger: '#FFFFFF',
    dangerSoft: '#F7D3C8',
    info: '#2F8FA6',
    chartEdge: '#1F5A2A',
    border: '#22180F',
  },
  dark: {
    background: '#0F2418',
    backgroundDeep: '#06120B',
    onBackground: '#F4E9CF',
    onBackgroundMuted: '#94B487',
    surface: '#22382B',
    surfaceLight: '#2D4A39',
    surfaceShade: '#182A1F',
    outline: '#040A06',
    text: '#F4E9CF',
    textMuted: '#B3C2A6',
    primary: '#FFD23F',
    primaryShade: '#C99700',
    onPrimary: '#22180F',
    leaf: '#4FA35B',
    leafLight: '#8CD066',
    bark: '#7A5030',
    barkLight: '#8A5A33',
    barkDark: '#4A2E17',
    danger: '#FF7A61',
    onDanger: '#22180F',
    dangerSoft: '#4A231C',
    info: '#5FC4D9',
    chartEdge: '#C8F0A0',
    border: '#040A06',
  },
} as const;

/**
 * Savanna palette for gazelle mode. Same roles as the jungle: day is golden
 * grass under a warm sky with cream signs, night is dusky earth with cream
 * text. The key colour is sunset orange instead of banana.
 */
const savanna = {
  light: {
    ...palette.light,
    background: '#7A4A22', // dry earth behind everything
    backgroundDeep: '#4E2E14',
    onBackground: '#FFF4DC',
    onBackgroundMuted: '#EBCB95',
    surfaceShade: '#EFD5A8',
    textMuted: '#6E5232',
    primary: '#FFA62B', // sunset
    primaryShade: '#D97A0F',
    leaf: '#8E9A2F', // dry grass
    leafLight: '#C8C454',
    chartEdge: '#7A4A22',
  },
  dark: {
    ...palette.dark,
    background: '#2A1A10',
    backgroundDeep: '#140B06',
    onBackground: '#F4E9CF',
    onBackgroundMuted: '#C9AE84',
    surface: '#3D2A1B',
    surfaceLight: '#4D3624',
    surfaceShade: '#2C1D12',
    textMuted: '#CDB693',
    primary: '#FFA62B',
    primaryShade: '#C46F0C',
    leaf: '#9AA53A',
    leafLight: '#C8C454',
    chartEdge: '#F5C98A',
  },
} as const;

/**
 * Ocean palette for dolphin mode: deep water behind everything, cream signs
 * by day and dark sea-blue signs by night. The key colour is coral.
 */
const ocean = {
  light: {
    ...palette.light,
    background: '#17507A', // open water behind everything
    backgroundDeep: '#0C3352',
    onBackground: '#FFF4DC',
    onBackgroundMuted: '#A9D6EE',
    surfaceShade: '#E2E0CC',
    textMuted: '#4F5A60',
    primary: '#FF8A65', // coral
    primaryShade: '#D9603C',
    leaf: '#2E9C8A', // sea green
    leafLight: '#6FD3C0',
    bark: '#3E5F7A', // weathered dock wood
    barkLight: '#5A7C98',
    barkDark: '#263F55',
    chartEdge: '#17507A',
  },
  dark: {
    ...palette.dark,
    background: '#0A2236',
    backgroundDeep: '#04121E',
    onBackground: '#F4E9CF',
    onBackgroundMuted: '#8EB8CF',
    surface: '#163A55',
    surfaceLight: '#1F4A6A',
    surfaceShade: '#0F2B40',
    textMuted: '#A9C3D2',
    primary: '#FF8A65',
    primaryShade: '#C9542F',
    leaf: '#2E9C8A',
    leafLight: '#6FD3C0',
    bark: '#3E5F7A',
    barkLight: '#5A7C98',
    barkDark: '#263F55',
    chartEdge: '#A9E4F5',
  },
} as const;

/** Which world the app is drawn in: one per pet. */
export type World = 'jungle' | 'savanna' | 'ocean';

/** The app sets this from the pet mode; every themed component follows. */
export const WorldContext = createContext<World>('jungle');

/** One art pixel in device pixels. Borders, notches and shadows use it. */
export const PX = 3;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 0, md: 0, lg: 0 } as const;

export const typography = {
  title: { fontSize: 26, fontWeight: '800' },
  heading: { fontSize: 19, fontWeight: '800' },
  body: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)['light']]: string };

export type Theme = {
  scheme: ColorScheme;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export function getTheme(scheme: ColorScheme, world: World = 'jungle'): Theme {
  const colors =
    world === 'savanna'
      ? savanna[scheme]
      : world === 'ocean'
        ? ocean[scheme]
        : palette[scheme];
  return { scheme, colors, spacing, radius, typography };
}

/** Follows the OS light/dark setting on every platform, in the current world. */
export function useTheme(): Theme {
  const world = useContext(WorldContext);
  return getTheme(useColorScheme() === 'dark' ? 'dark' : 'light', world);
}

export function useWorld(): World {
  return useContext(WorldContext);
}
