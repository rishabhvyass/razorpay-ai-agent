import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
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
          bg: colors.successBg,
          text: colors.successText,
          border: colors.successBorder,
          dot: colors.successDot,
        };
      case 'warning':
        return {
          bg: colors.warningBg,
          text: colors.warningText,
          border: colors.warningBorder,
          dot: colors.warningDot,
        };
      case 'danger':
        return {
          bg: colors.dangerBg,
          text: colors.dangerText,
          border: colors.dangerBorder,
          dot: colors.dangerDot,
        };
      case 'info':
        return {
          bg: colors.infoBg,
          text: colors.infoText,
          border: colors.infoBorder,
          dot: colors.info,
        };
      case 'aiPick':
        return {
          bg: 'rgba(255, 255, 255, 0.92)',
          text: colors.textPrimary,
          border: 'rgba(228, 228, 231, 0.6)',
          dot: colors.accentPurple,
        };
      case 'outline':
        return {
          bg: colors.surface,
          text: colors.textSecondary,
          border: colors.border,
          dot: colors.textMuted,
        };
      case 'testMode':
        return {
          bg: colors.warningBg,
          text: colors.warningText,
          border: colors.warningBorder,
          dot: colors.warningDot,
        };
      case 'neutral':
      default:
        return {
          bg: colors.neutralBg,
          text: colors.neutralText,
          border: colors.neutralBorder,
          dot: colors.neutralDot,
        };
    }
  };

  const v = getVariantStyles();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: isSm ? 8 : 12,
          paddingVertical: isSm ? 3 : 5,
        },
        style,
      ]}
    >
      {hasDot && <View style={[styles.dot, { backgroundColor: v.dot }]} />}
      <Text
        style={[
          styles.text,
          { color: v.text, fontSize: isSm ? 11 : 12 },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    ...typography.captionBold,
    letterSpacing: 0.1,
  },
});
