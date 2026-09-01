import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { spacing, typography, useThemeColors } from '../../theme';

export interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export function Loading({ message = 'Searching your catalog...', size = 'small', style }: LoadingProps) {
  const themeColors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={themeColors.primary} />
      {message ? <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...typography.secondaryMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
