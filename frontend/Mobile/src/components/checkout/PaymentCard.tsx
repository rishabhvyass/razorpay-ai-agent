import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { ExternalLink, Lock, ShieldCheck } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Order, PaymentView, Product } from '../../types';
import { formatMinorUnits } from '../../utils/currency';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

export interface PaymentCardProps {
  order: Order;
  product?: Product | null;
  paymentView?: PaymentView | null;
  onInitiatePayment?: () => void;
  loading?: boolean;
}

export function PaymentCard({
  order,
  product,
  paymentView,
  onInitiatePayment,
  loading = false,
}: PaymentCardProps) {
  const formattedAmount = order.amountFormatted || formatMinorUnits(order.amount, order.currency);
  const paymentUrl = paymentView?.paymentUrl;

  const handleOpenPaymentUrl = async () => {
    if (paymentUrl) {
      const supported = await Linking.canOpenURL(paymentUrl);
      if (supported) {
        await Linking.openURL(paymentUrl);
      }
    }
  };

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Complete Payment</Text>
          <Text style={styles.subtitle}>Razorpay Secure Gateway</Text>
        </View>
        <Badge label="Test Mode" variant="testMode" size="sm" />
      </View>

      <View style={styles.detailsBox}>
        <View style={styles.row}>
          <Text style={styles.label}>Product</Text>
          <Text style={styles.value} numberOfLines={1}>
            {product?.name ?? `Order ${order.id.slice(0, 8)}`}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Quantity</Text>
          <Text style={styles.value}>{order.quantity}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Amount Due</Text>
          <Text style={styles.totalValue}>{formattedAmount}</Text>
        </View>
      </View>

      <View style={styles.securityBox}>
        <ShieldCheck size={16} color={colors.accent} style={styles.securityIcon} />
        <Text style={styles.securityText}>
          Payment confirmation is verified by Razorpay. The order status updates automatically upon HMAC verification.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {paymentUrl ? (
          <Button
            title={`Pay ${formattedAmount} via Razorpay`}
            variant="primary"
            size="lg"
            onPress={handleOpenPaymentUrl}
            rightIcon={<ExternalLink size={16} color={colors.textInverse} />}
          />
        ) : (
          <Button
            title={`Pay ${formattedAmount}`}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={onInitiatePayment}
            leftIcon={<Lock size={16} color={colors.textInverse} />}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accentLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  detailsBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
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
    fontSize: 18,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accentLight,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  securityIcon: {
    marginRight: spacing.xs + 2,
    marginTop: 2,
  },
  securityText: {
    ...typography.caption,
    color: colors.accentDark,
    flex: 1,
    lineHeight: 16,
  },
  buttonContainer: {
    marginTop: spacing.xs,
  },
});
