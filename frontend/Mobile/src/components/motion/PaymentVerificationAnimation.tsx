import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
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
        <View style={styles.spinnerTrack} />
        {!reduceMotion && (
          <Animated.View
            style={[
              styles.spinnerArc,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.centerLockIcon,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Lock size={22} color={colors.primary} strokeWidth={2.4} />
        </Animated.View>
      </View>

      {/* Amount */}
      <Text style={styles.amountText}>{amountFormatted}</Text>

      {/* Status Title & Subtitle */}
      <Text style={styles.titleText}>Verifying payment</Text>
      <Text style={styles.subtitleText}>
        We're waiting for confirmation from Razorpay.
      </Text>

      {/* Test Mode Badge */}
      {testMode && (
        <View style={styles.testModeBadge}>
          <Text style={styles.testModeText}>TEST MODE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  spinnerContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.lg,
  },
  spinnerTrack: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.primarySubtle,
  },
  spinnerArc: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: colors.primary,
    borderLeftColor: colors.primary,
  },
  centerLockIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    ...typography.h1,
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleText: {
    ...typography.bodyBold,
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitleText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  testModeBadge: {
    backgroundColor: colors.testModeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testModeText: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.testModeText,
    letterSpacing: 0.5,
  },
});
