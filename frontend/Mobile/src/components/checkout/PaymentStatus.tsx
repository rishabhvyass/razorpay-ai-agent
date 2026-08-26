import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { OrderStatus } from '../../types';

export interface PaymentStatusProps {
  status: OrderStatus;
  message?: string;
}

export function PaymentStatus({ status, message }: PaymentStatusProps) {
  const renderIcon = () => {
    switch (status) {
      case 'PAID':
        return <CheckCircle2 size={48} color={colors.success} />;
      case 'PAYMENT_FAILED':
      case 'PAYMENT_EXPIRED':
      case 'CANCELLED':
        return <XCircle size={48} color={colors.danger} />;
      case 'PAYMENT_PENDING':
      case 'ORDER_CREATED':
      default:
        return <ActivityIndicator size="large" color={colors.accent} />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'PAID':
        return 'Payment Confirmed';
      case 'PAYMENT_FAILED':
        return "Payment Wasn't Completed";
      case 'PAYMENT_EXPIRED':
        return 'Payment Link Expired';
      case 'CANCELLED':
        return 'Order Cancelled';
      case 'PAYMENT_PENDING':
        return 'Payment Pending';
      case 'ORDER_CREATED':
        return 'Order Created';
      default:
        return 'Processing Payment';
    }
  };

  const getSubtitle = () => {
    if (message) return message;
    switch (status) {
      case 'PAID':
        return 'Your payment has been verified by Razorpay and your order is confirmed.';
      case 'PAYMENT_FAILED':
        return 'No successful payment was verified by Razorpay. You can safely retry.';
      case 'PAYMENT_EXPIRED':
        return 'The payment session expired. Please create a new purchase.';
      case 'CANCELLED':
        return 'This purchase was cancelled.';
      case 'PAYMENT_PENDING':
        return 'Complete the payment at Razorpay. We will verify it automatically.';
      default:
        return 'Waiting for server reconciliation...';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>{renderIcon()}</View>
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>{getSubtitle()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconWrapper: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
});
