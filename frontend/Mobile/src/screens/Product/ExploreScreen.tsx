import React, { useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Sparkles } from 'lucide-react-native';
import { ScalePressable } from '../../components/motion/ScalePressable';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useProducts } from '../../hooks/useProducts';
import { RootNavigationProp } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';
import { Product } from '../../types';
import { formatMinorUnits } from '../../utils/currency';

const CATEGORIES = ['All', 'Clothing', 'Shoes', 'Accessories', 'Electronics'];

export function ExploreScreen() {
  const navigation = useNavigation<RootNavigationProp>();
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity
          style={styles.aiAskButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'AITab' })}
          activeOpacity={0.8}
        >
          <Sparkles size={14} color={colors.primary} />
          <Text style={styles.aiAskText}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, hoodies, shoes..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillSelected,
                ]}
                onPress={() => setSelectedCategory(item)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Products Grid */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item, index }) => {
          const formattedPrice = formatMinorUnits(item.price, item.currency);
          const imageUrl =
            item.imageUrl ||
            'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500';
          const delay = Math.min(index * motion.stagger.fast, 180);

          return (
            <SlideUpView
              distance={16}
              delay={delay}
              duration={motion.duration.normal}
              style={styles.cardContainer}
            >
              <ScalePressable
                pressedScale={motion.scale.cardPress}
                style={styles.productCard}
                onPress={() => handleProductPress(item)}
              >
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.productCategory} numberOfLines={1}>
                    {item.category}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>{formattedPrice}</Text>
                    <TouchableOpacity
                      style={styles.buyMiniButton}
                      onPress={() => handleBuyPress(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.buyMiniText}>Buy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScalePressable>
            </SlideUpView>
          );
        }}
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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  aiAskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 4,
  },
  aiAskText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoryContainer: {
    marginBottom: spacing.sm,
  },
  categoryList: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    ...typography.captionMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  categoryTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110, // space for floating tab bar
    paddingTop: spacing.xs,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardContainer: {
    width: '48%',
  },
  productCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surfaceSubtle,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: 12,
  },
  productName: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  productCategory: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  buyMiniButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  buyMiniText: {
    ...typography.captionBold,
    fontSize: 11,
    color: colors.textInverse,
  },
});
