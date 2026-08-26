import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '../../theme/motion';
import { useReduceMotion } from './useReduceMotion';

interface FadeInOptions {
  duration?: number;
  delay?: number;
  initialOpacity?: number;
  autoPlay?: boolean;
}

export function useFadeIn(options: FadeInOptions = {}) {
  const {
    duration = motion.duration.normal,
    delay = 0,
    initialOpacity = 0,
    autoPlay = true,
  } = options;

  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : initialOpacity)).current;

  useEffect(() => {
    if (!autoPlay) return;

    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }

    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: motion.easing.easeOut,
      useNativeDriver: true,
    });

    anim.start();

    return () => {
      anim.stop();
    };
  }, [autoPlay, delay, duration, opacity, reduceMotion]);

  return {
    opacity,
    animatedStyle: { opacity },
  };
}
