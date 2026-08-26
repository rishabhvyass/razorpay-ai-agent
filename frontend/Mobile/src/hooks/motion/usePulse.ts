import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '../../theme/motion';
import { useReduceMotion } from './useReduceMotion';

interface PulseOptions {
  minScale?: number;
  maxScale?: number;
  duration?: number;
  active?: boolean;
}

export function usePulse(options: PulseOptions = {}) {
  const {
    minScale = motion.scale.pulseMin,
    maxScale = motion.scale.pulseMax,
    duration = motion.duration.breathing,
    active = true,
  } = options;

  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(minScale)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!active || reduceMotion) {
      scale.setValue(minScale);
      if (loopRef.current) {
        loopRef.current.stop();
      }
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: duration / 2,
          easing: motion.easing.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration: duration / 2,
          easing: motion.easing.easeInOut,
          useNativeDriver: true,
        }),
      ]),
    );

    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [active, duration, maxScale, minScale, reduceMotion, scale]);

  return {
    scale,
    animatedStyle: {
      transform: [{ scale }],
    },
  };
}
