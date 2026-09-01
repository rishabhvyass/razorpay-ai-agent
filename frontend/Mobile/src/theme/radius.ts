export const radius = {
  xs: 4,
  sm: 8,
  small: 10, // Small tags & micro controls
  md: 12,
  inputs: 16, // Inputs & interactive chips
  lg: 16,
  cards: 20, // Standard product & message cards
  xl: 20,
  largeCards: 24, // Major highlight cards
  xxl: 24,
  bottomSheets: 28, // Bottom sheets & modals
  sheet: 28,
  circular: 999, // Circular buttons & pills
  full: 999,
} as const;

export type Radius = typeof radius;
