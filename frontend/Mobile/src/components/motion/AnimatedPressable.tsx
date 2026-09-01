import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableWithoutFeedbackProps,
  ViewStyle,
} from 'react-native';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

export interface AnimatedPressableProps extends TouchableWithoutFeedbackProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pressScale?: number;
  activeOpacity?: number;
  disabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  enableRipple?: boolean;
  rippleColor?: string;
}

export function AnimatedPressable({
  children,
  style,
  pressScale = motion.scale.press,
  activeOpacity = 1,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedPressableProps) {
  const reduceMotion = useReduceMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;

    if (!reduceMotion) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: pressScale,
          duration: motion.duration.micro,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        activeOpacity < 1
          ? Animated.timing(opacityAnim, {
              toValue: activeOpacity,
              duration: motion.duration.micro,
              easing: motion.easing.easeOut,
              useNativeDriver: true,
            })
          : Animated.delay(0),
      ]).start();
    }

    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;

    if (!reduceMotion) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...motion.spring.snappy,
        }),
        activeOpacity < 1
          ? Animated.timing(opacityAnim, {
              toValue: 1,
              duration: motion.duration.micro,
              easing: motion.easing.easeOut,
              useNativeDriver: true,
            })
          : Animated.delay(0),
      ]).start();
    }

    onPressOut?.(e);
  };

  return (
    <TouchableWithoutFeedback
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...rest}
    >
      <Animated.View
        style={[
          styles.container,
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? motion.opacity.faint : opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
