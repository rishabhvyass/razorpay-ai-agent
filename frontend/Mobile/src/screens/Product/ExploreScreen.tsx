import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Moon, Search, Sparkles, Sun } from 'lucide-react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { Loading } from '../../components/common/Loading';
import { AnimatedPressable, IconButton, SlideUpView } from '../../components/motion';
import { ProductCard } from '../../components/products/ProductCard';
import { useProducts } from '../../hooks/useProducts';
import { RootNavigationProp } from '../../navigation/types';
import { useThemeStore } from '../../store/themeStore';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { Product } from '../../types';

const CATEGORIES = ['All', 'Clothing', 'Shoes', 'Accessories', 'Electronics'];

export function ExploreScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const themeColors = useThemeColors();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products = [], isLoading, refetch } = useProducts({
    q: searchQuery || undefined,
    category: selectedCategory === 'All' ? undefined : selectedCategory.toLowerCase(),
  });

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', { productId: product.id });
  };

  const handleBuyPress = (product: Product) => {
    navigation.navigate('PurchaseConfirmation', { product, quantity: 1 });
  };

  const handleAskAI = (prompt: string) => {
    (navigation as any).navigate('MainTabs', {
      screen: 'AITab',
      params: { initialQuery: prompt },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSubtitle}>Verified product catalog</Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            size={36}
            onPress={toggleTheme}
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun size={16} color="#FBBF24" />
            ) : (
              <Moon size={16} color={colors.textSecondary} />
            )}
          </IconButton>
          <AnimatedPressable
            style={styles.aiButton}
            pressScale={0.94}
            onPress={() => handleAskAI('Show me trending items under ₹3,000')}
            accessibilityLabel="Ask AI Concierge"
          >
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.aiButtonText}>Ask AI</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Search Capsule */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search verified items..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <AnimatedPressable
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                pressScale={0.94}
                onPress={() => setSelectedCategory(item)}
                accessibilityLabel={`Filter by ${item}`}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </AnimatedPressable>
            );
          }}
        />
      </View>

      {/* Product Feed */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SlideUpView
            distance={14}
            delay={Math.min(index * 50, 150)}
            duration={240}
          >
            <ProductCard
              product={item}
              onPressDetails={() => handleProductPress(item)}
              onPressBuy={() => handleBuyPress(item)}
            />
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
        ListEmptyComponent={
          isLoading ? (
            <Loading message="Searching catalog..." />
          ) : (
            <EmptyState
              badge="Concierge Search"
              title="No exact matches found"
              description="Ask Checkout Concierge to find alternatives or expand budget criteria."
              actionTitle="Ask Concierge"
              onAction={() => handleAskAI(`Find ${searchQuery || 'products'}`)}
            />
          )
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    gap: 5,
  },
  aiButtonText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 44,
    ...shadows.subtle,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  categoryContainer: {
    paddingVertical: spacing.sm,
  },
  categoryList: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primarySubtle,
  },
  categoryText: {
    ...typography.secondaryMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: 100, // Clearance for floating tab bar
  },
});
