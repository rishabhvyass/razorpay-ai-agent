import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';
import { ChatMessage } from '../../types';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface UserMessageProps {
  message: ChatMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  const reduceMotion = useReduceMotion();
  const themeColors = useThemeColors();

  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.98)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, reduceMotion, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: themeColors.primary }]}>
        <Text style={styles.text}>{message.content}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    marginVertical: spacing.xs,
    paddingLeft: 48,
    width: '100%',
  },
  bubble: {
    borderRadius: radius.inputs,
    borderBottomRightRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '80%',
  },
  text: {
    ...typography.body,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
});
