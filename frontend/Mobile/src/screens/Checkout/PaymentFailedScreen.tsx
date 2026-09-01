import React, { useEffect } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Check, X } from 'lucide-react-native';
import { Button } from '../../components/common/Button';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useOrder } from '../../hooks/useOrder';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { formatMinorUnits } from '../../utils/currency';

type PaymentFailedRouteProp = RouteProp<RootStackParamList, 'PaymentFailed'>;

export function PaymentFailedScreen() {
  const route = useRoute<PaymentFailedRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { orderId, product } = route.params;

  const { order } = useOrder(orderId);

  useEffect(() => {
    if (orderId) {
      useOrderStore.getState().updateOrderStatus(orderId, 'PAYMENT_FAILED');
      if (product) {
        useOrderStore.getState().addOrder({
          id: orderId,
          productId: product.id,
          amount: product.price * (order?.quantity ?? 1),
          amountFormatted: formatMinorUnits(product.price * (order?.quantity ?? 1), product.currency),
          currency: product.currency,
          status: 'PAYMENT_FAILED',
          quantity: order?.quantity ?? 1,
          product,
          createdAt: order?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [orderId, product, order?.quantity, order?.createdAt]);

  const handleTryAgain = () => {
    if (product) {
      navigation.replace('Payment', { orderId, product });
    } else {
      navigation.navigate('MainTabs', { screen: 'AITab' });
    }
  };

  const handleCancel = () => {
    navigation.navigate('MainTabs', { screen: 'AITab' });
  };

  const themeColors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calm Non-Punishing Failure Hero */}
        <SlideUpView distance={14} duration={300} style={styles.heroSection}>
          <View style={[styles.iconCircle, { backgroundColor: themeColors.dangerBg }]}>
            <X size={26} color={themeColors.danger} strokeWidth={2.5} />
          </View>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Payment wasn't completed</Text>
          <Text style={[styles.message, { color: themeColors.textSecondary }]}>
            No successful payment was verified by Razorpay.
          </Text>
        </SlideUpView>

        {/* 3-Step Verification Timeline */}
        <SlideUpView distance={16} delay={80} duration={240} style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.stepItem}>
            <View style={styles.checkDot}>
              <Check size={11} color={colors.success} strokeWidth={3} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themeColors.textPrimary }]}>Order created</Text>
              <Text style={[styles.stepDesc, { color: themeColors.textSecondary }]}>Server validated pricing & draft ID</Text>
            </View>
          </View>

          <View style={[styles.line, { backgroundColor: themeColors.borderSubtle }]} />

          <View style={styles.stepItem}>
            <View style={styles.checkDot}>
              <Check size={11} color={colors.success} strokeWidth={3} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themeColors.textPrimary }]}>Payment initiated</Text>
              <Text style={[styles.stepDesc, { color: themeColors.textSecondary }]}>Razorpay checkout session generated</Text>
            </View>
          </View>

          <View style={[styles.line, { backgroundColor: themeColors.borderSubtle }]} />

          <View style={styles.stepItem}>
            <View style={[styles.failDot, { backgroundColor: themeColors.dangerBg }]}>
              <X size={11} color={themeColors.danger} strokeWidth={2.5} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitleFail, { color: themeColors.danger }]}>Payment not verified</Text>
              <Text style={[styles.stepDesc, { color: themeColors.textSecondary }]}>No signature received or checkout was cancelled</Text>
            </View>
          </View>
        </SlideUpView>
      </ScrollView>

      {/* Action Footer: [Try again] [Cancel order] */}
      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <Button
          title="Try again"
          variant="primary"
          size="lg"
          onPress={handleTryAgain}
        />
        <Button
          title="Cancel order"
          variant="outline"
          size="lg"
          onPress={handleCancel}
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
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xxxl,
    paddingBottom: 140,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 22,
    marginBottom: 6,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPaddingLarge,
    ...shadows.subtle,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  failDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  line: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 10,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  stepTitleFail: {
    ...typography.bodyMedium,
    color: colors.dangerText,
    fontSize: 14,
    fontWeight: '700',
  },
  stepDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
});
