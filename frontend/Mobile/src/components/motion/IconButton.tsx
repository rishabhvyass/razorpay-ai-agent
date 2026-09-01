import React, { useRef } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

export interface IconButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  size?: number;
  backgroundColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

export function IconButton({
  children,
  onPress,
  size = 36,
  backgroundColor,
  disabled = false,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  const themeColors = useThemeColors();
  const reduceMotion = useReduceMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const resolvedBg = backgroundColor || themeColors.surfaceSubtle;

  const handlePressIn = () => {
    if (disabled || reduceMotion) return;
    Animated.timing(scaleAnim, {
      toValue: 0.88,
      duration: 100,
      easing: motion.easing.easeOut,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...motion.spring.snappy,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: resolvedBg,
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
