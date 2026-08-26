import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface VoiceWaveformProps {
  active?: boolean;
  color?: string;
  barCount?: number;
}

export function VoiceWaveform({
  active = true,
  color = colors.primary,
  barCount = 8,
}: VoiceWaveformProps) {
  const reduceMotion = useReduceMotion();

  // Create animated values for up to 8 bars
  const anims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(6)),
  ).current;

  useEffect(() => {
    if (reduceMotion || !active) {
      anims.forEach((anim) => anim.setValue(6));
      return;
    }

    const heights = [14, 26, 36, 22, 38, 20, 30, 12];
    const durations = [340, 420, 290, 380, 450, 310, 400, 330];

    const loops = anims.map((anim, idx) => {
      const maxHeight = heights[idx % heights.length] ?? 24;
      const dur = durations[idx % durations.length] ?? 350;

      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxHeight,
            duration: dur,
            easing: motion.easing.easeInOut,
            useNativeDriver: false, // height is a layout property
          }),
          Animated.timing(anim, {
            toValue: 6,
            duration: dur,
            easing: motion.easing.easeInOut,
            useNativeDriver: false,
          }),
        ]),
      );
    });

    loops.forEach((l) => l.start());

    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [active, anims, barCount, reduceMotion]);

  return (
    <View style={styles.container}>
      {anims.map((anim, idx) => (
        <Animated.View
          key={`bar-${idx}`}
          style={[
            styles.bar,
            {
              height: anim,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: 5,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
