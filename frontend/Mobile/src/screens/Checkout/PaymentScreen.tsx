import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  Lock,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Loading } from '../../components/common/Loading';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { useProduct } from '../../hooks/useProducts';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { formatMinorUnits } from '../../utils/currency';

type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

export function PaymentScreen() {
  const route = useRoute<PaymentRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId, product: initialProduct, paymentUrl: initialPaymentUrl } = route.params;

  const { order, paymentView, isLoading: isOrderLoading, issuePaymentLink } = useOrder(orderId);
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
        <Loading message="Loading checkout..." style={styles.centerLoading} />
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
        targetUrl = response.paymentUrl;
      } catch {
        // Fallback
      }
    }

    if (targetUrl) {
      try {
        await Linking.openURL(targetUrl);
      } catch {
        // Continue to pending screen if linking fails in simulator
      }
    }

    setTimeout(() => {
      navigation.navigate('PaymentPending', { orderId, product });
      setOpeningPayment(false);
    }, 400);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <Badge label="Test Mode" variant="testMode" size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Amount Header Card */}
        <SlideUpView distance={12} duration={motion.duration.fast}>
          <Card variant="outlined" style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total to Pay</Text>
            <Text style={styles.amountValue}>{formattedAmount}</Text>
            <Text style={styles.orderRefText}>Ref: {orderReference.slice(0, 16)}...</Text>
          </Card>
        </SlideUpView>

        {/* Product Details Card */}
        <SlideUpView distance={14} delay={50} duration={motion.duration.normal}>
          <Card variant="outlined" style={styles.productCard}>
            <View style={styles.productRow}>
              <Image source={{ uri: imageUrl }} style={styles.productThumb} resizeMode="cover" />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product?.name || 'Classic Oversized Hoodie'}
                </Text>
                <Text style={styles.productCategory}>
                  {product?.category || 'Clothing'} · Qty: {quantity}
                </Text>
                <Text style={styles.productPrice}>{formattedAmount}</Text>
              </View>
            </View>
          </Card>
        </SlideUpView>

        {/* Available Razorpay Payment Methods */}
        <SlideUpView distance={16} delay={90} duration={motion.duration.normal}>
          <View style={styles.methodsSection}>
            <Text style={styles.methodsTitle}>Available Razorpay Methods</Text>
            <View style={styles.methodCard}>
              <View style={styles.methodIconBadge}>
                <Smartphone size={18} color={colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>UPI / QR Code</Text>
                <Text style={styles.methodSub}>Google Pay, PhonePe, Paytm, BHIM</Text>
              </View>
            </View>

            <View style={styles.methodCard}>
              <View style={styles.methodIconBadge}>
                <CreditCard size={18} color={colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Cards & Netbanking</Text>
                <Text style={styles.methodSub}>Visa, Mastercard, RuPay, 50+ Banks</Text>
              </View>
            </View>
          </View>
        </SlideUpView>

        {/* Action Button */}
        <SlideUpView distance={20} delay={140} duration={motion.duration.normal}>
          <View style={styles.buttonContainer}>
            <Button
              title={
                isOpeningPayment
                  ? 'Opening secure payment...'
                  : `Pay ${formattedAmount}`
              }
              variant="primary"
              size="lg"
              loading={isOpeningPayment}
              onPress={handlePayPress}
              disabled={isOpeningPayment}
              leftIcon={
                !isOpeningPayment ? (
                  <ExternalLink size={18} color={colors.textInverse} />
                ) : undefined
              }
            />
          </View>
        </SlideUpView>

        {/* Razorpay Trust Badge */}
        <SlideUpView distance={22} delay={180} duration={motion.duration.normal}>
          <View style={styles.securityFooter}>
            <Shield size={14} color={colors.primary} style={styles.shieldIcon} />
            <Text style={styles.securityText}>
              Secured by Razorpay • Standard 256-bit SSL encryption
            </Text>
          </View>
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
  centerLoading: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  amountLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  amountValue: {
    ...typography.h1,
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  orderRefText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
  },
  productCard: {
    marginBottom: spacing.lg,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  productCategory: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  productPrice: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.primary,
    marginTop: 4,
  },
  methodsSection: {
    marginBottom: spacing.xl,
  },
  methodsTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  methodIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  methodSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  buttonContainer: {
    marginBottom: spacing.lg,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    marginRight: 6,
  },
  securityText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
});
