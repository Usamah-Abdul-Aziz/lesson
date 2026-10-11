import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

/** Palette netral, kontras cukup untuk aksesibilitas (lihat §9 NFR). */
const brand = {
  primary: '#2F5BFF',
  primaryDark: '#1B3FCC',
  accent: '#00A88F',
  surface: '#FFFFFF',
  background: '#F5F7FA',
  error: '#C62828',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    primaryContainer: '#E3EAFF',
    onPrimaryContainer: '#0E1F5C',
    secondary: brand.accent,
    secondaryContainer: '#D8F3EE',
    background: brand.background,
    surface: brand.surface,
    surfaceVariant: '#E7EAF0',
    onSurface: '#1A1D23',
    onSurfaceVariant: '#4A5060',
    outline: '#A8AEC0',
    error: brand.error,
  },
  roundness: 10,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8FA8FF',
    primaryContainer: '#27408F',
    onPrimaryContainer: '#DCE5FF',
    secondary: '#5FD8C0',
    secondaryContainer: '#0E4A40',
    background: '#0F1218',
    surface: '#1A1F29',
    surfaceVariant: '#2A303C',
    onSurface: '#F0F2F7',
    onSurfaceVariant: '#C0C6D4',
    outline: '#6E7688',
    error: '#FF8A80',
  },
  roundness: 10,
};

export type AppTheme = typeof lightTheme;
