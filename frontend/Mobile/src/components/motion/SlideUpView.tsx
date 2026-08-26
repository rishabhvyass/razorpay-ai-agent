import React from 'react';
import { Animated, StyleProp, ViewProps, ViewStyle } from 'react-native';
import { useSlideUp } from '../../hooks/motion/useSlideUp';
import { motion } from '../../theme/motion';

interface SlideUpViewProps extends ViewProps {
  children?: React.ReactNode;
  distance?: number;
  duration?: number;
  delay?: number;
  useSpring?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SlideUpView({
  children,
  distance = motion.translate.medium,
  duration = motion.duration.normal,
  delay = 0,
  useSpring = false,
  style,
  ...props
}: SlideUpViewProps) {
  const { animatedStyle } = useSlideUp({ distance, duration, delay, useSpring });

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}
