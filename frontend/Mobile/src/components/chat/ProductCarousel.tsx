import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { FadeInImage } from '../motion/FadeInImage';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';
import { Product } from '../../types';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';
import { formatMinorUnits } from '../../utils/currency';

interface ProductCarouselProps {
  products: Product[];
  onBuy?: (product: Product) => void;
  onView?: (product: Product) => void;
}

interface ProductCardProps {
  product: Product;
  index: number;
  onBuy?: (product: Product) => void;
  onView?: (product: Product) => void;
}

function AnimatedProductCard({ product, index, onBuy, onView }: ProductCardProps) {
  const reduceMotion = useReduceMotion();
  const themeColors = useThemeColors();
  const formattedPrice = formatMinorUnits(product.price, product.currency);
  const imageUrl =
    product.imageUrl ||
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800';

  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 20)).current;
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.97)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const delays = [0, 70, 140];
    const delay = delays[index] !== undefined ? delays[index] : index * 70;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.standard,
        delay,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        ...motion.spring.gentle,
        delay,
      }),
      Animated.spring(scale, {
        toValue: 1,
        ...motion.spring.gentle,
        delay,
      }),
    ]).start();
  }, [index, opacity, reduceMotion, scale, translateY]);

  const inStock = product.inStock !== false && (product.stock === undefined || product.stock > 0);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <AnimatedPressable
        style={[
          styles.card,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
        ]}
        pressScale={0.985}
        onPress={() => onView?.(product)}
        accessibilityLabel={`View ${product.name}`}
      >
        {/* Dominating Product Image with Smooth Load Fade */}
        <View style={[styles.imageContainer, { backgroundColor: themeColors.surfaceSubtle }]}>
          <FadeInImage
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {product.category || 'Curated'}
            </Text>
          </View>
        </View>

        {/* Product Details Hierarchy */}
        <View style={styles.detailsContainer}>
          <Text style={[styles.productName, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {product.name}
          </Text>

          {/* Price & Stock */}
          <View style={styles.priceStockRow}>
            <Text style={[styles.priceText, { color: themeColors.textPrimary }]}>{formattedPrice}</Text>
            <View style={styles.stockBadge}>
              <View
                style={[
                  styles.stockDot,
                  { backgroundColor: inStock ? colors.success : colors.textMuted },
                ]}
              />
              <Text style={[styles.stockText, { color: themeColors.textSecondary }]}>{inStock ? 'In stock' : 'Unavailable'}</Text>
            </View>
          </View>

          {/* Actions: [View] [Buy] */}
          <View style={styles.actionRow}>
            <AnimatedPressable
              style={[
                styles.viewButton,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                },
              ]}
              pressScale={0.96}
              onPress={() => onView?.(product)}
              accessibilityLabel="View details"
            >
              <Text style={[styles.viewButtonText, { color: themeColors.textPrimary }]}>View</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[
                styles.buyButton,
                { backgroundColor: themeColors.primary },
                !inStock && styles.buyButtonDisabled,
              ]}
              pressScale={0.96}
              disabled={!inStock}
              onPress={() => onBuy?.(product)}
              accessibilityLabel="Buy now"
            >
              <Text style={styles.buyButtonText}>Buy</Text>
            </AnimatedPressable>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function ProductCarousel({ products, onBuy, onView }: ProductCarouselProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      decelerationRate="fast"
      snapToInterval={226}
      snapToAlignment="start"
    >
      {products.map((product, index) => (
        <AnimatedProductCard
          key={product.id || index}
          product={product}
          index={index}
          onBuy={onBuy}
          onView={onView}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  cardWrapper: {
    width: 214,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  imageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: colors.surfaceSubtle,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.small,
  },
  categoryBadgeText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  detailsContainer: {
    padding: spacing.md,
  },
  productName: {
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  priceStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  priceText: {
    ...typography.priceSmall,
    color: colors.textPrimary,
    fontSize: 16,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  viewButton: {
    flex: 1,
    height: 34,
    borderRadius: radius.small,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    ...typography.buttonSm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  buyButton: {
    flex: 1,
    height: 34,
    borderRadius: radius.small,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonDisabled: {
    opacity: 0.4,
  },
  buyButtonText: {
    ...typography.buttonSm,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
