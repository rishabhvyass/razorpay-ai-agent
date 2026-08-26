import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface PaymentFailureAnimationProps {
  title?: string;
  subtitle?: string;
}

export function PaymentFailureAnimation({
  title = "Payment wasn't completed",
  subtitle = 'No successful payment was verified by Razorpay.',
}: PaymentFailureAnimationProps) {
  const reduceMotion = useReduceMotion();

  const iconScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.75)).current;
  const iconOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const textOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const textTranslateY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;

  useEffect(() => {
    if (reduceMotion) {
      iconScale.setValue(1);
      iconOpacity.setValue(1);
      textOpacity.setValue(1);
      textTranslateY.setValue(0);
      return;
    }

    Animated.sequence([
      // 1. Warning Icon reveals
      Animated.parallel([
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // 2. Text elements fade in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          ...motion.spring.gentle,
        }),
      ]),
    ]).start();
  }, [iconOpacity, iconScale, reduceMotion, textOpacity, textTranslateY]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.heroIconCircle,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <AlertCircle size={36} color={colors.danger} strokeWidth={2.4} />
      </Animated.View>

      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslateY }],
          alignItems: 'center',
        }}
      >
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 270,
  },
});
