import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Product } from '../../types';
import { formatMinorUnits } from '../../utils/currency';
import { Badge } from '../common/Badge';

interface ProductMessageProps {
  product: Product;
  onBuy?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export function ProductMessage({
  product,
  onBuy,
  onViewDetails,
}: ProductMessageProps) {
  const formattedPrice = formatMinorUnits(product.price, product.currency);
  const imageUrl = product.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800';

  return (
    <View style={styles.card}>
      {/* Top Image Container with AI Pick badge */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.aiPickBadge}>
          <Sparkles size={11} color={colors.accentPurple} style={styles.aiPickIcon} />
          <Text style={styles.aiPickText}>AI Pick</Text>
        </View>
      </View>

      {/* Card Details */}
      <View style={styles.content}>
        <View style={styles.titlePriceRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {product.category || 'Premium cotton'} · Black
        </Text>

        {/* Tags */}
        <View style={styles.tagsRow}>
          <Badge label="In stock" variant="success" size="sm" showDot={true} />
          <Badge label='"In your budget"' variant="outline" size="sm" />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => onBuy?.(product)}
            activeOpacity={0.85}
          >
            <Text style={styles.buyButtonText}>Buy this</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => onViewDetails?.(product)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsButtonText}>View details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  imageContainer: {
    width: '100%',
    height: 190,
    backgroundColor: colors.surfaceSubtle,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  aiPickBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(228, 228, 231, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  aiPickIcon: {
    marginRight: 4,
  },
  aiPickText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  price: {
    ...typography.h3,
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buyButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    fontSize: 14,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
