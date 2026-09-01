import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, radius, spacing, typography, useThemeColors } from '../../theme';
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
  const themeColors = useThemeColors();
  const products = message.products || (message.product ? [message.product] : []);

  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 10)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
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
        <View style={[styles.avatar, { backgroundColor: themeColors.primarySubtle }]}>
          <Sparkles size={13} color={themeColors.primary} />
        </View>

        <View style={styles.contentContainer}>
          {message.content ? (
            <View
              style={[
                styles.textWrapper,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <Text style={[styles.textContent, { color: themeColors.textPrimary }]}>
                {message.content}
              </Text>
            </View>
          ) : null}

          {products.length > 0 && (
            <View style={styles.carouselWrapper}>
              <ProductCarousel
                products={products}
                onBuy={onBuyProduct}
                onView={onViewDetails}
              />
            </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  textWrapper: {
    borderRadius: radius.inputs,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  textContent: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  carouselWrapper: {
    marginTop: spacing.sm,
  },
});
