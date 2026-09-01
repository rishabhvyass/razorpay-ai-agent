import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { AnimatedPressable, AnimatedPressableProps } from './AnimatedPressable';
import { motion } from '../../theme/motion';

export interface ScalePressableProps extends Omit<AnimatedPressableProps, 'style' | 'pressScale' | 'children'> {
  children?: React.ReactNode;
  pressedScale?: number;
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable ScalePressable component
 * Standardized on AnimatedPressable with accessibility, spring physics, and reduced-motion support.
 */
export function ScalePressable({
  children,
  pressedScale,
  pressScale = pressedScale ?? motion.scale.cardPress,
  style,
  ...props
}: ScalePressableProps) {
  return (
    <AnimatedPressable
      pressScale={pressScale}
      style={style}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
