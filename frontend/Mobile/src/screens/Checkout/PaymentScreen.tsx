import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CreditCard, Lock, Shield, Smartphone } from 'lucide-react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { useProduct } from '../../hooks/useProducts';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';

type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

export function PaymentScreen() {
  const route = useRoute<PaymentRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId, product: initialProduct, paymentUrl: initialPaymentUrl } = route.params;

  const { order, paymentView, isLoading: isOrderLoading, issuePaymentLink, refreshPayment } =
    useOrder(orderId);
  const { data: fetchedProduct } = useProduct(order?.productId || initialProduct?.id);
  const product = initialProduct || fetchedProduct;

  const [isOpeningPayment, setOpeningPayment] = useState(false);
  const paymentUrl = initialPaymentUrl || paymentView?.paymentUrl;

  useEffect(() => {
    if (order?.status === 'PAID') {
      navigation.replace('PaymentSuccess', { orderId, product });
    } else if (order?.status === 'PAYMENT_FAILED' || order?.status === 'PAYMENT_EXPIRED') {
      navigation.replace('PaymentFailed', { orderId, product });
    }
  }, [order?.status, orderId, product, navigation]);

  if (isOrderLoading && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Preparing secure checkout..." />
      </SafeAreaView>
    );
  }

  const quantity = order?.quantity ?? 1;
  const formattedAmount = order
    ? order.amountFormatted || formatMinorUnits(order.amount, order.currency)
    : product
    ? formatMinorUnits(product.price * quantity, product.currency)
    : '₹1,499';

  const orderReference = order?.id || orderId || 'order_NxK7Pq2d';
  const imageUrl = product?.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800';

  const handlePayPress = async () => {
    if (isOpeningPayment) return;
    setOpeningPayment(true);

    let targetUrl = paymentUrl;

    if (!targetUrl && orderId) {
      try {
        const response = await issuePaymentLink({
          id: orderId,
          payload: {
            approved: true,
            approvalReason: `Customer confirmed checkout payment for ${product?.name ?? 'item'}.`,
          },
        });
        if (response && response.paymentUrl) {
          targetUrl = response.paymentUrl;
        }
      } catch (err) {
        console.warn('[PaymentScreen] issuePaymentLink error:', err);
      }
    }

    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      try {
        const supported = await Linking.canOpenURL(targetUrl);
        if (supported) {
          await Linking.openURL(targetUrl);
        }
      } catch (err) {
        console.warn('[PaymentScreen] Linking error:', err);
      }
    }

    setOpeningPayment(false);
    navigation.navigate('PaymentPending', {
      orderId,
      product,
    });
  };

  const themeColors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Secure Checkout</Text>
        <Badge label="RAZORPAY TEST MODE" variant="testMode" size="sm" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display Hero */}
        <SlideUpView distance={10} duration={240} style={[styles.amountDisplay, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.amountLabel, { color: themeColors.textSecondary }]}>Amount Due</Text>
          <Text style={[styles.amountValue, { color: themeColors.primary }]}>{formattedAmount}</Text>
          <Text style={[styles.orderRefText, { color: themeColors.textMuted }]}>Order #{orderReference.slice(0, 10)}</Text>
        </SlideUpView>

        {/* Product Card */}
        {product && (
          <SlideUpView distance={12} delay={60} duration={240} style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
            <View style={styles.itemDetails}>
              <Text style={[styles.itemCategory, { color: themeColors.primary }]}>{product.category || 'Product'}</Text>
              <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>{product.name}</Text>
              <Text style={[styles.itemPrice, { color: themeColors.textSecondary }]}>
                {formattedAmount} (Qty: {quantity})
              </Text>
            </View>
          </SlideUpView>
        )}

        {/* Razorpay Test Environment Sandbox Guide */}
        <SlideUpView distance={14} delay={120} duration={240} style={[styles.testGuideCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.guideHeader}>
            <Shield size={16} color={themeColors.primary} />
            <Text style={[styles.guideTitle, { color: themeColors.textPrimary }]}>Razorpay Test Sandbox</Text>
          </View>
          <Text style={[styles.guideDesc, { color: themeColors.textSecondary }]}>
            No real funds will be charged. Use any test method below on the Razorpay gateway:
          </Text>

          <View style={styles.methodList}>
            <View style={[styles.methodItem, { backgroundColor: themeColors.backgroundSubtle }]}>
              <Smartphone size={16} color={themeColors.textSecondary} />
              <View style={styles.methodTextCol}>
                <Text style={[styles.methodName, { color: themeColors.textPrimary }]}>UPI / QR Code</Text>
                <Text style={[styles.methodValue, { color: themeColors.primary }]}>VPA: success@razorpay</Text>
              </View>
            </View>

            <View style={[styles.methodItem, { backgroundColor: themeColors.backgroundSubtle }]}>
              <CreditCard size={16} color={themeColors.textSecondary} />
              <View style={styles.methodTextCol}>
                <Text style={[styles.methodName, { color: themeColors.textPrimary }]}>Test Card</Text>
                <Text style={[styles.methodValue, { color: themeColors.primary }]}>4111 2222 3333 4444 · Exp: 12/28 · CVV: 123</Text>
              </View>
            </View>
          </View>
        </SlideUpView>

        {/* Security Message */}
        <View style={[styles.securityBox, { backgroundColor: themeColors.backgroundSubtle, borderColor: themeColors.border }]}>
          <Lock size={14} color={themeColors.textMuted} />
          <Text style={[styles.securityText, { color: themeColors.textSecondary }]}>
            Payment status is verified by Razorpay.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Payment Button */}
      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <Button
          title={isOpeningPayment ? 'Opening secure payment...' : `Pay ${formattedAmount}`}
          variant="primary"
          size="lg"
          loading={isOpeningPayment}
          disabled={isOpeningPayment}
          onPress={handlePayPress}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: 110,
  },
  amountDisplay: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.largeCards,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  amountLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  amountValue: {
    ...typography.paymentAmount,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  orderRefText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemCategory: {
    ...typography.captionBold,
    color: colors.aiViolet,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
    marginVertical: 2,
  },
  itemPrice: {
    ...typography.secondaryBold,
    color: colors.textSecondary,
  },
  testGuideCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  guideTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  guideDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  methodList: {
    gap: spacing.sm,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radius.inputs,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  methodTextCol: {
    flex: 1,
  },
  methodName: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  methodValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    marginTop: 2,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  securityText: {
    ...typography.captionMedium,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
});
