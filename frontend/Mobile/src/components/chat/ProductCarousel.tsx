import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Badge } from '../common/Badge';
import { ScalePressable } from '../motion/ScalePressable';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { Product } from '../../types';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';
import { formatMinorUnits } from '../../utils/currency';

interface ProductCarouselProps {
  products: Product[];
  onBuy?: (product: Product) => void;
  onView?: (product: Product) => void;
}

interface AnimatedProductCardProps {
  product: Product;
  index: number;
  onBuy?: (product: Product) => void;
  onView?: (product: Product) => void;
}

function AnimatedProductCard({ product, index, onBuy, onView }: AnimatedProductCardProps) {
  const reduceMotion = useReduceMotion();
  const formattedPrice = formatMinorUnits(product.price, product.currency);
  const imageUrl =
    product.imageUrl ||
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800';

  // Card entrance animation
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 20)).current;
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.97)).current;

  // Soft image reveal animation
  const imageOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const imageScale = useRef(new Animated.Value(reduceMotion ? 1 : 1.03)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const delay = Math.min(index * motion.stagger.card, 200);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.medium,
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
        ...motion.spring.snappy,
        delay,
      }),
    ]).start();
  }, [index, opacity, reduceMotion, scale, translateY]);

  const handleImageLoad = () => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: motion.duration.normal,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(imageScale, {
        toValue: 1,
        duration: motion.duration.normal,
        easing: motion.easing.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
      <ScalePressable
        pressedScale={motion.scale.cardPress}
        onPress={() => onView?.(product)}
        style={styles.card}
      >
        <View style={styles.imageContainer}>
          <Animated.Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              {
                opacity: imageOpacity,
                transform: [{ scale: imageScale }],
              },
            ]}
            resizeMode="cover"
            onLoad={handleImageLoad}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {product.category || 'Premium cotton'} · In Stock
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formattedPrice}</Text>
            <Badge label="In stock" variant="success" size="sm" showDot={true} />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => onView?.(product)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => onBuy?.(product)}
              activeOpacity={0.85}
            >
              <Text style={styles.buyButtonText}>Buy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScalePressable>
    </Animated.View>
  );
}

export function ProductCarousel({ products, onBuy, onView }: ProductCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!products || products.length === 0) return null;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / 250);
    if (slide !== activeIndex && slide >= 0 && slide < products.length) {
      setActiveIndex(slide);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={266} // card width + gap
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((product, index) => (
          <AnimatedProductCard
            key={product.id}
            product={product}
            index={index}
            onBuy={onBuy}
            onView={onView}
          />
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      {products.length > 1 && (
        <View style={styles.paginationRow}>
          {products.map((_, idx) => (
            <View
              key={`dot-${idx}`}
              style={[
                styles.dot,
                idx === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingRight: spacing.lg,
    paddingVertical: 4,
    gap: 12,
  },
  cardWrapper: {
    width: 254,
  },
  card: {
    width: 254,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 155,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: 2,
  },
  price: {
    ...typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewButtonText: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  buyButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buyButtonText: {
    ...typography.captionBold,
    fontSize: 13,
    color: colors.textInverse,
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 5,
    backgroundColor: colors.border,
  },
});
