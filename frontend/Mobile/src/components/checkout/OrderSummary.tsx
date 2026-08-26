import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Order, Product } from '../../types';
import { formatMinorUnits } from '../../utils/currency';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { ProductImage } from '../products/ProductImage';

export interface OrderSummaryProps {
  order: Order;
  product?: Product | null;
}

export function OrderSummary({ order, product }: OrderSummaryProps) {
  const formattedTotal = order.amountFormatted || formatMinorUnits(order.amount, order.currency);

  return (
    <Card variant="outlined" style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Order Summary</Text>
        <Badge label="Server Verified" variant="info" size="sm" />
      </View>

      <View style={styles.productRow}>
        <ProductImage uri={product?.imageUrl} size={54} style={styles.image} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product?.name ?? `Order ${order.id.slice(0, 8)}`}
          </Text>
          <Text style={styles.quantityText}>Quantity: {order.quantity}</Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Order ID</Text>
          <Text style={styles.lineValueMono}>{order.id.slice(0, 13)}...</Text>
        </View>
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Status</Text>
          <Badge label={order.status.replace(/_/g, ' ')} status={order.status} size="sm" />
        </View>
        <View style={[styles.lineRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formattedTotal}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 15,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  image: {
    marginRight: spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  quantityText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  breakdown: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  lineLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  lineValueMono: {
    ...typography.mono,
    fontSize: 11,
    color: colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs + 2,
    marginTop: spacing.xs,
    marginBottom: 0,
  },
  totalLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.bodyBold,
    color: colors.accent,
    fontSize: 16,
  },
});
