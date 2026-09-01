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
  const isPaid = status === 'PAID';
  const isFailed = ['PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'CANCELLED'].includes(status);
  const isPending = ['PAYMENT_PENDING', 'ORDER_CREATED', 'PENDING_CONFIRMATION'].includes(status);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timeline</Text>

      {/* 1. Order created */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
            <Check size={11} color={colors.textInverse} strokeWidth={3} />
          </View>
          <View style={[styles.connector, styles.connectorActive]} />
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Order created</Text>
          <Text style={styles.stepDesc}>Server validated pricing and created draft</Text>
        </View>
      </View>

      {/* 2. Payment initiated */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
            <Check size={11} color={colors.textInverse} strokeWidth={3} />
          </View>
          <View
            style={[
              styles.connector,
              isPaid || isFailed ? styles.connectorActive : styles.connectorPending,
            ]}
          />
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Payment initiated</Text>
          <Text style={styles.stepDesc}>Checkout session active on Razorpay sandbox</Text>
        </View>
      </View>

      {/* 3. Payment verified */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          {isPaid ? (
            <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
              <Check size={11} color={colors.textInverse} strokeWidth={3} />
            </View>
          ) : isFailed ? (
            <View style={[styles.iconCircle, styles.iconCircleFailed]}>
              <X size={11} color={colors.textInverse} strokeWidth={3} />
            </View>
          ) : (
            <View style={[styles.iconCircle, styles.iconCircleActive]}>
              <Clock size={11} color={colors.warning} />
            </View>
          )}
          <View style={[styles.connector, isPaid ? styles.connectorActive : styles.connectorPending]} />
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, isPaid && styles.stepTitleSuccess, isFailed && styles.stepTitleFailed]}>
            {isPaid ? 'Payment verified' : isFailed ? 'Payment not verified' : 'Payment pending'}
          </Text>
          <Text style={styles.stepDesc}>
            {isPaid
              ? 'Settled via verified Razorpay HMAC webhook signature'
              : isFailed
              ? 'No payment confirmation was recorded by Razorpay'
              : 'Waiting for webhook signature from backend'}
          </Text>
        </View>
      </View>

      {/* 4. Order confirmed */}
      <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
          {isPaid ? (
            <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
              <Check size={11} color={colors.textInverse} strokeWidth={3} />
            </View>
          ) : (
            <View style={[styles.iconCircle, styles.iconCirclePending]} />
          )}
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, isPaid && styles.stepTitleSuccess, !isPaid && styles.stepTitlePending]}>
            Order confirmed
          </Text>
          <Text style={styles.stepDesc}>
            {isPaid ? 'Order successfully placed and verified' : 'Pending payment settlement'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeft: {
    alignItems: 'center',
    width: 28,
    marginRight: spacing.sm,
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
  iconCircleActive: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  iconCircleFailed: {
    backgroundColor: colors.danger,
  },
  iconCirclePending: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connector: {
    width: 2,
    height: 24,
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
    paddingBottom: spacing.sm + 4,
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
  stepTitlePending: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  stepDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
});
