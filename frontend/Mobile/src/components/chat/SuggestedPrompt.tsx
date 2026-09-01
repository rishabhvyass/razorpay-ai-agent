import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { colors, radius, spacing, typography } from '../../theme';

interface SuggestedPromptProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

export function SuggestedPrompt({ prompts, onSelectPrompt }: SuggestedPromptProps) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>Suggested questions</Text>
      <View style={styles.chipRow}>
        {prompts.map((prompt, index) => {
          const isFirst = index === 0;
          return (
            <AnimatedPressable
              key={prompt}
              style={[
                styles.chip,
                isFirst && styles.chipHighlight,
              ]}
              pressScale={0.95}
              onPress={() => onSelectPrompt(prompt)}
              accessibilityLabel={`Ask ${prompt}`}
            >
              <Text
                style={[
                  styles.chipText,
                  isFirst && styles.chipTextHighlight,
                ]}
              >
                {prompt}
              </Text>
              <ArrowUpRight
                size={13}
                color={isFirst ? colors.primary : colors.textMuted}
              />
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    paddingLeft: 36,
  },
  headerLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    gap: 4,
  },
  chipHighlight: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primarySubtle,
  },
  chipText: {
    ...typography.secondaryMedium,
    color: colors.textPrimary,
    fontSize: 13,
  },
  chipTextHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});
