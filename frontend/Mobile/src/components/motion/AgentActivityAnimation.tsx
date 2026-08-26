import React from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useStaggeredEntrance } from '../../hooks/motion/useStaggeredEntrance';
import { motion } from '../../theme/motion';

interface AgentActivityAnimationProps {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AgentActivityAnimation({
  index,
  children,
  style,
}: AgentActivityAnimationProps) {
  const { opacity, translateY, animatedStyle } = useStaggeredEntrance({
    index,
    staggerDelay: motion.stagger.normal,
    distance: 8,
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
