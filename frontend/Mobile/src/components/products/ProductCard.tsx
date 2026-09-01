import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { FadeInImage } from '../motion/FadeInImage';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { Product } from '../../types';
import { formatMinorUnits } from '../../utils/currency';

export interface ProductCardProps {
  product: Product;
  onPressDetails?: () => void;
  onPressBuy?: () => void;
  style?: ViewStyle;
}

export function ProductCard({
  product,
  onPressDetails,
  onPressBuy,
  style,
}: ProductCardProps) {
  const themeColors = useThemeColors();
  const formattedPrice = formatMinorUnits(product.price, product.currency);
  const inStock = product.inStock !== false && (product.stock === undefined || product.stock > 0);
  const imageUrl = product.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800';

  return (
    <AnimatedPressable
      style={[
        styles.card,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        },
        style,
      ]}
      pressScale={0.985}
      onPress={onPressDetails}
      accessibilityLabel={`View ${product.name}`}
    >
      {/* Image Preview with Smooth Fade */}
      <View style={[styles.imageContainer, { backgroundColor: themeColors.surfaceSubtle }]}>
        <FadeInImage
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.categoryText, { color: themeColors.primary }]} numberOfLines={1}>
            {product.category || 'Curated'}
          </Text>
          <View style={styles.stockBadge}>
            <View style={[styles.stockDot, { backgroundColor: inStock ? colors.success : colors.textMuted }]} />
            <Text style={[styles.stockText, { color: themeColors.textSecondary }]}>{inStock ? 'In stock' : 'Out of stock'}</Text>
          </View>
        </View>

        <Text style={[styles.productName, { color: themeColors.textPrimary }]} numberOfLines={1}>
          {product.name}
        </Text>

        {product.description ? (
          <Text style={[styles.description, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}

        {/* Price & Action Row */}
        <View style={styles.bottomRow}>
          <Text style={[styles.priceText, { color: themeColors.textPrimary }]}>{formattedPrice}</Text>

          <View style={styles.actions}>
            <AnimatedPressable
              style={[
                styles.viewButton,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                },
              ]}
              pressScale={0.96}
              onPress={onPressDetails}
              accessibilityLabel="View product details"
            >
              <Text style={[styles.viewButtonText, { color: themeColors.textPrimary }]}>View</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[
                styles.buyButton,
                { backgroundColor: themeColors.primary },
                !inStock && styles.disabledButton,
              ]}
              pressScale={0.96}
              disabled={!inStock}
              onPress={onPressBuy}
              accessibilityLabel="Buy item"
            >
              <Text style={styles.buyButtonText}>Buy</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.cards,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  imageContainer: {
    width: '100%',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: spacing.cardPadding,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryText: {
    ...typography.captionBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  stockText: {
    ...typography.captionMedium,
    fontSize: 11,
  },
  productName: {
    ...typography.section,
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  priceText: {
    ...typography.price,
    fontSize: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewButton: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    ...typography.captionBold,
    fontSize: 12,
  },
  buyButton: {
    paddingHorizontal: 18,
    height: 36,
    borderRadius: radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
