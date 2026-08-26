import React from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { usePressScale } from '../../hooks/motion/usePressScale';
import { motion } from '../../theme/motion';

interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  children?: React.ReactNode;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScalePressable({
  children,
  pressedScale = motion.scale.cardPress,
  style,
  onPressIn,
  onPressOut,
  ...props
}: ScalePressableProps) {
  const { animatedStyle, handlePressIn, handlePressOut } = usePressScale({
    pressedScale,
  });

  return (
    <Pressable
      onPressIn={(e) => {
        handlePressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        handlePressOut();
        onPressOut?.(e);
      }}
      {...props}
    >
      <Animated.View style={[animatedStyle, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
