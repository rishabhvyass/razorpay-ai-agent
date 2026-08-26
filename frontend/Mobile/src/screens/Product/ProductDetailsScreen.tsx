import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react-native';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ErrorState } from '../../components/common/ErrorState';
import { Loading } from '../../components/common/Loading';
import { PriceDisplay } from '../../components/products/PriceDisplay';
import { ProductImage } from '../../components/products/ProductImage';
import { useProduct } from '../../hooks/useProducts';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useCheckoutStore } from '../../store/checkoutStore';
import { colors, radius, spacing, typography } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';

type ProductDetailsRouteProp = RouteProp<RootStackParamList, 'ProductDetails'>;

export function ProductDetailsScreen() {
  const route = useRoute<ProductDetailsRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { productId } = route.params;
  const { data: product, isLoading, isError, error, refetch } = useProduct(productId);
  const { selectProductForCheckout } = useCheckoutStore();

  const [quantity, setQuantity] = useState(1);

  const incrementQty = () => {
    if (quantity < (product?.stock ?? 10) && quantity < 10) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    selectProductForCheckout(product, quantity);
    navigation.navigate('PurchaseConfirmation', { product, quantity });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading message="Loading product details..." style={styles.centerLoading} />
      </SafeAreaView>
    );
  }

  if (isError || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState
          title="Product not found"
          message={(error as Error)?.message || 'Unable to load product details from server.'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const totalMinor = product.price * quantity;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Large Product Image */}
        <View style={styles.imageContainer}>
          <ProductImage
            uri={product.imageUrl}
            width={320}
            height={260}
            style={styles.heroImage}
          />
        </View>

        {/* Metadata & Title */}
        <View style={styles.infoCard}>
          <View style={styles.metaRow}>
            {product.category ? (
              <Badge label={product.category.toUpperCase()} variant="info" size="sm" />
            ) : null}
            <Badge
              label={product.inStock ? 'In stock' : 'Out of stock'}
              variant={product.inStock ? 'success' : 'danger'}
              size="sm"
            />
          </View>

          <Text style={styles.productTitle}>{product.name}</Text>

          <View style={styles.priceContainer}>
            <PriceDisplay amountMinor={product.price} currency={product.currency} size="lg" />
            <Text style={styles.taxInclusive}>Inclusive of all taxes</Text>
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {product.description || 'No description available for this item.'}
            </Text>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                onPress={decrementQty}
                disabled={quantity <= 1}
                style={[styles.stepperButton, quantity <= 1 && styles.stepperDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Minus size={16} color={quantity <= 1 ? colors.textMuted : colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                onPress={incrementQty}
                disabled={quantity >= 10 || !product.inStock}
                style={[
                  styles.stepperButton,
                  (quantity >= 10 || !product.inStock) && styles.stepperDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Plus
                  size={16}
                  color={quantity >= 10 || !product.inStock ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatMinorUnits(totalMinor, product.currency)}</Text>
        </View>
        <Button
          title="Buy now"
          variant="primary"
          size="lg"
          disabled={!product.inStock}
          onPress={handleBuyNow}
          style={styles.buyButton}
          leftIcon={<ShoppingBag size={18} color={colors.textInverse} />}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  heroImage: {
    borderRadius: radius.lg,
  },
  infoCard: {
    padding: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  productTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  priceContainer: {
    marginBottom: spacing.lg,
  },
  taxInclusive: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  descSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs + 2,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  quantitySection: {
    marginBottom: spacing.lg,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    padding: 4,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: {
    opacity: 0.4,
  },
  quantityValue: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalBox: {
    flex: 1,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalValue: {
    ...typography.h3,
    color: colors.accent,
    fontSize: 18,
  },
  buyButton: {
    flex: 1.2,
  },
});
