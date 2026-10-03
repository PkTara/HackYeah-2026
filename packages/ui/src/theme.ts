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
    barkDark: '#4A2E17',
    danger: '#C93A27',
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
    barkDark: '#4A2E17',
    danger: '#FF7A61',
    dangerSoft: '#4A231C',
    info: '#5FC4D9',
    chartEdge: '#C8F0A0',
    border: '#040A06',
  },
} as const;

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

export function getTheme(scheme: ColorScheme): Theme {
  return { scheme, colors: palette[scheme], spacing, radius, typography };
}

/** Follows the OS light/dark setting on every platform. */
export function useTheme(): Theme {
  return getTheme(useColorScheme() === 'dark' ? 'dark' : 'light');
}
