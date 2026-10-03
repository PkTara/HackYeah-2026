import { useColorScheme } from 'react-native';

const palette = {
  light: {
    background: '#F2F4E8',
    surface: '#FFFAF0',
    text: '#14161A',
    textMuted: '#5C6370',
    primary: '#1B6B42',
    onPrimary: '#FFFFFF',
    border: '#E2E5EA',
  },
  dark: {
    background: '#102018',
    surface: '#1B3024',
    text: '#F2F3F5',
    textMuted: '#A0A6B1',
    primary: '#80C99A',
    onPrimary: '#102018',
    border: '#2C2F36',
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 6, md: 12, lg: 20 } as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
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
