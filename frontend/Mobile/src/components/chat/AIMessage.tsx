import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CircleHelp } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { ChatMessage, Product } from '../../types';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';
import { ProductCarousel } from './ProductCarousel';

interface AIMessageProps {
  message: ChatMessage;
  onBuyProduct?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export function AIMessage({ message, onBuyProduct, onViewDetails }: AIMessageProps) {
  const reduceMotion = useReduceMotion();
  const products = message.products || (message.product ? [message.product] : []);

  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 10)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.normal,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        ...motion.spring.gentle,
      }),
    ]).start();
  }, [opacity, reduceMotion, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.messageRow}>
        <View style={styles.avatar}>
          <CircleHelp size={14} color={colors.textInverse} strokeWidth={2.5} />
        </View>
        <View style={styles.bubbleContent}>
          {message.content ? (
            <Text style={styles.textContent}>{message.content}</Text>
          ) : null}

          {products.length > 0 && (
            <ProductCarousel
              products={products}
              onBuy={onBuyProduct}
              onView={onViewDetails}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs + 2,
    width: '100%',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  bubbleContent: {
    flex: 1,
  },
  textContent: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
});
