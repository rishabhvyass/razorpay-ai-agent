import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShoppingBag } from 'lucide-react-native';
import { Button } from '../../components/common/Button';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { OrderCard } from '../../components/orders/OrderCard';
import { useOrders } from '../../hooks/useOrder';
import { RootNavigationProp } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, spacing, typography } from '../../theme';
import { Order } from '../../types';

type FilterType = 'All' | 'Active' | 'Completed';

export function OrdersScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { data: serverOrders = [], isLoading, refetch } = useOrders();
  const dynamicOrders = useOrderStore((state) => state.orders);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  // Merge server orders and dynamic local orders, prioritizing most recent
  const mergedOrdersMap = new Map<string, Order>();

  serverOrders.forEach((o) => {
    mergedOrdersMap.set(o.id, o);
  });

  dynamicOrders.forEach((o) => {
    mergedOrdersMap.set(o.id, o);
  });

  const allOrders = Array.from(mergedOrdersMap.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const filteredOrders = allOrders.filter((order) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Active') {
      return (
        order.status === 'PAYMENT_PENDING' ||
        order.status === 'PENDING_CONFIRMATION' ||
        order.status === 'ORDER_CREATED'
      );
    }
    if (activeFilter === 'Completed') {
      return (
        order.status === 'PAID' ||
        order.status === 'PAYMENT_FAILED' ||
        order.status === 'CANCELLED' ||
        order.status === 'PAYMENT_EXPIRED'
      );
    }
    return true;
  });

  const handleOrderPress = (order: Order) => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  const handleStartShopping = () => {
    navigation.navigate('Main', { screen: 'AITab' });
  };

  const filters: FilterType[] = ['All', 'Active', 'Completed'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SlideUpView
            distance={14}
            delay={Math.min(index * 60, 200)}
            duration={240}
          >
            <OrderCard order={item} onPress={() => handleOrderPress(item)} />
          </SlideUpView>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Large Header Title */}
            <Text style={styles.headerTitle}>Orders</Text>

            {/* Filter Pills */}
            <View style={styles.filtersRow}>
              {filters.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterPill,
                      isActive ? styles.filterPillActive : styles.filterPillInactive,
                    ]}
                    onPress={() => setActiveFilter(filter)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive
                          ? styles.filterPillTextActive
                          : styles.filterPillTextInactive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={36} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              When you place an order with Checkout Concierge, your orders and payment status will appear here.
            </Text>
            <Button
              title="Start Shopping"
              variant="primary"
              size="md"
              onPress={handleStartShopping}
              style={styles.emptyButton}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  filterPillText: {
    ...typography.captionBold,
    fontSize: 13,
  },
  filterPillTextActive: {
    color: colors.textInverse,
  },
  filterPillTextInactive: {
    color: colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
});
