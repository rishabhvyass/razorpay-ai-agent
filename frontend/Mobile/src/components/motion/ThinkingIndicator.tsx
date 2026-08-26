import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface ThinkingIndicatorProps {
  visible?: boolean;
}

export function ThinkingIndicator({ visible = true }: ThinkingIndicatorProps) {
  const reduceMotion = useReduceMotion();

  // Main container entrance/exit
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerTranslateY = useRef(new Animated.Value(6)).current;

  // 3 staggered dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Container entrance/exit transition
  useEffect(() => {
    if (reduceMotion) {
      containerOpacity.setValue(visible ? 1 : 0);
      containerTranslateY.setValue(0);
      return;
    }

    if (visible) {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: motion.duration.fast,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(containerTranslateY, {
          toValue: 0,
          ...motion.spring.snappy,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: motion.duration.fast,
          easing: motion.easing.easeIn,
          useNativeDriver: true,
        }),
        Animated.timing(containerTranslateY, {
          toValue: -4,
          duration: motion.duration.fast,
          easing: motion.easing.easeIn,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [containerOpacity, containerTranslateY, reduceMotion, visible]);

  // Dot bouncing loop
  useEffect(() => {
    if (reduceMotion || !visible) {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
      return;
    }

    const createDotBounce = (dotAnim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotAnim, {
              toValue: -5,
              duration: 260,
              easing: motion.easing.easeInOut,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
              toValue: 0,
              duration: 260,
              easing: motion.easing.easeInOut,
              useNativeDriver: true,
            }),
            Animated.delay(280),
          ]),
        ),
      ]);
    };

    const anim1 = createDotBounce(dot1, 0);
    const anim2 = createDotBounce(dot2, 140);
    const anim3 = createDotBounce(dot3, 280);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3, reduceMotion, visible]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ translateY: containerTranslateY }],
        },
      ]}
    >
      <View style={styles.pill}>
        <Text style={styles.text}>Concierge is thinking...</Text>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    alignSelf: 'flex-start',
    paddingLeft: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  text: {
    ...typography.captionMedium,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 12,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
