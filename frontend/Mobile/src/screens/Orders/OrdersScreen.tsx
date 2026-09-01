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
import { EmptyState } from '../../components/common/EmptyState';
import { Loading } from '../../components/common/Loading';
import { AnimatedPressable, SlideUpView } from '../../components/motion';
import { OrderCard } from '../../components/orders/OrderCard';
import { useOrders } from '../../hooks/useOrder';
import { RootNavigationProp } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, spacing, typography, useThemeColors } from '../../theme';
import { Order } from '../../types';

type FilterType = 'All' | 'Active' | 'Completed';

export function OrdersScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const themeColors = useThemeColors();
  const { data: serverOrders = [], isLoading, refetch } = useOrders();
  const dynamicOrders = useOrderStore((state) => state.orders);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

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
    navigation.navigate('MainTabs', { screen: 'AITab' });
  };

  const filters: FilterType[] = ['All', 'Active', 'Completed'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Orders</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Verified transactions and orders</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const isActive = activeFilter === f;
          return (
            <AnimatedPressable
              key={f}
              style={[
                styles.filterTab,
                { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                isActive && { backgroundColor: themeColors.primarySubtle, borderColor: themeColors.primary },
              ]}
              pressScale={0.94}
              onPress={() => setActiveFilter(f)}
              accessibilityLabel={`Show ${f} orders`}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: themeColors.textSecondary },
                  isActive && { color: themeColors.primary, fontWeight: '700' },
                ]}
              >
                {f}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {isLoading && allOrders.length === 0 ? (
        <Loading message="Loading orders..." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} color={colors.primary} />}
          title="No orders found"
          description="When you purchase products through your AI concierge, they will appear here."
          actionTitle="Ask Concierge"
          onAction={handleStartShopping}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SlideUpView distance={8} delay={Math.min(index * 40, 160)} duration={200}>
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 24,
  },
  headerSubtitle: {
    ...typography.secondary,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.testModeBorder,
  },
  filterText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  filterTextActive: {
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
});
