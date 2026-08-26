import React, { useEffect } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { PaymentSuccessAnimation } from '../../components/motion/PaymentSuccessAnimation';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { formatMinorUnits } from '../../utils/currency';

type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;

export function PaymentSuccessScreen() {
  const route = useRoute<PaymentSuccessRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId, product, paymentId } = route.params;

  const { order } = useOrder(orderId);
  const paymentReference = paymentId || order?.razorpayPaymentId || 'pay_QvR9mZ1x';

  // Mark order dynamically as PAID in order store
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

  const imageUrl = product?.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800';

  const handleViewOrder = () => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleContinueShopping = () => {
    navigation.navigate('Main', { screen: 'AITab' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Order Confirmed</Text>
        <TouchableOpacity
          onPress={handleContinueShopping}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <X size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Checkmark Hero */}
        <PaymentSuccessAnimation
          amountFormatted={formattedAmount}
          subtitle="Your payment was verified by Razorpay and your order is confirmed."
        />

        {/* Order Details Card */}
        <SlideUpView distance={14} delay={180} duration={motion.duration.normal}>
          <Card variant="outlined" style={styles.detailsCard}>
            <View style={styles.itemRow}>
              <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {product?.name || 'Classic Oversized Hoodie'}
                </Text>
                <Text style={styles.itemCategory}>
                  {product?.category || 'Clothing'} · Qty: {quantity}
                </Text>
                <Text style={styles.itemPrice}>{formattedAmount}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID</Text>
              <Text style={styles.infoValue}>{orderId.slice(0, 18)}...</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment ID</Text>
              <Text style={styles.infoValue}>{paymentReference}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>PAID</Text>
              </View>
            </View>
          </Card>
        </SlideUpView>

        {/* Action Buttons */}
        <SlideUpView distance={18} delay={230} duration={motion.duration.normal}>
          <View style={styles.buttonGroup}>
            <Button
              title="Track Order"
              variant="primary"
              size="lg"
              onPress={handleViewOrder}
              style={styles.primaryButton}
            />

            <Button
              title="Continue Shopping"
              variant="secondary"
              size="lg"
              onPress={handleContinueShopping}
              style={styles.secondaryButton}
            />
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
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  detailsCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  itemCategory: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    ...typography.bodyBold,
    color: colors.primary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  statusText: {
    ...typography.captionBold,
    color: colors.success,
    fontSize: 11,
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  primaryButton: {
    marginBottom: spacing.xs,
  },
  secondaryButton: {},
});
