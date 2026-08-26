import { Easing } from 'react-native';

export const motion = {
  // Durations (in milliseconds)
  duration: {
    instant: 80,
    fast: 160,
    normal: 240,
    medium: 380,
    slow: 550,
    verySlow: 700,
    breathing: 3200,
  },

  // Delays & Staggers
  stagger: {
    fast: 40,
    normal: 60,
    card: 80,
    relaxed: 120,
  },

  // Physics Configurations for Animated.spring
  spring: {
    gentle: {
      tension: 65,
      friction: 9,
      useNativeDriver: true,
    },
    snappy: {
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    },
    bouncy: {
      tension: 75,
      friction: 6,
      useNativeDriver: true,
    },
    subtle: {
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    },
  },

  // Easing functions
  easing: {
    easeOut: Easing.bezier(0.16, 1, 0.3, 1),
    easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
    easeIn: Easing.bezier(0.4, 0, 1, 1),
    linear: Easing.linear,
  },

  // Scale Tokens
  scale: {
    press: 0.96,
    cardPress: 0.98,
    buttonPress: 0.95,
    pulseMin: 1.0,
    pulseMax: 1.035,
    pop: 1.08,
  },

  // Translation Tokens
  translate: {
    small: 8,
    medium: 16,
    large: 24,
    sheet: 300,
  },

  // Opacity Tokens
  opacity: {
    dimOverlay: 0.35,
    subtle: 0.85,
    faint: 0.5,
  },
};
