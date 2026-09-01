import React, { useEffect, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Mic, Sparkles } from 'lucide-react-native';
import { colors, shadows } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

export interface AIButtonProps {
  onPress: () => void;
  isActive?: boolean;
  isThinking?: boolean;
  icon?: 'mic' | 'sparkles';
  size?: number;
  accessibilityLabel?: string;
}

export function AIButton({
  onPress,
  isActive = false,
  isThinking = false,
  icon = 'sparkles',
  size = 38,
  accessibilityLabel = 'Ask AI Concierge',
}: AIButtonProps) {
  const reduceMotion = useReduceMotion();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleScale = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  // Icon transition values
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const thinkingOpacity = useRef(new Animated.Value(0)).current;
  const thinkingScale = useRef(new Animated.Value(0.85)).current;

  // Active breathing loop
  useEffect(() => {
    if (reduceMotion || !isActive) {
      scaleAnim.setValue(1);
      return;
    }

    const breathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.04,
          duration: 1000,
          easing: motion.easing.easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 1000,
          easing: motion.easing.easeInOut,
          useNativeDriver: true,
        }),
      ]),
    );

    breathingLoop.start();
    return () => breathingLoop.stop();
  }, [isActive, reduceMotion, scaleAnim]);

  // Transition from icon -> thinking state
  useEffect(() => {
    if (reduceMotion) {
      iconOpacity.setValue(isThinking ? 0 : 1);
      thinkingOpacity.setValue(isThinking ? 1 : 0);
      return;
    }

    if (isThinking) {
      Animated.parallel([
        Animated.timing(iconOpacity, {
          toValue: 0,
          duration: 160,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 0.88,
          duration: 160,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(thinkingOpacity, {
          toValue: 1,
          duration: 200,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(thinkingScale, {
          toValue: 1,
          ...motion.spring.snappy,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(thinkingOpacity, {
          toValue: 0,
          duration: 160,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(thinkingScale, {
          toValue: 0.88,
          duration: 160,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 200,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          ...motion.spring.snappy,
        }),
      ]).start();
    }
  }, [iconOpacity, iconScale, isThinking, reduceMotion, thinkingOpacity, thinkingScale]);

  const handlePressIn = () => {
    if (reduceMotion) return;

    // Fast scale down (1 -> 0.94)
    Animated.timing(scaleAnim, {
      toValue: 0.94,
      duration: 120,
      easing: motion.easing.easeOut,
      useNativeDriver: true,
    }).start();

    // Trigger subtle expanding ring (0.8 -> 1.5, opacity 0.25 -> 0)
    rippleScale.setValue(0.8);
    rippleOpacity.setValue(0.25);
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1.5,
        duration: 280,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 280,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) return;

    // Spring back to 1
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...motion.spring.snappy,
    }).start();
  };

  const radiusVal = size / 2;
  const iconSize = Math.round(size * 0.46);

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.wrapper, { width: size, height: size }]}>
        {/* Expanding Subtle Ripple Ring */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ripple,
            {
              width: size,
              height: size,
              borderRadius: radiusVal,
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />

        {/* Main Interactive Button Surface */}
        <Animated.View
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: radiusVal,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Main Icon */}
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                opacity: iconOpacity,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            {icon === 'mic' ? (
              <Mic size={iconSize} color={colors.primary} strokeWidth={2.2} />
            ) : (
              <Sparkles size={iconSize} color={colors.primary} strokeWidth={2.2} />
            )}
          </Animated.View>

          {/* Thinking Mini Spinner State */}
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                opacity: thinkingOpacity,
                transform: [{ scale: thinkingScale }],
              },
            ]}
          >
            <View style={styles.thinkingDot} />
          </Animated.View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
  button: {
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  iconWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
