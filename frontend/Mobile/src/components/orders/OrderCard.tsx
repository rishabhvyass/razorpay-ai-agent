import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Badge } from '../common/Badge';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { FadeInImage } from '../motion/FadeInImage';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { Order } from '../../types';
import { formatMinorUnits } from '../../utils/currency';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const themeColors = useThemeColors();
  const formattedAmount = order.amountFormatted || formatMinorUnits(order.amount, order.currency);
  const imageUrl =
    order.product?.imageUrl ||
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400';

  const orderNum = order.id.slice(0, 8);

  const formatOrderDate = (isoString?: string) => {
    if (!isoString) return 'Today';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusInfo = () => {
    switch (order.status) {
      case 'PAID':
        return { label: 'PAID', variant: 'success' as const };
      case 'PENDING_CONFIRMATION':
      case 'ORDER_CREATED':
      case 'PAYMENT_PENDING':
        return { label: 'PENDING', variant: 'warning' as const };
      case 'PAYMENT_FAILED':
        return { label: 'FAILED', variant: 'danger' as const };
      case 'CANCELLED':
      case 'PAYMENT_EXPIRED':
      default:
        return { label: 'CANCELLED', variant: 'neutral' as const };
    }
  };

  const statusInfo = getStatusInfo();
  const dateStr = formatOrderDate(order.createdAt);

  return (
    <AnimatedPressable
      style={[
        styles.card,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        },
      ]}
      pressScale={0.985}
      onPress={onPress}
      accessibilityLabel={`Order ${orderNum}`}
    >
      <FadeInImage
        source={{ uri: imageUrl }}
        style={styles.thumbnail}
        containerStyle={[styles.thumbnailContainer, { backgroundColor: themeColors.surfaceSubtle }]}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.orderIdText, { color: themeColors.textSecondary }]}>Order #{orderNum}</Text>
          <Text style={[styles.dateText, { color: themeColors.textMuted }]}>{dateStr}</Text>
        </View>

        <Text style={[styles.productName, { color: themeColors.textPrimary }]} numberOfLines={1}>
          {order.product?.name || 'Curated Order Item'}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={[styles.amountText, { color: themeColors.textPrimary }]}>{formattedAmount}</Text>
          <Badge label={statusInfo.label} variant={statusInfo.variant} size="sm" showDot />
        </View>
      </View>

      <ChevronRight size={18} color={themeColors.textMuted} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    marginBottom: spacing.sm + 2,
    ...shadows.subtle,
  },
  thumbnailContainer: {
    width: 54,
    height: 54,
    borderRadius: radius.inputs,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: radius.inputs,
    backgroundColor: colors.surfaceSubtle,
  },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  orderIdText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  productName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  amountText: {
    ...typography.priceSmall,
    color: colors.textPrimary,
    fontSize: 14,
  },
});
