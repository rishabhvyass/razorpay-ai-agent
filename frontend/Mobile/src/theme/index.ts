import { colors } from './colors';
import { motion } from './motion';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  motion,
  shadows: {
    sm: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

export { colors, motion, radius, spacing, typography };
