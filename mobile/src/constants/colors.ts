// mobile/src/constants/colors.ts

export const palette = {
  primary: '#534AB7',
  secondary: '#0F6E56',
  accent: '#854F0B',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textMuted: string;
  textLight: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  placeholder: string;
  notification: string;
}

export const lightTheme: ThemeColors = {
  primary: palette.primary,
  secondary: palette.secondary,
  accent: palette.accent,
  background: palette.gray[50],
  surface: palette.white,
  card: palette.white,
  text: palette.gray[900],
  textMuted: palette.gray[500],
  textLight: palette.gray[400],
  border: palette.gray[200],
  error: palette.danger,
  success: palette.success,
  warning: palette.warning,
  info: palette.info,
  placeholder: palette.gray[400],
  notification: palette.danger,
};

export const darkTheme: ThemeColors = {
  primary: palette.primary,
  secondary: palette.secondary,
  accent: palette.accent,
  background: palette.gray[900],
  surface: palette.gray[800],
  card: palette.gray[800],
  text: palette.gray[50],
  textMuted: palette.gray[400],
  textLight: palette.gray[500],
  border: palette.gray[700],
  error: palette.danger,
  success: palette.success,
  warning: palette.warning,
  info: palette.info,
  placeholder: palette.gray[600],
  notification: palette.danger,
};

export const colors = {
  palette,
  light: lightTheme,
  dark: darkTheme,
};

// FICHIER SUIVANT : mobile/src/constants/spacing.ts
