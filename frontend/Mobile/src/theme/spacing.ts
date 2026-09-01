export const spacing = {
  // 8-Point Spacing Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48
  xxs: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20, // Primary screen padding & card padding
  xxl: 24, // Section spacing
  xxxl: 32, // Large section gaps
  huge: 40,
  massive: 48,

  // Semantic layout aliases
  screenHorizontal: 20,
  cardPadding: 16,
  cardPaddingLarge: 20,
  sectionGap: 24,
  largeSectionGap: 32,
} as const;

export type Spacing = typeof spacing;
