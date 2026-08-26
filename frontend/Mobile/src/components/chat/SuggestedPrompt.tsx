import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from '../motion/ScalePressable';
import { SlideUpView } from '../motion/SlideUpView';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';

interface SuggestedPromptProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

export function SuggestedPrompt({ prompts, onSelectPrompt }: SuggestedPromptProps) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <View style={styles.container}>
      {prompts.map((prompt, idx) => {
        const isFirst = idx === 0;
        const delay = Math.min(idx * motion.stagger.fast, 180);

        return (
          <SlideUpView
            key={`${prompt}-${idx}`}
            distance={8}
            duration={motion.duration.fast}
            delay={delay}
          >
            <ScalePressable
              pressedScale={motion.scale.buttonPress}
              onPress={() => onSelectPrompt(prompt)}
              style={[
                styles.chip,
                isFirst ? styles.chipFirst : styles.chipSecondary,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isFirst ? styles.chipTextFirst : styles.chipTextSecondary,
                ]}
              >
                {prompt}
              </Text>
            </ScalePressable>
          </SlideUpView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.xs + 2,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipFirst: {
    backgroundColor: colors.primaryUltraLight,
    borderColor: colors.testModeBorder,
  },
  chipSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.captionMedium,
    fontSize: 13,
  },
  chipTextFirst: {
    color: colors.primary,
    fontWeight: '700',
  },
  chipTextSecondary: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
