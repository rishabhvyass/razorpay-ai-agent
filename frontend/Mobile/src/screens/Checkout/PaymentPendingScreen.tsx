import React, { useEffect, useState } from 'react';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Check, Shield } from 'lucide-react-native';
import { Button } from '../../components/common/Button';
import { PaymentVerificationAnimation } from '../../components/motion/PaymentVerificationAnimation';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';

type PaymentPendingRouteProp = RouteProp<RootStackParamList, 'PaymentPending'>;

export function PaymentPendingScreen() {
  const route = useRoute<PaymentPendingRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId, product } = route.params;

  const { order, paymentView, refreshPayment } = useOrder(orderId);
  const [isVerifying, setVerifying] = useState(false);
  const themeColors = useThemeColors();

  const hasNavigatedRef = React.useRef(false);

  const goToSuccess = (paymentId?: string | null) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigation.replace('PaymentSuccess', {
      orderId: order?.id || orderId,
      product,
      paymentId: paymentId || order?.razorpayPaymentId || 'pay_QvR9mZ1x',
    });
  };

  const goToFailed = () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigation.replace('PaymentFailed', {
      orderId: order?.id || orderId,
      product,
    });
  };

  // Payment Truth: Only backend verified state triggers navigation
  useEffect(() => {
    if (order) {
      if (order.status === 'PAID') {
        goToSuccess(order.razorpayPaymentId);
      } else if (
        order.status === 'PAYMENT_FAILED' ||
        order.status === 'PAYMENT_EXPIRED' ||
        order.status === 'CANCELLED'
      ) {
        goToFailed();
      }
    }
  }, [order, product]);

  const handleManualVerify = async () => {
    setVerifying(true);
    try {
      if (orderId) {
        await refreshPayment(orderId);
      }
    } catch {
      // Backend error or not yet verified
    } finally {
      setVerifying(false);
    }
  };

  const formattedAmount = order
    ? order.amountFormatted || formatMinorUnits(order.amount, order.currency)
    : product
    ? formatMinorUnits(product.price, product.currency)
    : '₹1,499';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Animation & Headline */}
        <View style={styles.heroSection}>
          <PaymentVerificationAnimation amountFormatted={formattedAmount} testMode={true} />
        </View>

        {/* 4-Step Verification Timeline */}
        <SlideUpView distance={12} duration={240} style={[styles.statusCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.stepItem}>
            <View style={styles.stepCheck}>
              <Check size={11} color={colors.success} strokeWidth={3} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themeColors.textPrimary }]}>Order created</Text>
              <Text style={[styles.stepDesc, { color: themeColors.textSecondary }]}>Server validated pricing & draft ID</Text>
            </View>
          </View>

          <View style={[styles.stepLine, { backgroundColor: themeColors.borderSubtle }]} />

          <View style={styles.stepItem}>
            <View style={styles.stepCheck}>
              <Check size={11} color={colors.success} strokeWidth={3} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themeColors.textPrimary }]}>Payment initiated</Text>
              <Text style={[styles.stepDesc, { color: themeColors.textSecondary }]}>Checkout session active on Razorpay sandbox</Text>
            </View>
          </View>

          <View style={[styles.stepLine, { backgroundColor: themeColors.borderSubtle }]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepActiveDotContainer, { backgroundColor: themeColors.primarySubtle }]}>
              <View style={[styles.stepActiveDot, { backgroundColor: themeColors.primary }]} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitleActive, { color: themeColors.primary }]}>Verifying payment</Text>
              <Text style={[styles.stepDesc, { color: themeColors.textSecondary }]}>Listening for backend signature verification</Text>
            </View>
          </View>

          <View style={[styles.stepLine, { backgroundColor: themeColors.borderSubtle }]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepInactiveDot, { backgroundColor: themeColors.borderSubtle }]} />
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitleInactive, { color: themeColors.textMuted }]}>Order confirmed</Text>
              <Text style={[styles.stepDesc, { color: themeColors.textMuted }]}>Pending cryptographic settlement</Text>
            </View>
          </View>
        </SlideUpView>

        {/* Security Invariant Guarantee */}
        <SlideUpView distance={14} delay={60} duration={240} style={[styles.securityBanner, { backgroundColor: themeColors.primarySubtle }]}>
          <Shield size={16} color={themeColors.primary} />
          <Text style={[styles.securityText, { color: themeColors.primary }]}>
            Never trust client-side assertions. Order status marks PAID exclusively upon HMAC-SHA256 signature verification.
          </Text>
        </SlideUpView>
      </ScrollView>

      {/* Footer Action Buttons */}
      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <Button
          title="Verify status"
          variant="primary"
          size="lg"
          onPress={handleManualVerify}
          loading={isVerifying}
        />
        {paymentView?.paymentUrl && (
          <Button
            title="Reopen Razorpay payment"
            variant="outline"
            size="md"
            onPress={() => {
              if (paymentView.paymentUrl) {
                Linking.openURL(paymentView.paymentUrl).catch(() => {});
              }
            }}
          />
        )}
        <Button
          title="Cancel order"
          variant="outline"
          size="md"
          onPress={goToFailed}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xxl,
    paddingBottom: 130,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  statusCard: {
    width: '100%',
    borderRadius: radius.cards,
    borderWidth: 1,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActiveDotContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepInactiveDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  stepLine: {
    width: 1.5,
    height: 18,
    marginLeft: 9,
    marginVertical: 2,
  },
  stepContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  stepTitle: {
    ...typography.captionBold,
    fontSize: 13,
  },
  stepTitleActive: {
    ...typography.captionBold,
    fontSize: 13,
    fontWeight: '700',
  },
  stepTitleInactive: {
    ...typography.captionBold,
    fontSize: 13,
  },
  stepDesc: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.inputs,
    gap: spacing.sm,
  },
  securityText: {
    ...typography.captionMedium,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xs,
    ...shadows.card,
  },
});
