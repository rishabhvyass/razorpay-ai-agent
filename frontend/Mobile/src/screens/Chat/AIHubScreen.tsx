import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  Bot,
  ChevronRight,
  CircleHelp,
  Mic,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { PulsingRing } from '../../components/motion/PulsingRing';
import { ScalePressable } from '../../components/motion/ScalePressable';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { VoiceSearchModal } from '../../components/chat/VoiceSearchModal';
import { RootNavigationProp } from '../../navigation/types';
import { colors, radius, spacing, typography, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';

interface PromptItem {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  query: string;
}

const POPULAR_REQUESTS: PromptItem[] = [
  {
    id: 'hoodie',
    emoji: '🧥',
    title: 'Black Hoodies',
    subtitle: 'Under ₹2,000 with fleece lining',
    query: 'Find me a black hoodie under ₹2,000',
  },
  {
    id: 'shoes',
    emoji: '👟',
    title: 'Running Shoes',
    subtitle: 'High performance under ₹3,500',
    query: 'Can you recommend running shoes under ₹3,500?',
  },
  {
    id: 'track',
    emoji: '📦',
    title: 'Track Orders',
    subtitle: 'Check real-time delivery status',
    query: 'Track my recent orders',
  },
  {
    id: 'audio',
    emoji: '🎧',
    title: 'Studio Earbuds',
    subtitle: 'Active noise cancelling wireless',
    query: 'Show wireless earbuds with noise cancellation',
  },
];

export function AIHubScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const [isVoiceOpen, setVoiceOpen] = useState(false);
  const themeColors = useThemeColors();

  const handleOpenChat = (query?: string) => {
    (navigation as any).navigate('MainTabs', {
      screen: 'AITab',
      params: { initialQuery: query },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Top Navigation Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.borderSubtle }]}>
        <View style={[styles.avatarBadge, { backgroundColor: themeColors.primary }]}>
          <CircleHelp size={18} color="#FFFFFF" strokeWidth={2.4} />
        </View>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Checkout Concierge</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
            <Text style={[styles.dotSeparator, { color: themeColors.textMuted }]}>•</Text>
            <View style={[styles.testBadge, { backgroundColor: themeColors.testModeBg, borderColor: themeColors.testModeBorder }]}>
              <Text style={[styles.testBadgeText, { color: themeColors.testModeText }]}>TEST MODE</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.voiceHeaderButton, { backgroundColor: themeColors.surfaceSubtle }]}
          onPress={() => setVoiceOpen(true)}
          activeOpacity={0.75}
          accessibilityLabel="Open voice search"
        >
          <Mic size={18} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Clean Hero Card with AI Glow */}
        <SlideUpView distance={8} duration={motion.duration.fast}>
          <View style={[styles.heroCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.avatarGlowContainer}>
              <PulsingRing size={64} color={themeColors.primarySubtle} maxScale={1.12}>
                <View style={[styles.heroAvatar, { backgroundColor: themeColors.primary }]}>
                  <Sparkles size={24} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              </PulsingRing>
            </View>

            <Text style={[styles.heroHeading, { color: themeColors.textPrimary }]}>How can I help you today?</Text>
            <Text style={[styles.heroSubheading, { color: themeColors.textSecondary }]}>
              Search products, compare options, and generate secure checkout links.
            </Text>
          </View>
        </SlideUpView>

        {/* Clean "Ask Concierge" Search Bar */}
        <SlideUpView distance={12} delay={40} duration={motion.duration.normal}>
          <ScalePressable
            pressedScale={motion.scale.buttonPress}
            onPress={() => handleOpenChat()}
            style={[styles.searchBarContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
          >
            <TouchableOpacity
              style={[styles.micCircle, { backgroundColor: themeColors.surfaceSubtle }]}
              onPress={() => setVoiceOpen(true)}
              activeOpacity={0.7}
            >
              <Mic size={17} color={themeColors.primary} />
            </TouchableOpacity>

            <Text style={[styles.searchPlaceholder, { color: themeColors.textMuted }]}>Ask Concierge anything...</Text>

            <View style={[styles.sendArrowCircle, { backgroundColor: themeColors.primary }]}>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.6} />
            </View>
          </ScalePressable>
        </SlideUpView>

        {/* Popular Requests Section */}
        <SlideUpView distance={14} delay={80} duration={motion.duration.normal}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Popular Requests</Text>
            <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>Tap any prompt to start chat</Text>
          </View>

          <View style={styles.requestsList}>
            {POPULAR_REQUESTS.map((item, index) => {
              const delay = Math.min(index * 40, 140);
              return (
                <SlideUpView
                  key={item.id}
                  distance={10}
                  delay={delay}
                  duration={motion.duration.fast}
                >
                  <ScalePressable
                    pressedScale={motion.scale.cardPress}
                    style={[styles.requestCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                    onPress={() => handleOpenChat(item.query)}
                  >
                    <View style={[styles.emojiBadge, { backgroundColor: themeColors.surfaceSubtle }]}>
                      <Text style={styles.emojiText}>{item.emoji}</Text>
                    </View>

                    <View style={styles.cardTextContainer}>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>

                    <ChevronRight size={18} color={themeColors.textTertiary} />
                  </ScalePressable>
                </SlideUpView>
              );
            })}
          </View>
        </SlideUpView>

        {/* Features & Guardrails Section */}
        <SlideUpView distance={16} delay={120} duration={motion.duration.normal}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Autonomous Guardrails</Text>
          </View>

          <Card variant="outlined" style={styles.guardrailCard}>
            <View style={styles.guardrailRow}>
              <View style={[styles.guardrailIconBadge, { backgroundColor: themeColors.primarySubtle }]}>
                <Zap size={15} color={themeColors.primary} />
              </View>
              <View style={styles.guardrailTextContainer}>
                <Text style={[styles.guardrailTitle, { color: themeColors.textPrimary }]}>Live Database Catalog</Text>
                <Text style={[styles.guardrailDesc, { color: themeColors.textSecondary }]}>
                  Queries real-time product stock, prices, and variants.
                </Text>
              </View>
            </View>

            <View style={[styles.guardrailDivider, { backgroundColor: themeColors.borderSubtle }]} />

            <View style={styles.guardrailRow}>
              <View style={[styles.guardrailIconBadge, { backgroundColor: themeColors.primarySubtle }]}>
                <Shield size={15} color={themeColors.primary} />
              </View>
              <View style={styles.guardrailTextContainer}>
                <Text style={[styles.guardrailTitle, { color: themeColors.textPrimary }]}>Razorpay Money Action Gate</Text>
                <Text style={[styles.guardrailDesc, { color: themeColors.textSecondary }]}>
                  No payments are initiated without explicit human approval.
                </Text>
              </View>
            </View>
          </Card>
        </SlideUpView>

        {/* Start Chat CTA Button */}
        <SlideUpView distance={18} delay={150} duration={motion.duration.normal}>
          <Button
            title="Start Chat with Concierge"
            variant="primary"
            size="lg"
            onPress={() => handleOpenChat()}
            leftIcon={<Bot size={18} color="#FFFFFF" />}
            style={styles.chatButton}
          />
        </SlideUpView>
      </ScrollView>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        visible={isVoiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmitQuery={(query) => handleOpenChat(query)}
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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  avatarBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  onlineText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.successText,
    fontWeight: '600',
  },
  dotSeparator: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginHorizontal: 4,
  },
  testBadge: {
    backgroundColor: colors.testModeBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  testBadgeText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.testModeText,
    letterSpacing: 0.5,
  },
  voiceHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110, // clean breathing room for floating tab bar
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarGlowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroHeading: {
    ...typography.h2,
    fontSize: 19,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  heroSubheading: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 8,
    height: 50,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  micCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 10,
    fontWeight: '500',
  },
  sendArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: spacing.xs + 2,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  requestsList: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  emojiBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 20,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  guardrailCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  guardrailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardrailIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  guardrailTextContainer: {
    flex: 1,
  },
  guardrailTitle: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  guardrailDesc: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  guardrailDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 8,
  },
  chatButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 50,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
});
