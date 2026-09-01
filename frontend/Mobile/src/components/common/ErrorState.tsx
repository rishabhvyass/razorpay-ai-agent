import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, spacing, typography, useThemeColors } from '../../theme';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  retryTitle?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Unable to complete request',
  message = 'Checkout Concierge is having trouble connecting. Please check your network and try again.',
  code,
  retryTitle = 'Try again',
  onRetry,
  style,
}: ErrorStateProps) {
  const themeColors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: themeColors.warningBg }]}>
        <AlertCircle size={24} color={colors.warning} />
      </View>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>
      {code ? <Text style={[styles.code, { color: themeColors.textMuted }]}>Reference: {code}</Text> : null}
      {onRetry ? (
        <Button
          title={retryTitle}
          variant="outline"
          size="md"
          onPress={onRetry}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
  },
  code: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing.xl,
    minWidth: 140,
  },
});
