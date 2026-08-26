import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock, ShieldAlert, Sparkles } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Product } from '../../types';
import { formatMinorUnits } from '../../utils/currency';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { ProductImage } from '../products/ProductImage';

export interface PurchaseConfirmationProps {
  product: Product;
  quantity?: number;
  amountMinor?: number;
  currency?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function PurchaseConfirmation({
  product,
  quantity = 1,
  amountMinor,
  currency = 'INR',
  onConfirm,
  onCancel,
  loading = false,
}: PurchaseConfirmationProps) {
  const totalMinor = amountMinor ?? product.price * quantity;
  const formattedTotal = formatMinorUnits(totalMinor, currency);
  const formattedUnitPrice = formatMinorUnits(product.price, product.currency);

  return (
    <Card variant="elevated" style={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Lock size={16} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Purchase Authorization</Text>
            <Text style={styles.headerSubtitle}>Human-in-the-Loop Required</Text>
          </View>
        </View>
        <Badge label="Test Mode" variant="testMode" size="sm" />
      </View>

      {/* Product Summary */}
      <View style={styles.productRow}>
        <ProductImage uri={product.imageUrl} size={64} style={styles.image} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.unitPrice}>
            {formattedUnitPrice} each · Qty: {quantity}
          </Text>
        </View>
      </View>

      {/* Safety Notice */}
      <View style={styles.noticeBox}>
        <ShieldAlert size={16} color={colors.warningText} style={styles.noticeIcon} />
        <Text style={styles.noticeText}>
          The AI cannot self-authorize payments. Your explicit consent is required to create this order.
        </Text>
      </View>

      {/* Financial Line Items */}
      <View style={styles.financials}>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</Text>
          <Text style={styles.finValue}>{formattedTotal}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Payment Gateway</Text>
          <Text style={styles.finValue}>Razorpay Test</Text>
        </View>
        <View style={[styles.finRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>{formattedTotal}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Confirm purchase"
          variant="primary"
          size="md"
          loading={loading}
          onPress={onConfirm}
          style={styles.confirmButton}
          leftIcon={<Lock size={16} color={colors.textInverse} />}
        />
        {onCancel ? (
          <Button
            title="Cancel"
            variant="secondary"
            size="md"
            disabled={loading}
            onPress={onCancel}
            style={styles.cancelButton}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md + 2,
    marginVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 14,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
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
    fontSize: 14,
    marginBottom: 2,
  },
  unitPrice: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningBg,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    marginBottom: spacing.md,
  },
  noticeIcon: {
    marginRight: spacing.xs + 2,
    marginTop: 2,
  },
  noticeText: {
    ...typography.caption,
    color: colors.warningText,
    flex: 1,
    lineHeight: 16,
  },
  financials: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  finLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  finValue: {
    ...typography.captionMedium,
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
  actions: {
    gap: spacing.xs + 2,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.surfaceSubtle,
  },
});
