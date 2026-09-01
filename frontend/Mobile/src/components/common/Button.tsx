import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';

export interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  onPress,
  accessibilityLabel,
}: ButtonProps) {
  const themeColors = useThemeColors();
  const isDisabled = disabled || loading || success;

  const getContainerStyle = (): ViewStyle => {
    if (success) {
      return { backgroundColor: colors.success };
    }
    switch (variant) {
      case 'secondary':
        return { backgroundColor: themeColors.primarySubtle };
      case 'outline':
        return {
          backgroundColor: themeColors.surface,
          borderWidth: 1,
          borderColor: themeColors.border,
        };
      case 'danger':
        return { backgroundColor: themeColors.danger };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'success':
        return { backgroundColor: colors.success };
      case 'primary':
      default:
        return { backgroundColor: themeColors.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    if (success) {
      return { ...typography.bodyBold, fontSize: 15, color: '#FFFFFF', fontWeight: '600' };
    }
    switch (variant) {
      case 'secondary':
        return { ...typography.bodyBold, fontSize: 15, color: themeColors.primary, fontWeight: '600' };
      case 'outline':
        return { ...typography.bodyBold, fontSize: 15, color: themeColors.textPrimary, fontWeight: '600' };
      case 'danger':
        return { ...typography.bodyBold, fontSize: 15, color: '#FFFFFF', fontWeight: '600' };
      case 'ghost':
        return { ...typography.bodyMedium, fontSize: 15, color: themeColors.textSecondary };
      case 'success':
        return { ...typography.bodyBold, fontSize: 15, color: '#FFFFFF', fontWeight: '600' };
      case 'primary':
      default:
        return { ...typography.bodyBold, fontSize: 15, color: '#FFFFFF', fontWeight: '600' };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      case 'md':
      default:
        return styles.sizeMd;
    }
  };

  const getIndicatorColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        return '#FFFFFF';
      case 'secondary':
        return themeColors.primary;
      case 'outline':
      case 'ghost':
      default:
        return themeColors.textPrimary;
    }
  };

  return (
    <AnimatedPressable
      style={[
        styles.base,
        getContainerStyle(),
        getSizeStyle(),
        variant === 'primary' && !isDisabled && shadows.primaryButton,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      pressScale={motion.scale.buttonPress}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <View style={styles.contentRow}>
          <ActivityIndicator size="small" color={getIndicatorColor()} />
          <Text style={[getTextStyle(), styles.loadingText, textStyle]}>
            {title.includes('...') ? title : `${title}...`}
          </Text>
        </View>
      ) : success ? (
        <View style={styles.contentRow}>
          <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={[getTextStyle(), styles.successLabel, textStyle]}>{title}</Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.xs,
  },
  loadingText: {
    marginLeft: spacing.xs,
  },
  successLabel: {
    marginLeft: spacing.xs,
  },

  // Sizes
  sizeSm: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.small,
  },
  sizeMd: {
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.inputs,
  },
  sizeLg: {
    height: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.inputs,
  },

  disabled: {
    opacity: 0.5,
  },
});
