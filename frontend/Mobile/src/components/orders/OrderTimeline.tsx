import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Clock, X } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { OrderStatus } from '../../types';

export interface OrderTimelineProps {
  status: OrderStatus;
  hasPaymentLink?: boolean;
}

export function OrderTimeline({ status, hasPaymentLink = false }: OrderTimelineProps) {
  // Determine states for 4 key milestones
  // 1: Order Created
  const step1 = true;
  // 2: Payment Link Issued
  const step2 = hasPaymentLink || ['PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED'].includes(status);
  // 3: Payment Initiated
  const step3 = ['PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED'].includes(status);
  // 4: Verified by Razorpay
  const step4Paid = status === 'PAID';
  const step4Failed = ['PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'CANCELLED'].includes(status);

  const renderStepIcon = (isCompleted: boolean, isCurrent: boolean, isFailed?: boolean) => {
    if (isFailed) {
      return (
        <View style={[styles.iconCircle, styles.iconCircleFailed]}>
          <X size={12} color={colors.textInverse} />
        </View>
      );
    }
    if (isCompleted) {
      return (
        <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
          <Check size={12} color={colors.textInverse} />
        </View>
      );
    }
    if (isCurrent) {
      return (
        <View style={[styles.iconCircle, styles.iconCircleActive]}>
          <Clock size={12} color={colors.accent} />
        </View>
      );
    }
    return <View style={[styles.iconCircle, styles.iconCirclePending]} />;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Timeline</Text>

      {/* Step 1 */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          {renderStepIcon(true, false)}
          <View style={[styles.connector, step2 ? styles.connectorActive : styles.connectorPending]} />
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Order Created</Text>
          <Text style={styles.stepDesc}>Server calculated amount and registered intent</Text>
        </View>
      </View>

      {/* Step 2 */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          {renderStepIcon(step2, !step2 && status === 'ORDER_CREATED')}
          <View style={[styles.connector, step3 ? styles.connectorActive : styles.connectorPending]} />
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Payment Link Generated</Text>
          <Text style={styles.stepDesc}>Razorpay provider object bound to exact total</Text>
        </View>
      </View>

      {/* Step 3 */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          {renderStepIcon(step3, status === 'PAYMENT_PENDING')}
          <View
            style={[
              styles.connector,
              step4Paid ? styles.connectorActive : styles.connectorPending,
            ]}
          />
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Payment Pending</Text>
          <Text style={styles.stepDesc}>Awaiting customer checkout completion</Text>
        </View>
      </View>

      {/* Step 4 */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          {renderStepIcon(step4Paid, false, step4Failed)}
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, step4Paid && styles.stepTitleSuccess, step4Failed && styles.stepTitleFailed]}>
            {step4Paid
              ? 'Payment Verified (PAID)'
              : step4Failed
              ? 'Payment Not Completed'
              : 'Razorpay Verification'}
          </Text>
          <Text style={styles.stepDesc}>
            {step4Paid
              ? 'Settled via verified Razorpay HMAC webhook signature'
              : step4Failed
              ? 'Payment attempt failed or was cancelled'
              : 'Truth belongs to Razorpay webhook / API verification'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeft: {
    alignItems: 'center',
    width: 28,
    marginRight: spacing.md,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccess: {
    backgroundColor: colors.success,
  },
  iconCircleFailed: {
    backgroundColor: colors.danger,
  },
  iconCircleActive: {
    backgroundColor: colors.accentLight,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  iconCirclePending: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  connector: {
    width: 2,
    height: 32,
    marginVertical: 2,
  },
  connectorActive: {
    backgroundColor: colors.success,
  },
  connectorPending: {
    backgroundColor: colors.border,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  stepTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  stepTitleSuccess: {
    color: colors.successText,
  },
  stepTitleFailed: {
    color: colors.dangerText,
  },
  stepDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
