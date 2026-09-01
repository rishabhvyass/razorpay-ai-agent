import React from 'react';
import { GestureResponderEvent, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { radius, shadows, spacing, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'subtle';
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  pressScale?: number;
  disabled?: boolean;
}

export function Card({
  children,
  variant = 'default',
  style,
  onPress,
  pressScale = motion.scale.cardPress,
  disabled = false,
  ...rest
}: CardProps) {
  const themeColors = useThemeColors();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: themeColors.surface,
          borderWidth: 1,
          borderColor: themeColors.border,
          ...shadows.card,
        };
      case 'outlined':
        return {
          backgroundColor: themeColors.surface,
          borderWidth: 1,
          borderColor: themeColors.border,
        };
      case 'subtle':
        return {
          backgroundColor: themeColors.surfaceSubtle,
          borderWidth: 1,
          borderColor: themeColors.borderSubtle,
        };
      case 'default':
      default:
        return {
          backgroundColor: themeColors.surface,
          borderWidth: 1,
          borderColor: themeColors.border,
          ...shadows.subtle,
        };
    }
  };

  const cardStyle = [styles.baseCard, getVariantStyle(), style];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        pressScale={pressScale}
        disabled={disabled}
        style={cardStyle}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
  },
});
