import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, typography } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';

export interface PriceDisplayProps {
  amountMinor: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PriceDisplay({
  amountMinor,
  currency = 'INR',
  size = 'md',
  style,
  textStyle,
}: PriceDisplayProps) {
  const formatted = formatMinorUnits(amountMinor, currency);

  const getTextStyle = (): TextStyle => {
    switch (size) {
      case 'sm':
        return styles.smText;
      case 'lg':
        return styles.lgText;
      case 'xl':
        return styles.xlText;
      case 'md':
      default:
        return styles.mdText;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.baseText, getTextStyle(), textStyle]}>{formatted}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  baseText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  smText: {
    fontSize: 14,
    lineHeight: 18,
  },
  mdText: {
    fontSize: 17,
    lineHeight: 22,
  },
  lgText: {
    fontSize: 22,
    lineHeight: 28,
  },
  xlText: {
    fontSize: 28,
    lineHeight: 34,
  },
});
