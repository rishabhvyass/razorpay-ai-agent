import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface PulsingRingProps {
  size?: number;
  color?: string;
  minScale?: number;
  maxScale?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PulsingRing({
  size = 64,
  color = colors.primarySubtle,
  minScale = 1.0,
  maxScale = 1.15,
  duration = motion.duration.breathing,
  style,
  children,
}: PulsingRingProps) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(minScale)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(minScale);
      opacity.setValue(0.7);
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
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
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: duration / 2,
            easing: motion.easing.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: duration / 2,
            easing: motion.easing.easeInOut,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [duration, maxScale, minScale, opacity, reduceMotion, scale]);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
  },
});
