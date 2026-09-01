import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { radius, spacing, typography, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface PaymentVerificationAnimationProps {
  amountFormatted: string;
  testMode?: boolean;
}

export function PaymentVerificationAnimation({
  amountFormatted,
  testMode = true,
}: PaymentVerificationAnimationProps) {
  const reduceMotion = useReduceMotion();
  const themeColors = useThemeColors();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;

    // Smooth calm rotation of the arc
    const spinLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    // Subtle lock pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1100,
          easing: motion.easing.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1100,
          easing: motion.easing.easeInOut,
          useNativeDriver: true,
        }),
      ]),
    );

    spinLoop.start();
    pulseLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [pulseAnim, reduceMotion, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Central Progress Ring */}
      <View style={styles.spinnerContainer}>
        <View style={[styles.spinnerTrack, { borderColor: themeColors.borderSubtle }]} />
        {!reduceMotion && (
          <Animated.View
            style={[
              styles.spinnerArc,
              {
                borderTopColor: themeColors.primary,
                borderRightColor: themeColors.primary,
                transform: [{ rotate: spin }],
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.centerLockIcon,
            {
              backgroundColor: themeColors.surface,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Lock size={22} color={themeColors.primary} strokeWidth={2.4} />
        </Animated.View>
      </View>

      {/* Amount */}
      <Text style={[styles.amountText, { color: themeColors.textPrimary }]}>{amountFormatted}</Text>

      {/* Status Title & Subtitle */}
      <Text style={[styles.titleText, { color: themeColors.textPrimary }]}>Verifying payment</Text>
      <Text style={[styles.subtitleText, { color: themeColors.textSecondary }]}>
        We're waiting for confirmation from Razorpay.
      </Text>

      {/* Test Mode pill */}
      {testMode && (
        <View style={[styles.testBadge, { backgroundColor: themeColors.testModeBg, borderColor: themeColors.testModeBorder }]}>
          <Text style={[styles.testBadgeText, { color: themeColors.testModeText }]}>TEST MODE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  spinnerContainer: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  spinnerTrack: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    position: 'absolute',
  },
  spinnerArc: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'absolute',
  },
  centerLockIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    ...typography.hero,
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  titleText: {
    ...typography.h2,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  subtitleText: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: spacing.md,
  },
  testBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  testBadgeText: {
    ...typography.captionBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
