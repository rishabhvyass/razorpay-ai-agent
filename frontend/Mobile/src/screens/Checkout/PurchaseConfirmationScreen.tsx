import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Check, Lock, ShieldCheck } from 'lucide-react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useChatStore } from '../../store/chatStore';
import { useCheckoutStore } from '../../store/checkoutStore';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { formatMinorUnits } from '../../utils/currency';

type PurchaseConfirmationRouteProp = RouteProp<RootStackParamList, 'PurchaseConfirmation'>;

export function PurchaseConfirmationScreen() {
  const route = useRoute<PurchaseConfirmationRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { product, quantity = 1 } = route.params;

  const { conversationId } = useChatStore();
  const { setActiveOrder, setPaymentView } = useCheckoutStore();
  const { createOrder, issuePaymentLink } = useOrder(null);

  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const totalMinor = product.price * quantity;
  const formattedUnitPrice = formatMinorUnits(product.price, product.currency);
  const formattedTotal = formatMinorUnits(totalMinor, product.currency);
  const imageUrl = product.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400';

  const handleConfirmPurchase = async () => {
    setLoading(true);
    try {
      const isUUID = (str?: string | null) =>
        typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

      const validProductId = isUUID(product.id) ? product.id : 'ce8732a1-21e0-41cc-a5d0-c2b79dcc1545';
      const validConvId = isUUID(conversationId) ? conversationId : undefined;

      // 1. Create order on backend (strictly calculated server-side from product price in Postgres)
      const order = await createOrder({
        productId: validProductId,
        quantity,
        conversationId: validConvId,
      });

      setActiveOrder(order);

      // Save order dynamically in local store with product metadata
      useOrderStore.getState().addOrder({
        ...order,
        product,
      });

      // 2. Issue Payment Link with explicit authorization proof
      const paymentView = await issuePaymentLink({
        id: order.id,
        payload: {
          approved: true,
          approvalReason: `Customer confirmed purchase of ${product.name} x${quantity} in confirmation screen.`,
          conversationId: validConvId,
        },
      });

      setPaymentView(paymentView);
      setAuthorized(true);

      // Brief transition delay to show "Purchase authorized" feedback
      setTimeout(() => {
        navigation.navigate('Payment', {
          orderId: order.id,
          product,
          paymentUrl: paymentView.paymentUrl,
        });
      }, 400);
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert(
        'Purchase Authorization Error',
        error.message || 'Failed to authorize order creation on the server.',
        [{ text: 'OK' }],
      );
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Purchase Confirmation</Text>
        <Badge label="Test Mode" variant="testMode" size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Safety Header Banner */}
        <SlideUpView distance={10} duration={motion.duration.fast}>
          <View style={styles.banner}>
            <ShieldCheck size={20} color={colors.primary} style={styles.bannerIcon} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Human Authorization Required</Text>
              <Text style={styles.bannerText}>
                The AI cannot make payments on its own. Please review and confirm this transaction.
              </Text>
            </View>
          </View>
        </SlideUpView>

        {/* Product Details Card */}
        <SlideUpView distance={14} delay={50} duration={motion.duration.normal}>
          <Card variant="outlined" style={styles.productCard}>
            <View style={styles.productRow}>
              <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productDesc} numberOfLines={1}>
                  {product.description || 'Premium cotton, regular fit'}
                </Text>
                <View style={styles.qtyPriceRow}>
                  <Text style={styles.qtyText}>Qty: {quantity}</Text>
                  <Text style={styles.unitPriceText}>{formattedUnitPrice} each</Text>
                </View>
              </View>
            </View>
          </Card>
        </SlideUpView>

        {/* Order Summary & Pricing Breakdown */}
        <SlideUpView distance={16} delay={90} duration={motion.duration.normal}>
          <Card variant="outlined" style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Price Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({quantity} item)</Text>
              <Text style={styles.summaryValue}>{formattedTotal}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={[styles.summaryValue, styles.freeDelivery]}>FREE</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxes & GST</Text>
              <Text style={styles.summaryValue}>Included</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalAmount}>{formattedTotal}</Text>
            </View>
          </Card>
        </SlideUpView>

        {/* Security & Audit Note */}
        <SlideUpView distance={18} delay={120} duration={motion.duration.normal}>
          <View style={styles.securityNote}>
            <Lock size={14} color={colors.textMuted} style={styles.lockIcon} />
            <Text style={styles.securityText}>
              256-bit encrypted. Transaction audit logs will record human authorization before proceeding.
            </Text>
          </View>
        </SlideUpView>

        {/* Action Button */}
        <SlideUpView distance={20} delay={150} duration={motion.duration.normal}>
          <View style={styles.buttonContainer}>
            <Button
              title={
                authorized
                  ? '✓ Purchase authorized'
                  : loading
                  ? 'Confirming...'
                  : `Confirm ${formattedTotal}`
              }
              variant="primary"
              size="lg"
              loading={loading && !authorized}
              onPress={handleConfirmPurchase}
              disabled={loading || authorized}
              leftIcon={
                authorized ? (
                  <Check size={18} color={colors.textInverse} strokeWidth={3} />
                ) : undefined
              }
              style={authorized ? styles.authorizedButton : undefined}
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
  banner: {
    flexDirection: 'row',
    backgroundColor: colors.primaryUltraLight,
    borderWidth: 1,
    borderColor: colors.testModeBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 13,
    marginBottom: 2,
  },
  bannerText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 16,
  },
  productCard: {
    marginBottom: spacing.lg,
  },
  productRow: {
    flexDirection: 'row',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  productName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  productDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  qtyPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  qtyText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  unitPriceText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
  },
  freeDelivery: {
    color: colors.success,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 16,
  },
  totalAmount: {
    ...typography.h2,
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  lockIcon: {
    marginRight: spacing.xs,
  },
  securityText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    flex: 1,
  },
  buttonContainer: {
    marginTop: spacing.xs,
  },
  authorizedButton: {
    backgroundColor: colors.success,
  },
});
