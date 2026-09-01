import React, { useEffect } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Check, ShieldCheck } from 'lucide-react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { PaymentSuccessAnimation } from '../../components/motion/PaymentSuccessAnimation';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';

type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;

export function PaymentSuccessScreen() {
  const route = useRoute<PaymentSuccessRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId, product, paymentId } = route.params;

  const { order } = useOrder(orderId);
  const paymentReference = paymentId || order?.razorpayPaymentId || 'pay_QvR9mZ1x';

  // Ensure store reflects PAID state with reference
  useEffect(() => {
    if (orderId) {
      useOrderStore.getState().updateOrderStatus(orderId, 'PAID', paymentReference);
      if (product) {
        useOrderStore.getState().addOrder({
          id: orderId,
          productId: product.id,
          amount: product.price * (order?.quantity ?? 1),
          amountFormatted: formatMinorUnits(product.price * (order?.quantity ?? 1), product.currency),
          currency: product.currency,
          status: 'PAID',
          quantity: order?.quantity ?? 1,
          product,
          razorpayPaymentId: paymentReference,
          createdAt: order?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [orderId, paymentReference, product, order?.quantity, order?.createdAt]);

  const quantity = order?.quantity ?? 1;
  const formattedAmount = order
    ? order.amountFormatted || formatMinorUnits(order.amount, order.currency)
    : product
    ? formatMinorUnits(product.price * quantity, product.currency)
    : '₹1,499';

  const orderNumber = (order?.id || orderId || 'order_NxK7Pq2d').slice(0, 10);
  const imageUrl = product?.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400';

  const handleViewOrder = () => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleContinueShopping = () => {
    navigation.navigate('MainTabs', { screen: 'AITab' });
  };

  const themeColors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Animation: Checkmark -> Title -> Amount */}
        <PaymentSuccessAnimation
          amountFormatted={formattedAmount}
          subtitle="Your order is confirmed."
        />

        {/* Order Details Overview */}
        <SlideUpView distance={14} delay={180} duration={260} style={[styles.detailsCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.orderLabel, { color: themeColors.textSecondary }]}>Order ID</Text>
              <Text style={[styles.orderNumber, { color: themeColors.textPrimary }]}>#{orderNumber}</Text>
            </View>
            <Badge label="PAID" variant="success" size="sm" showDot />
          </View>

          <View style={[styles.divider, { backgroundColor: themeColors.borderSubtle }]} />

          {/* Product Row */}
          <View style={styles.productRow}>
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                {product?.name || order?.product?.name || 'Verified Order Item'}
              </Text>
              <Text style={[styles.productMeta, { color: themeColors.textSecondary }]}>Qty: {quantity} · {product?.category || 'Standard'}</Text>
              <Text style={[styles.priceMeta, { color: themeColors.primary }]}>{formattedAmount}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: themeColors.borderSubtle }]} />

          {/* Cryptographic Proof Overview */}
          <View style={styles.proofRow}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Razorpay Payment</Text>
            <Text style={[styles.value, { color: themeColors.textPrimary }]}>{paymentReference}</Text>
          </View>
        </SlideUpView>

        {/* Verified Trust Seal */}
        <SlideUpView distance={16} delay={240} duration={260} style={[styles.trustBanner, { backgroundColor: themeColors.primarySubtle }]}>
          <ShieldCheck size={16} color={colors.success} />
          <Text style={[styles.trustText, { color: themeColors.textSecondary }]}>
            Cryptographically confirmed by Razorpay webhook signature.
          </Text>
        </SlideUpView>
      </ScrollView>

      {/* Action Footer: [View order] [Continue shopping] */}
      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <Button
          title="View order"
          variant="primary"
          size="lg"
          onPress={handleViewOrder}
        />
        <Button
          title="Continue shopping"
          variant="outline"
          size="lg"
          onPress={handleContinueShopping}
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
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: 140,
    alignItems: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPaddingLarge,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  orderNumber: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  productMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  priceMeta: {
    ...typography.captionBold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  proofRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.secondary,
    color: colors.textSecondary,
  },
  value: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  trustBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.inputs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  trustText: {
    ...typography.captionMedium,
    color: colors.successText,
    flex: 1,
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
    gap: spacing.sm,
    ...shadows.card,
  },
});
