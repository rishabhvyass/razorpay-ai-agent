import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { radius, spacing, typography, useThemeColors } from '../../theme';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  suggestedPrompts?: string[];
  onSelectPrompt?: (prompt: string) => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  badge,
  title,
  description,
  actionTitle,
  onAction,
  suggestedPrompts = [],
  onSelectPrompt,
  style,
}: EmptyStateProps) {
  const themeColors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      {badge ? (
        <View style={[styles.badgeContainer, { backgroundColor: themeColors.primarySubtle }]}>
          <Sparkles size={13} color={themeColors.primary} />
          <Text style={[styles.badgeText, { color: themeColors.primary }]}>{badge}</Text>
        </View>
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: themeColors.primarySubtle }]}>
          {icon ? icon : <Sparkles size={24} color={themeColors.primary} />}
        </View>
      )}

      <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: themeColors.textSecondary }]}>{description}</Text>

      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          variant="primary"
          size="md"
          onPress={onAction}
          style={styles.button}
        />
      ) : null}

      {suggestedPrompts.length > 0 && onSelectPrompt ? (
        <View style={styles.promptList}>
          {suggestedPrompts.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.promptChip, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
              onPress={() => onSelectPrompt(p)}
              activeOpacity={0.75}
            >
              <Text style={[styles.promptText, { color: themeColors.textPrimary }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginBottom: spacing.md,
    gap: 5,
  },
  badgeText: {
    ...typography.captionBold,
    fontSize: 12,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 160,
  },
  promptList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    maxWidth: 320,
  },
  promptChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  promptText: {
    ...typography.captionMedium,
    fontSize: 12,
  },
});
