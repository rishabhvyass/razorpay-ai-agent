import { useThemeStore } from '../store/themeStore';

export interface ColorPalette {
  // Brand & Financial
  razorBlue: string;
  deepBlue: string;
  navyBlue: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySubtle: string;
  primaryUltraLight: string;

  // Aliases
  razorPurple: string;
  deepPurple: string;

  // AI Identity
  aiBlue: string;
  aiViolet: string;
  brightViolet: string;
  softLavender: string;
  iceBlue: string;

  // Context & Legacy Aliases
  fintechBlue: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  accentPurple: string;
  accentPurpleBg: string;

  // Canvas & Surfaces
  background: string;
  backgroundSubtle: string;
  surface: string;
  surfaceSubtle: string;
  surfaceMuted: string;

  // Text Hierarchy
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textTertiary: string;
  textInverse: string;

  // Hairlines & Borders
  border: string;
  borderSubtle: string;
  borderFocus: string;

  // Status
  success: string;
  successBg: string;
  successText: string;
  successBorder: string;
  successDot: string;

  warning: string;
  warningBg: string;
  warningText: string;
  warningBorder: string;
  warningDot: string;

  error: string;
  danger: string;
  dangerBg: string;
  dangerText: string;
  dangerBorder: string;
  dangerDot: string;

  info: string;
  infoBg: string;
  infoText: string;
  infoBorder: string;

  neutralBg: string;
  neutralText: string;
  neutralBorder: string;
  neutralDot: string;

  testModeBg: string;
  testModeText: string;
  testModeBorder: string;

  shadowColor: string;
  overlay: string;
}

export const lightColors: ColorPalette = {
  // Primary Brand & Financial Actions (Razorpay Electric Blue & Deep Navy)
  razorBlue: '#0066FF',
  deepBlue: '#0A2540',
  navyBlue: '#0F172A',
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryLight: '#388BFD',
  primarySubtle: '#EFF6FF',
  primaryUltraLight: '#F8FAFC',

  // Aliases for compatibility
  razorPurple: '#0066FF',
  deepPurple: '#0052CC',

  // AI Identity & Interactions
  aiBlue: '#0284C7',
  aiViolet: '#0066FF',
  brightViolet: '#38BDF8',
  softLavender: '#EFF6FF',
  iceBlue: '#E0F2FE',

  // Fintech & Trust Context
  fintechBlue: '#0066FF',

  // Legacy Accent Aliases
  accent: '#0066FF',
  accentLight: '#EFF6FF',
  accentDark: '#0052CC',
  accentPurple: '#0066FF',
  accentPurpleBg: '#0066FF',

  // Canvas & Surfaces
  background: '#F8FAFC',
  backgroundSubtle: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  surfaceMuted: '#E2E8F0',

  // Text Hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textTertiary: '#CBD5E1',
  textInverse: '#FFFFFF',

  // Hairlines & Dividers
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: '#0066FF',

  // Status
  success: '#16A34A',
  successBg: '#F0FDF4',
  successText: '#15803D',
  successBorder: '#DCFCE7',
  successDot: '#16A34A',

  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningText: '#B45309',
  warningBorder: '#FEF3C7',
  warningDot: '#D97706',

  error: '#DC2626',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerText: '#B91C1C',
  dangerBorder: '#FEE2E2',
  dangerDot: '#DC2626',

  info: '#0284C7',
  infoBg: '#F0F9FF',
  infoText: '#0369A1',
  infoBorder: '#BAE6FD',

  neutralBg: '#F1F5F9',
  neutralText: '#475569',
  neutralBorder: '#E2E8F0',
  neutralDot: '#94A3B8',

  testModeBg: '#EFF6FF',
  testModeText: '#0066FF',
  testModeBorder: '#BFDBFE',

  shadowColor: '#0F172A',
  overlay: 'rgba(15, 23, 42, 0.40)',
};

export const darkColors: ColorPalette = {
  // Primary Brand & Financial Actions
  razorBlue: '#388BFD',
  deepBlue: '#0A2540',
  navyBlue: '#0B0F19',
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryLight: '#58A6FF',
  primarySubtle: '#172554',
  primaryUltraLight: '#0F172A',

  // Aliases for compatibility
  razorPurple: '#0066FF',
  deepPurple: '#0052CC',

  // AI Identity & Interactions
  aiBlue: '#38BDF8',
  aiViolet: '#388BFD',
  brightViolet: '#60A5FA',
  softLavender: '#1E293B',
  iceBlue: '#172554',

  // Fintech & Trust Context
  fintechBlue: '#388BFD',

  // Legacy Accent Aliases
  accent: '#0066FF',
  accentLight: '#172554',
  accentDark: '#0052CC',
  accentPurple: '#0066FF',
  accentPurpleBg: '#0066FF',

  // Canvas & Surfaces (Deep OLED Space & Slate Dark)
  background: '#090D16',
  backgroundSubtle: '#0F172A',
  surface: '#111827',
  surfaceSubtle: '#1E293B',
  surfaceMuted: '#334155',

  // Text Hierarchy
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textTertiary: '#475569',
  textInverse: '#090D16',

  // Hairlines & Dividers
  border: '#1E293B',
  borderSubtle: '#0F172A',
  borderFocus: '#388BFD',

  // Status
  success: '#22C55E',
  successBg: '#052E16',
  successText: '#4ADE80',
  successBorder: '#14532D',
  successDot: '#22C55E',

  warning: '#F59E0B',
  warningBg: '#451A03',
  warningText: '#FBBF24',
  warningBorder: '#78350F',
  warningDot: '#F59E0B',

  error: '#EF4444',
  danger: '#EF4444',
  dangerBg: '#450A0A',
  dangerText: '#F87171',
  dangerBorder: '#7F1D1D',
  dangerDot: '#EF4444',

  info: '#38BDF8',
  infoBg: '#082F49',
  infoText: '#7DD3FC',
  infoBorder: '#075985',

  neutralBg: '#1E293B',
  neutralText: '#94A3B8',
  neutralBorder: '#334155',
  neutralDot: '#64748B',

  testModeBg: '#172554',
  testModeText: '#60A5FA',
  testModeBorder: '#1E3A8A',

  shadowColor: '#000000',
  overlay: 'rgba(0, 0, 0, 0.70)',
};

export type Colors = ColorPalette;

/**
 * Dynamic Proxy colors object:
 * Automatically reads the current theme from Zustand and returns the active color palette.
 */
export const colors: Colors = new Proxy(lightColors, {
  get(_target, prop: keyof Colors) {
    const isDark = useThemeStore.getState().isDark;
    const activePalette = isDark ? darkColors : lightColors;
    return activePalette[prop];
  },
});

/**
 * React hook for components to subscribe directly to theme color changes
 */
export function useThemeColors(): Colors {
  const isDark = useThemeStore((state) => state.isDark);
  return isDark ? darkColors : lightColors;
}
