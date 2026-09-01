import { Easing } from 'react-native';

export const motion = {
  // Centralized Durations (in milliseconds)
  duration: {
    instant: 80,
    micro: 140, // 120–180ms
    fast: 180,
    standard: 240, // 200–300ms
    normal: 250,
    important: 380, // 350–500ms
    medium: 400,
    success: 600, // 500–700ms
    slow: 650,
    breathing: 3000,
  },

  // Staggers
  stagger: {
    fast: 40,
    normal: 70, // Stagger cards: 0ms, 70ms, 140ms
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
      tension: 110,
      friction: 8,
      useNativeDriver: true,
    },
    sheet: {
      tension: 70,
      friction: 10,
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

  // Scale Tokens (Emil Kowalski tactile feedback)
  scale: {
    press: 0.97,
    cardPress: 0.98,
    buttonPress: 0.97,
    pop: 1.05,
    pulseMin: 1.0,
    pulseMax: 1.04,
  },

  // Translation Tokens
  translate: {
    small: 8,
    medium: 16,
    large: 20,
    sheet: 400,
  },

  // Opacity Tokens
  opacity: {
    dimOverlay: 0.35,
    subtle: 0.85,
    faint: 0.5,
  },
};
