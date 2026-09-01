import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageProps,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

export interface FadeInImageProps extends Omit<ImageProps, 'style'> {
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ImageStyle>;
}

export function FadeInImage({
  source,
  style,
  containerStyle,
  onLoadEnd,
  ...rest
}: FadeInImageProps) {
  const reduceMotion = useReduceMotion();
  const [loaded, setLoaded] = useState(false);

  const opacityAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(reduceMotion ? 1 : 1.02)).current;

  const handleLoad = () => {
    setLoaded(true);
    if (!reduceMotion) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.Image
        source={source}
        style={[
          style,
          {
            opacity: reduceMotion ? 1 : opacityAnim,
            transform: [{ scale: reduceMotion ? 1 : scaleAnim }],
          },
        ]}
        onLoad={handleLoad}
        onLoadEnd={onLoadEnd}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
  },
});
