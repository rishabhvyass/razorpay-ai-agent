import React, { useState } from 'react';
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
import { ArrowLeft, Check, Minus, Plus, ShieldCheck } from 'lucide-react-native';
import { Button } from '../../components/common/Button';
import { ErrorState } from '../../components/common/ErrorState';
import { Loading } from '../../components/common/Loading';
import { AnimatedPressable, FadeInImage, IconButton, SlideUpView } from '../../components/motion';
import { useProduct } from '../../hooks/useProducts';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useCheckoutStore } from '../../store/checkoutStore';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';

type ProductDetailsRouteProp = RouteProp<RootStackParamList, 'ProductDetails'>;

export function ProductDetailsScreen() {
  const route = useRoute<ProductDetailsRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { productId } = route.params;
  const { data: product, isLoading, isError, refetch } = useProduct(productId);
  const { selectProductForCheckout } = useCheckoutStore();

  const [quantity, setQuantity] = useState(1);

  const incrementQty = () => {
    if (quantity < 10) setQuantity((q) => q + 1);
  };

  const decrementQty = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleBuyNow = () => {
    if (!product) return;
    selectProductForCheckout(product, quantity);
    navigation.navigate('PurchaseConfirmation', { product, quantity });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Loading product..." />
      </SafeAreaView>
    );
  }

  if (isError || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState
          title="Product not found"
          message="Unable to load verified product details."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const formattedUnitPrice = formatMinorUnits(product.price, product.currency);
  const totalMinor = product.price * quantity;
  const formattedTotal = formatMinorUnits(totalMinor, product.currency);
  const inStock = product.inStock !== false && (product.stock === undefined || product.stock > 0);
  const imageUrl = product.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800';

  const themeColors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Editorial Top Bar */}
      <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <IconButton
          size={36}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color={themeColors.textPrimary} />
        </IconButton>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Product</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Editorial Image */}
        <SlideUpView distance={12} duration={240} style={styles.imageContainer}>
          <FadeInImage
            source={{ uri: imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </SlideUpView>

        {/* Product Information */}
        <View style={styles.infoSection}>
          <View style={styles.categoryRow}>
            <Text style={[styles.category, { color: themeColors.primary }]}>{product.category || 'Curated Item'}</Text>
            <View style={styles.stockBadge}>
              <View
                style={[
                  styles.stockDot,
                  { backgroundColor: inStock ? colors.success : colors.textMuted },
                ]}
              />
              <Text style={[styles.stockText, { color: themeColors.textSecondary }]}>{inStock ? 'In stock' : 'Out of stock'}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: themeColors.textPrimary }]}>{product.name}</Text>
          <Text style={[styles.price, { color: themeColors.textPrimary }]}>{formattedUnitPrice}</Text>

          <View style={[styles.divider, { backgroundColor: themeColors.borderSubtle }]} />

          {/* Description */}
          <Text style={[styles.sectionHeading, { color: themeColors.textPrimary }]}>Description</Text>
          <Text style={[styles.description, { color: themeColors.textSecondary }]}>
            {product.description ||
              'Carefully selected and quality verified. Standard delivery within 2–4 business days with end-to-end cryptographic tracking.'}
          </Text>

          {/* Specifications */}
          <Text style={[styles.sectionHeading, { color: themeColors.textPrimary }]}>Specifications</Text>
          <View style={[styles.specsCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: themeColors.textSecondary }]}>Category</Text>
              <Text style={[styles.specValue, { color: themeColors.textPrimary }]}>{product.category || 'Lifestyle'}</Text>
            </View>
            <View style={[styles.specDivider, { backgroundColor: themeColors.borderSubtle }]} />
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: themeColors.textSecondary }]}>Verification</Text>
              <Text style={[styles.specValue, { color: themeColors.textPrimary }]}>Razorpay Catalog</Text>
            </View>
            <View style={[styles.specDivider, { backgroundColor: themeColors.borderSubtle }]} />
            <View style={styles.specRow}>
              <Text style={[styles.specLabel, { color: themeColors.textSecondary }]}>Availability</Text>
              <Text style={[styles.specValue, { color: themeColors.textPrimary }]}>{inStock ? 'Immediate Dispatch' : 'Unavailable'}</Text>
            </View>
          </View>

          {/* Quantity Selector */}
          <Text style={[styles.sectionHeading, { color: themeColors.textPrimary }]}>Quantity</Text>
          <View style={[styles.quantityCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Text style={[styles.quantityLabel, { color: themeColors.textPrimary }]}>Selected units</Text>
            <View style={styles.qtyControls}>
              <AnimatedPressable
                style={[styles.qtyButton, { backgroundColor: themeColors.backgroundSubtle, borderColor: themeColors.border }, quantity <= 1 && styles.qtyButtonDisabled]}
                pressScale={0.90}
                onPress={decrementQty}
                disabled={quantity <= 1}
                accessibilityLabel="Decrease quantity"
              >
                <Minus size={14} color={quantity <= 1 ? themeColors.textMuted : themeColors.textPrimary} />
              </AnimatedPressable>
              <Text style={[styles.qtyText, { color: themeColors.textPrimary }]}>{quantity}</Text>
              <AnimatedPressable
                style={[styles.qtyButton, { backgroundColor: themeColors.backgroundSubtle, borderColor: themeColors.border }, quantity >= 10 && styles.qtyButtonDisabled]}
                pressScale={0.90}
                onPress={incrementQty}
                disabled={quantity >= 10}
                accessibilityLabel="Increase quantity"
              >
                <Plus size={14} color={quantity >= 10 ? themeColors.textMuted : themeColors.textPrimary} />
              </AnimatedPressable>
            </View>
          </View>

          {/* Security Assurance Banner */}
          <View style={[styles.trustBanner, { backgroundColor: themeColors.primarySubtle }]}>
            <ShieldCheck size={16} color={themeColors.primary} />
            <Text style={[styles.trustText, { color: themeColors.primary }]}>
              Purchases require your explicit confirmation before any order is created.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <View style={styles.bottomPriceCol}>
          <Text style={[styles.bottomTotalLabel, { color: themeColors.textSecondary }]}>Total</Text>
          <Text style={[styles.bottomPriceText, { color: themeColors.textPrimary }]}>{formattedTotal}</Text>
        </View>
        <Button
          title="Buy now"
          variant="primary"
          size="lg"
          onPress={handleBuyNow}
          disabled={!inStock}
          style={styles.buyNowBtn}
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
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surfaceSubtle,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  category: {
    ...typography.captionBold,
    color: colors.aiViolet,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.price,
    color: colors.textPrimary,
    fontSize: 22,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.h4,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  specsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
    ...shadows.subtle,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  specLabel: {
    ...typography.secondary,
    color: colors.textSecondary,
  },
  specValue: {
    ...typography.secondaryBold,
    color: colors.textPrimary,
  },
  specDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  quantityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    marginBottom: spacing.xl,
    ...shadows.subtle,
  },
  quantityLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    ...typography.h4,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySubtle,
    padding: spacing.md,
    borderRadius: radius.inputs,
    marginTop: spacing.xs,
  },
  trustText: {
    ...typography.captionMedium,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomTotalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  bottomPriceText: {
    ...typography.price,
    color: colors.textPrimary,
    fontSize: 20,
  },
  buyNowBtn: {
    flex: 1,
    marginLeft: spacing.lg,
    maxWidth: 200,
  },
});
