import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Badge } from '../common/Badge';
import { ScalePressable } from '../motion/ScalePressable';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { Order } from '../../types';
import { formatMinorUnits } from '../../utils/currency';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const formattedAmount = order.amountFormatted || formatMinorUnits(order.amount, order.currency);
  const imageUrl =
    order.product?.imageUrl ||
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400';

  const orderNum = order.id.replace('order_', '').slice(0, 6).toUpperCase();

  const formatOrderDate = (isoString?: string) => {
    if (!isoString) return 'Today';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusInfo = () => {
    const dateText = formatOrderDate(order.createdAt);

    switch (order.status) {
      case 'PAID':
        return { label: 'PAID', variant: 'success' as const, dateText };
      case 'PENDING_CONFIRMATION':
      case 'ORDER_CREATED':
      case 'PAYMENT_PENDING':
        return { label: 'PENDING', variant: 'warning' as const, dateText };
      case 'PAYMENT_FAILED':
        return { label: 'FAILED', variant: 'danger' as const, dateText };
      case 'CANCELLED':
      case 'PAYMENT_EXPIRED':
      default:
        return { label: 'CANCELLED', variant: 'neutral' as const, dateText };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <ScalePressable
      pressedScale={motion.scale.cardPress}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.contentRow}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />

        <View style={styles.infoContainer}>
          <View style={styles.topRow}>
            <Text style={styles.orderNumber}>Order #{orderNum}</Text>
            <Badge label={statusInfo.label} variant={statusInfo.variant} size="sm" showDot={true} />
          </View>

          <Text style={styles.productName} numberOfLines={1}>
            {order.product?.name || 'Classic Oversized Hoodie'}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.dateText}>{statusInfo.dateText}</Text>
            <Text style={styles.amountText}>{formattedAmount}</Text>
          </View>
        </View>

        <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm + 2,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  orderNumber: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  productName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  amountText: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 14,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
