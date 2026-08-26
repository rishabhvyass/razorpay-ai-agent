import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, spacing, theme } from '../../theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'subtle';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'default', style, ...rest }: CardProps) {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          ...theme.shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'subtle':
        return {
          backgroundColor: colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...theme.shadows.sm,
        };
    }
  };

  return (
    <View style={[styles.baseCard, getVariantStyle(), style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
