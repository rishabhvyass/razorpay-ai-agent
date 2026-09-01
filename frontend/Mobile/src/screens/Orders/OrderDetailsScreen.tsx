import React from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ErrorState } from '../../components/common/ErrorState';
import { Loading } from '../../components/common/Loading';
import { IconButton, SlideUpView } from '../../components/motion';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { useOrder } from '../../hooks/useOrder';
import { useProduct } from '../../hooks/useProducts';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';
import { formatDate } from '../../utils/formatting';

type OrderDetailsRouteProp = RouteProp<RootStackParamList, 'OrderDetails'>;

export function OrderDetailsScreen() {
  const route = useRoute<OrderDetailsRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId } = route.params;

  const { order: serverOrder, isLoading, isError, refetch, refreshPayment, isRefreshing } =
    useOrder(orderId);
  const storedOrder = useOrderStore((state) => state.getOrderById(orderId));

  const order = serverOrder || storedOrder;
  const { data: product } = useProduct(order?.productId || storedOrder?.productId);

  const effectiveStatus = storedOrder?.status === 'PAID' ? 'PAID' : (order?.status ?? 'PAYMENT_PENDING');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Loading order details..." />
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState
          title="Order not found"
          message="Unable to load order records from the server."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const quantity = order.quantity ?? 1;
  const formattedAmount = order.amountFormatted || formatMinorUnits(order.amount, order.currency);
  const orderDate = formatDate(order.createdAt || new Date().toISOString());
  const paymentRef = order.razorpayPaymentId || storedOrder?.razorpayPaymentId || 'pay_test_rzp_mock';
  const razorpayOrderId = order.razorpayOrderId || storedOrder?.razorpayOrderId || 'order_test_rzp';

  const getStatusHeadline = () => {
    switch (effectiveStatus) {
      case 'PAID':
        return 'Order confirmed';
      case 'PAYMENT_FAILED':
        return "Payment wasn't completed";
      case 'CANCELLED':
        return 'Order cancelled';
      case 'PAYMENT_PENDING':
      default:
        return 'Payment pending verification';
    }
  };

  const themeColors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <IconButton
          size={36}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color={themeColors.textPrimary} />
        </IconButton>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Order details</Text>
        <IconButton
          size={36}
          onPress={() => refreshPayment(orderId)}
          disabled={isRefreshing}
          accessibilityLabel="Refresh order status"
        >
          <RefreshCw size={16} color={themeColors.textSecondary} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refreshPayment(orderId)}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* Large Status Headline Card */}
        <SlideUpView distance={10} duration={240} style={[styles.statusCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.statusRow}>
            <View>
              <Text style={[styles.statusHeadline, { color: themeColors.textPrimary }]}>{getStatusHeadline()}</Text>
              <Text style={[styles.statusDate, { color: themeColors.textSecondary }]}>{orderDate}</Text>
            </View>
            <Badge label={effectiveStatus} status={effectiveStatus} size="md" showDot />
          </View>

          <View style={[styles.divider, { backgroundColor: themeColors.borderSubtle }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: themeColors.textSecondary }]}>Total Amount</Text>
            <Text style={[styles.totalAmount, { color: themeColors.primary }]}>{formattedAmount}</Text>
          </View>
        </SlideUpView>

        {/* Product Summary Card */}
        <SlideUpView distance={12} delay={60} duration={240} style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Item Summary</Text>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: themeColors.textPrimary }]}>
                {product?.name || order.product?.name || 'Verified Product Item'}
              </Text>
              <Text style={[styles.itemMeta, { color: themeColors.textSecondary }]}>Quantity: {quantity} · {product?.category || 'Standard'}</Text>
            </View>
            <Text style={[styles.itemPrice, { color: themeColors.textPrimary }]}>{formattedAmount}</Text>
          </View>
        </SlideUpView>

        {/* Financial & Razorpay IDs Card */}
        <SlideUpView distance={14} delay={120} duration={240} style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Financial References</Text>
          <View style={styles.refRow}>
            <Text style={[styles.refLabel, { color: themeColors.textSecondary }]}>Order ID</Text>
            <Text style={[styles.refValue, { color: themeColors.textPrimary }]}>{order.id}</Text>
          </View>
          <View style={[styles.refDivider, { backgroundColor: themeColors.borderSubtle }]} />
          <View style={styles.refRow}>
            <Text style={[styles.refLabel, { color: themeColors.textSecondary }]}>Razorpay Order ID</Text>
            <Text style={[styles.refValue, { color: themeColors.textPrimary }]}>{razorpayOrderId}</Text>
          </View>
          <View style={[styles.refDivider, { backgroundColor: themeColors.borderSubtle }]} />
          <View style={styles.refRow}>
            <Text style={[styles.refLabel, { color: themeColors.textSecondary }]}>Payment ID</Text>
            <Text style={[styles.refValue, { color: themeColors.textPrimary }]}>{paymentRef}</Text>
          </View>
        </SlideUpView>

        {/* 4-Step Verified Timeline */}
        <SlideUpView distance={16} delay={180} duration={240}>
          <OrderTimeline status={effectiveStatus} hasPaymentLink={!!order.razorpayPaymentLinkId} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
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
    fontSize: 16,
    fontWeight: '700',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHeadline: {
    ...typography.h2,
    color: colors.textPrimary,
    fontSize: 18,
  },
  statusDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
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
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  totalAmount: {
    ...typography.price,
    color: colors.textPrimary,
    fontSize: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm + 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  itemMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  refLabel: {
    ...typography.secondary,
    color: colors.textSecondary,
  },
  refValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  refDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
});
