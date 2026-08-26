import { useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '../../theme/motion';
import { useReduceMotion } from './useReduceMotion';

interface PressScaleOptions {
  pressedScale?: number;
  duration?: number;
}

export function usePressScale(options: PressScaleOptions = {}) {
  const { pressedScale = motion.scale.press, duration = motion.duration.fast } = options;
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: pressedScale,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return {
    scale,
    handlePressIn,
    handlePressOut,
    animatedStyle: {
      transform: [{ scale }],
    },
  };
}
