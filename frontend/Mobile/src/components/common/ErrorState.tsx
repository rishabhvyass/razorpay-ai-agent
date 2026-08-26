import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something went wrong',
  message = "We couldn't complete the operation. Please try again.",
  code,
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <AlertCircle size={32} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {code ? <Text style={styles.code}>Error code: {code}</Text> : null}
      {onRetry ? (
        <Button
          title="Try again"
          variant="secondary"
          size="sm"
          onPress={onRetry}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  code: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.xs,
  },
});
