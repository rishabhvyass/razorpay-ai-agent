import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export function Loading({ message = 'Loading...', size = 'large', style }: LoadingProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={colors.accent} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
