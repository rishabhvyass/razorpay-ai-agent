import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '../../theme/motion';
import { useReduceMotion } from './useReduceMotion';

interface SlideUpOptions {
  distance?: number;
  duration?: number;
  delay?: number;
  useSpring?: boolean;
  autoPlay?: boolean;
}

export function useSlideUp(options: SlideUpOptions = {}) {
  const {
    distance = motion.translate.medium,
    duration = motion.duration.normal,
    delay = 0,
    useSpring = false,
    autoPlay = true,
  } = options;

  const reduceMotion = useReduceMotion();
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : distance)).current;
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!autoPlay) return;

    if (reduceMotion) {
      translateY.setValue(0);
      opacity.setValue(1);
      return;
    }

    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
    ];

    if (useSpring) {
      animations.push(
        Animated.spring(translateY, {
          toValue: 0,
          ...motion.spring.gentle,
          delay,
        }),
      );
    } else {
      animations.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
      );
    }

    const parallel = Animated.parallel(animations);
    parallel.start();

    return () => {
      parallel.stop();
    };
  }, [autoPlay, delay, distance, duration, opacity, reduceMotion, translateY, useSpring]);

  return {
    translateY,
    opacity,
    animatedStyle: {
      opacity,
      transform: [{ translateY }],
    },
  };
}
