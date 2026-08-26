import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { Card } from '../../components/common/Card';
import { PaymentVerificationAnimation } from '../../components/motion/PaymentVerificationAnimation';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { formatMinorUnits } from '../../utils/currency';

type PaymentPendingRouteProp = RouteProp<RootStackParamList, 'PaymentPending'>;

export function PaymentPendingScreen() {
  const route = useRoute<PaymentPendingRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId, product } = route.params;

  const { order, paymentView, refreshPayment } = useOrder(orderId);
  const [, setPollCount] = useState(0);

  const goToSuccess = (paymentId?: string | null) => {
    navigation.replace('PaymentSuccess', {
      orderId: order?.id || orderId,
      product,
      paymentId: paymentId || order?.razorpayPaymentId || 'pay_QvR9mZ1x',
    });
  };

  // Auto-transition when backend confirms status
  useEffect(() => {
    if (order) {
      if (order.status === 'PAID') {
        goToSuccess(order.razorpayPaymentId);
      } else if (
        order.status === 'PAYMENT_FAILED' ||
        order.status === 'PAYMENT_EXPIRED' ||
        order.status === 'CANCELLED'
      ) {
        navigation.replace('PaymentFailed', {
          orderId: order.id,
          product,
          reason: paymentView?.failureReason,
        });
      }
    }
  }, [order, navigation, product, paymentView]);

  // Test mode auto-advancement: in test mode simulation, complete after 3.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      goToSuccess();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  // Periodic active refresh polling every 4 seconds up to 25 attempts
  useEffect(() => {
    if (
      order?.status === 'PAID' ||
      order?.status === 'PAYMENT_FAILED' ||
      order?.status === 'CANCELLED'
    ) {
      return;
    }

    const interval = setInterval(() => {
      setPollCount((prev) => {
        if (prev >= 25) {
          clearInterval(interval);
          return prev;
        }
        refreshPayment?.(orderId);
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [order?.status, refreshPayment]);

  const formattedAmount = order
    ? order.amountFormatted || formatMinorUnits(order.amount, order.currency)
    : product
    ? formatMinorUnits(product.price, product.currency)
    : '₹1,499';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Hero Animation */}
        <PaymentVerificationAnimation
          amountFormatted={formattedAmount}
          testMode={true}
        />

        {/* Verification Steps Timeline Card */}
        <SlideUpView distance={14} delay={100} duration={motion.duration.normal}>
          <Card variant="outlined" style={styles.stepsCard}>
            <Text style={styles.cardTitle}>Payment Verification Timeline</Text>

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, styles.stepCompleted]}>
                <Check size={12} color={colors.textInverse} strokeWidth={3} />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>Order created</Text>
                <Text style={styles.stepDesc}>Inventory reserved & authorization signed</Text>
              </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, styles.stepCompleted]}>
                <Check size={12} color={colors.textInverse} strokeWidth={3} />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>Payment initiated</Text>
                <Text style={styles.stepDesc}>Razorpay checkout session active</Text>
              </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, styles.stepActive]}>
                <View style={styles.pulseInnerDot} />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={[styles.stepTitle, styles.stepTitleActive]}>
                  Verifying webhook signature
                </Text>
                <Text style={styles.stepDesc}>Awaiting Razorpay cryptographic confirmation</Text>
              </View>
            </View>

            <View style={styles.stepConnectorInactive} />

            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, styles.stepPending]}>
                <View style={styles.pendingDot} />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={[styles.stepTitle, styles.stepTitlePending]}>Order confirmed</Text>
                <Text style={styles.stepDesc}>Dispatch & receipt generated</Text>
              </View>
            </View>
          </Card>
        </SlideUpView>

        {/* Test Mode Tap to Complete Helper */}
        <SlideUpView distance={16} delay={150} duration={motion.duration.normal}>
          <TouchableOpacity
            style={styles.instantAdvanceButton}
            onPress={() => goToSuccess()}
            activeOpacity={0.8}
          >
            <Text style={styles.instantAdvanceText}>⚡ Advance to Success (Test Mode)</Text>
          </TouchableOpacity>
        </SlideUpView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  stepsCard: {
    width: '100%',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepCompleted: {
    backgroundColor: colors.success,
  },
  stepActive: {
    backgroundColor: colors.primarySubtle,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pulseInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  stepPending: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  stepTextContainer: {
    flex: 1,
    paddingBottom: 4,
  },
  stepTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  stepTitleActive: {
    color: colors.primary,
  },
  stepTitlePending: {
    color: colors.textMuted,
  },
  stepDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
    fontSize: 12,
  },
  stepConnector: {
    width: 2,
    height: 18,
    backgroundColor: colors.success,
    marginLeft: 11,
    marginVertical: 2,
  },
  stepConnectorInactive: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginLeft: 11,
    marginVertical: 2,
  },
  instantAdvanceButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  instantAdvanceText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
});
