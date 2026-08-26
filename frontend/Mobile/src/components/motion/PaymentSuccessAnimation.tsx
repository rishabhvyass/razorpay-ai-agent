import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AnimatedCheck } from './AnimatedCheck';
import { colors, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface PaymentSuccessAnimationProps {
  amountFormatted: string;
  subtitle?: string;
  onSequenceComplete?: () => void;
}

export function PaymentSuccessAnimation({
  amountFormatted,
  subtitle = 'Your payment was verified and your order is confirmed.',
  onSequenceComplete,
}: PaymentSuccessAnimationProps) {
  const reduceMotion = useReduceMotion();

  const titleOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const titleTranslateY = useRef(new Animated.Value(reduceMotion ? 0 : 10)).current;
  const amountOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const amountScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.94)).current;
  const subtitleOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  const handleCheckComplete = () => {
    if (reduceMotion) {
      onSequenceComplete?.();
      return;
    }

    Animated.stagger(80, [
      // Title fades up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          ...motion.spring.gentle,
        }),
      ]),
      // Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: motion.duration.normal,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      // Big Amount reveals with gentle scale
      Animated.parallel([
        Animated.timing(amountOpacity, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(amountScale, {
          toValue: 1,
          ...motion.spring.snappy,
        }),
      ]),
    ]).start(() => {
      onSequenceComplete?.();
    });
  };

  useEffect(() => {
    if (reduceMotion) {
      titleOpacity.setValue(1);
      titleTranslateY.setValue(0);
      amountOpacity.setValue(1);
      amountScale.setValue(1);
      subtitleOpacity.setValue(1);
    }
  }, [amountOpacity, amountScale, reduceMotion, subtitleOpacity, titleOpacity, titleTranslateY]);

  return (
    <View style={styles.container}>
      {/* Animated Checkmark Hero */}
      <View style={styles.checkWrapper}>
        <AnimatedCheck
          size={76}
          iconSize={34}
          onAnimationComplete={handleCheckComplete}
        />
      </View>

      {/* Payment Confirmed Title */}
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        Payment confirmed
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: subtitleOpacity,
          },
        ]}
      >
        {subtitle}
      </Animated.Text>

      {/* Large Amount */}
      <Animated.Text
        style={[
          styles.amount,
          {
            opacity: amountOpacity,
            transform: [{ scale: amountScale }],
          },
        ]}
      >
        {amountFormatted}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  checkWrapper: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  amount: {
    ...typography.h1,
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
