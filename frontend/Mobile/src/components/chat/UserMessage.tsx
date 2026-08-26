import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CheckCheck } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { ChatMessage } from '../../types';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';
import { formatTime } from '../../utils/formatting';

interface UserMessageProps {
  message: ChatMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  const reduceMotion = useReduceMotion();
  const timeStr = message.createdAt ? formatTime(message.createdAt) : '8:42 PM';

  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.98)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.fast,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        ...motion.spring.snappy,
      }),
      Animated.spring(scale, {
        toValue: 1,
        ...motion.spring.snappy,
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
      <View style={styles.bubble}>
        <Text style={styles.text}>{message.content}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.timeText}>{timeStr}</Text>
          <CheckCheck size={14} color="rgba(255, 255, 255, 0.85)" style={styles.checkIcon} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    marginVertical: spacing.xs + 2,
  },
  bubble: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderRadius: 20,
    maxWidth: '82%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    ...typography.body,
    color: colors.textInverse,
    fontSize: 15,
    lineHeight: 21,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    ...typography.caption,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginRight: 4,
  },
  checkIcon: {
    marginTop: 1,
  },
});
