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
import { AgentActivityItem } from '../../components/agent/AgentActivityItem';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ErrorState } from '../../components/common/ErrorState';
import { Loading } from '../../components/common/Loading';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { useOrderActivity } from '../../hooks/useAgentActivity';
import { useOrder } from '../../hooks/useOrder';
import { useProduct } from '../../hooks/useProducts';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { formatMinorUnits } from '../../utils/currency';
import { formatDate } from '../../utils/formatting';

type OrderDetailsRouteProp = RouteProp<RootStackParamList, 'OrderDetails'>;

export function OrderDetailsScreen() {
  const route = useRoute<OrderDetailsRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId } = route.params;

  const { order: serverOrder, isLoading, isError, error, refetch, refreshPayment, isRefreshing } =
    useOrder(orderId);
  const storedOrder = useOrderStore((state) => state.getOrderById(orderId));

  const order = serverOrder || storedOrder;
  const { data: product } = useProduct(order?.productId || storedOrder?.productId);
  const { data: activityData } = useOrderActivity(orderId);

  // Merge status: if marked PAID in local store, reflect PAID
  const effectiveStatus = storedOrder?.status === 'PAID' ? 'PAID' : (order?.status ?? 'PAYMENT_PENDING');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Loading order details..." style={styles.centerLoading} />
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState
          title="Order not found"
          message={(error as Error)?.message || 'Unable to retrieve order.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const formattedAmount = order.amountFormatted || formatMinorUnits(order.amount, order.currency);
  const isPayable = ['ORDER_CREATED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(effectiveStatus);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id.slice(0, 8)}</Text>
        <Badge label="Test Mode" variant="testMode" size="sm" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => refreshPayment(orderId)} tintColor={colors.primary} />
        }
      >
        {/* Order Overview Card */}
        <SlideUpView distance={12} duration={motion.duration.fast}>
          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderNumberTitle}>Order Reference</Text>
                <Text style={styles.orderUuidMono}>{order.id}</Text>
              </View>
              <Badge label={effectiveStatus.replace(/_/g, ' ')} status={effectiveStatus} size="md" />
            </View>

            <View style={styles.divider} />

            <View style={styles.productSection}>
              <Text style={styles.productName}>{product?.name ?? 'Catalog Product'}</Text>
              <Text style={styles.productQuantity}>Quantity: {order.quantity}</Text>
              <Text style={styles.productPrice}>{formattedAmount}</Text>
            </View>

            <View style={styles.divider} />

            {/* Reference IDs */}
            <View style={styles.refList}>
              {order.razorpayOrderId ? (
                <View style={styles.refRow}>
                  <Text style={styles.refLabel}>Razorpay Order ID</Text>
                  <Text style={styles.refValueMono}>{order.razorpayOrderId}</Text>
                </View>
              ) : null}

              {order.razorpayPaymentLinkId ? (
                <View style={styles.refRow}>
                  <Text style={styles.refLabel}>Payment Link ID</Text>
                  <Text style={styles.refValueMono}>{order.razorpayPaymentLinkId}</Text>
                </View>
              ) : null}

              {storedOrder?.razorpayPaymentId || order.razorpayPaymentId ? (
                <View style={styles.refRow}>
                  <Text style={styles.refLabel}>Razorpay Payment ID</Text>
                  <Text style={styles.refValueMono}>{storedOrder?.razorpayPaymentId || order.razorpayPaymentId}</Text>
                </View>
              ) : null}

              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Created At</Text>
                <Text style={styles.refValue}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>
          </Card>
        </SlideUpView>

        {/* Timeline Stepper */}
        <SlideUpView distance={16} delay={70} duration={motion.duration.normal}>
          <Card variant="outlined" style={styles.timelineCard}>
            <OrderTimeline status={effectiveStatus} hasPaymentLink={!!order.razorpayPaymentLinkId || true} />
          </Card>
        </SlideUpView>

        {/* Audit Trail for this Order */}
        {activityData?.actions && activityData.actions.length > 0 ? (
          <SlideUpView distance={18} delay={120} duration={motion.duration.normal}>
            <View style={styles.auditSection}>
              <View style={styles.auditHeader}>
                <ShieldCheck size={18} color={colors.primary} />
                <Text style={styles.auditTitle}>Order Audit Trail</Text>
              </View>
              {activityData.actions.map((act) => (
                <AgentActivityItem key={act.id} action={act} />
              ))}
            </View>
          </SlideUpView>
        ) : null}

        {/* Action Buttons */}
        <SlideUpView distance={20} delay={160} duration={motion.duration.normal}>
          <View style={styles.actions}>
            {isPayable ? (
              <Button
                title={`Pay ${formattedAmount}`}
                variant="primary"
                onPress={() =>
                  navigation.navigate('Payment', {
                    orderId: order.id,
                    product: product || undefined,
                  })
                }
              />
            ) : null}

            <Button
              title="Refresh Payment Status"
              variant="outline"
              loading={isRefreshing}
              onPress={() => refreshPayment(orderId)}
              leftIcon={<RefreshCw size={16} color={colors.primary} />}
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
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumberTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  orderUuidMono: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'Courier',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  productSection: {
    gap: spacing.xs,
  },
  productName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  productQuantity: {
    ...typography.body,
    color: colors.textSecondary,
  },
  productPrice: {
    ...typography.h2,
    color: colors.primary,
  },
  refList: {
    gap: spacing.sm,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  refValue: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  refValueMono: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'Courier',
    fontSize: 11,
  },
  timelineCard: {
    marginBottom: spacing.lg,
  },
  auditSection: {
    marginBottom: spacing.lg,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  auditTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
