export const colors = {
  // Primary colors
  primary: '#E58B5A',
  primaryLight: '#F5A67A',
  primaryDark: '#D97746',

  // Background colors
  background: '#F7F1EA',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Text colors
  text: '#2D2D2D',
  textMuted: '#7A7A7A',
  textLight: '#A0A0A0',

  // Accent colors
  accent: '#E58B5A',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',

  // Border colors
  border: '#E8E0D8',
  borderLight: '#F0EBE5',

  // Category colors
  categories: {
    groceries: '#4CAF50',
    leisure: '#9C27B0',
    transport: '#2196F3',
    housing: '#FF9800',
    health: '#F44336',
    other: '#607D8B',
  } as Record<string, string>,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
}

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
}

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
}