import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Product } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { PriceDisplay } from './PriceDisplay';
import { ProductImage } from './ProductImage';

export interface ProductCardProps {
  product: Product;
  onPressDetails?: () => void;
  onPressBuy?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

export function ProductCard({
  product,
  onPressDetails,
  onPressBuy,
  style,
  compact = false,
}: ProductCardProps) {
  return (
    <Card variant="default" style={[styles.card, style]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressDetails}
        style={styles.topRow}
      >
        <ProductImage
          uri={product.imageUrl}
          size={compact ? 64 : 88}
          style={styles.image}
        />
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            {product.category ? (
              <Text style={styles.categoryText}>{product.category.toUpperCase()}</Text>
            ) : null}
            <Badge
              label={product.inStock ? 'In stock' : 'Out of stock'}
              variant={product.inStock ? 'success' : 'danger'}
              size="sm"
            />
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {product.name}
          </Text>

          {product.description ? (
            <Text style={styles.description} numberOfLines={compact ? 1 : 2}>
              {product.description}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <PriceDisplay amountMinor={product.price} currency={product.currency} size="md" />
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        {onPressDetails ? (
          <Button
            title="View details"
            variant="secondary"
            size="sm"
            onPress={onPressDetails}
            style={styles.detailButton}
          />
        ) : null}
        {onPressBuy ? (
          <Button
            title="Buy"
            variant="primary"
            size="sm"
            disabled={!product.inStock}
            onPress={onPressBuy}
            style={styles.buyButton}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
  },
  image: {
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryText: {
    ...typography.captionBold,
    color: colors.accent,
    fontSize: 10,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 2,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  detailButton: {
    flex: 1,
  },
  buyButton: {
    flex: 1,
  },
});
