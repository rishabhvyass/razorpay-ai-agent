import React from 'react';
import { Animated, StyleProp, ViewProps, ViewStyle } from 'react-native';
import { useFadeIn } from '../../hooks/motion/useFadeIn';
import { motion } from '../../theme/motion';

interface FadeInViewProps extends ViewProps {
  children?: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({
  children,
  duration = motion.duration.normal,
  delay = 0,
  style,
  ...props
}: FadeInViewProps) {
  const { animatedStyle } = useFadeIn({ duration, delay });

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}
