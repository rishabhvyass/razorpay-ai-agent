import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '../../theme/motion';
import { useReduceMotion } from './useReduceMotion';

interface StaggeredOptions {
  index: number;
  staggerDelay?: number;
  duration?: number;
  distance?: number;
  maxStagger?: number;
}

export function useStaggeredEntrance({
  index,
  staggerDelay = motion.stagger.normal,
  duration = motion.duration.normal,
  distance = motion.translate.medium,
  maxStagger = 240,
}: StaggeredOptions) {
  const reduceMotion = useReduceMotion();
  const calculatedDelay = Math.min(index * staggerDelay, maxStagger);

  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : distance)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay: calculatedDelay,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        ...motion.spring.gentle,
        delay: calculatedDelay,
      }),
    ]);

    anim.start();

    return () => {
      anim.stop();
    };
  }, [calculatedDelay, distance, duration, opacity, reduceMotion, translateY]);

  return {
    opacity,
    translateY,
    animatedStyle: {
      opacity,
      transform: [{ translateY }],
    },
  };
}
