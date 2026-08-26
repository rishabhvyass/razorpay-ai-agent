import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface AnimatedCheckProps {
  size?: number;
  iconSize?: number;
  circleColor?: string;
  checkColor?: string;
  strokeWidth?: number;
  onAnimationComplete?: () => void;
}

export function AnimatedCheck({
  size = 72,
  iconSize = 34,
  circleColor = colors.successBg,
  checkColor = colors.success,
  strokeWidth = 3,
  onAnimationComplete,
}: AnimatedCheckProps) {
  const reduceMotion = useReduceMotion();

  const circleScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.7)).current;
  const circleOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      circleScale.setValue(1);
      circleOpacity.setValue(1);
      checkScale.setValue(1);
      checkOpacity.setValue(1);
      onAnimationComplete?.();
      return;
    }

    const sequence = Animated.sequence([
      // 1. Circle pops in
      Animated.parallel([
        Animated.timing(circleOpacity, {
          toValue: 1,
          duration: 160,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(circleScale, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // 2. Checkmark reveals
      Animated.parallel([
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 140,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          tension: 140,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]);

    sequence.start(() => {
      onAnimationComplete?.();
    });

    return () => {
      sequence.stop();
    };
  }, [checkOpacity, checkScale, circleOpacity, circleScale, onAnimationComplete, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: circleColor,
          opacity: circleOpacity,
          transform: [{ scale: circleScale }],
        },
      ]}
    >
      <Animated.View
        style={{
          opacity: checkOpacity,
          transform: [{ scale: checkScale }],
        }}
      >
        <Check size={iconSize} color={checkColor} strokeWidth={strokeWidth} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
