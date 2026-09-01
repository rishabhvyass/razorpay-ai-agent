import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { radius, typography, useThemeColors } from '../../theme';
import { OrderStatus } from '../../types';

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'aiPick' | 'outline' | 'testMode';
  status?: OrderStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  label,
  variant,
  status,
  size = 'md',
  showDot = false,
  style,
  textStyle,
}: BadgeProps) {
  const themeColors = useThemeColors();
  let resolvedVariant = variant || 'default';
  let hasDot = showDot;

  if (status) {
    hasDot = true;
    switch (status) {
      case 'PAID':
        resolvedVariant = 'success';
        break;
      case 'PENDING_CONFIRMATION':
      case 'ORDER_CREATED':
      case 'PAYMENT_PENDING':
        resolvedVariant = 'warning';
        break;
      case 'PAYMENT_FAILED':
        resolvedVariant = 'danger';
        break;
      case 'CANCELLED':
      case 'PAYMENT_EXPIRED':
      default:
        resolvedVariant = 'neutral';
        break;
    }
  }

  const getVariantStyles = (): { bg: string; text: string; border: string; dot: string } => {
    switch (resolvedVariant) {
      case 'success':
        return {
          bg: themeColors.successBg,
          text: themeColors.successText,
          border: themeColors.successBorder,
          dot: themeColors.successDot,
        };
      case 'warning':
        return {
          bg: themeColors.warningBg,
          text: themeColors.warningText,
          border: themeColors.warningBorder,
          dot: themeColors.warningDot,
        };
      case 'danger':
        return {
          bg: themeColors.dangerBg,
          text: themeColors.dangerText,
          border: themeColors.dangerBorder,
          dot: themeColors.dangerDot,
        };
      case 'info':
        return {
          bg: themeColors.infoBg,
          text: themeColors.infoText,
          border: themeColors.infoBorder,
          dot: themeColors.info,
        };
      case 'neutral':
        return {
          bg: themeColors.neutralBg,
          text: themeColors.neutralText,
          border: themeColors.neutralBorder,
          dot: themeColors.neutralDot,
        };
      case 'aiPick':
        return {
          bg: themeColors.primarySubtle,
          text: themeColors.primary,
          border: themeColors.primarySubtle,
          dot: themeColors.primary,
        };
      case 'testMode':
        return {
          bg: themeColors.testModeBg,
          text: themeColors.testModeText,
          border: themeColors.testModeBorder,
          dot: themeColors.primary,
        };
      case 'outline':
        return {
          bg: themeColors.surface,
          text: themeColors.textSecondary,
          border: themeColors.border,
          dot: themeColors.textMuted,
        };
      case 'default':
      default:
        return {
          bg: themeColors.surfaceSubtle,
          text: themeColors.textPrimary,
          border: themeColors.border,
          dot: themeColors.primary,
        };
    }
  };

  const vStyles = getVariantStyles();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        isSm ? styles.containerSm : styles.containerMd,
        {
          backgroundColor: vStyles.bg,
          borderColor: vStyles.border,
        },
        style,
      ]}
    >
      {hasDot && (
        <View
          style={[
            styles.dot,
            isSm ? styles.dotSm : styles.dotMd,
            { backgroundColor: vStyles.dot },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          isSm ? styles.textSm : styles.textMd,
          { color: vStyles.text },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  containerMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: radius.full,
  },
  dotSm: {
    width: 5,
    height: 5,
    marginRight: 4,
  },
  dotMd: {
    width: 6,
    height: 6,
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  textMd: {
    ...typography.captionBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
