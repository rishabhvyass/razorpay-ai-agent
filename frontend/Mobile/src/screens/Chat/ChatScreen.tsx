import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowUpRight, Compass, Sparkles, Tag } from 'lucide-react-native';
import { AgentActivity } from '../../components/agent/AgentActivity';
import { AIMessage } from '../../components/chat/AIMessage';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { MessageInput } from '../../components/chat/MessageInput';
import { ThinkingIndicator } from '../../components/chat/ThinkingIndicator';
import { UserMessage } from '../../components/chat/UserMessage';
import { VoiceSearchModal } from '../../components/chat/VoiceSearchModal';
import { SlideUpView } from '../../components/motion/SlideUpView';
import { useChat } from '../../hooks/useChat';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { ChatMessage, Product } from '../../types';

type ChatRouteProp = RouteProp<
  {
    AITab?: { initialQuery?: string };
    Chat?: { initialQuery?: string };
  },
  'AITab' | 'Chat'
>;

const PROMPT_SUGGESTIONS = [
  {
    label: 'Black hoodie under ₹2,000',
    tag: 'Trending',
    highlight: true,
  },
  {
    label: 'Running shoes under ₹3,500',
    tag: 'Footwear',
    highlight: false,
  },
  {
    label: 'Find a gift under ₹2,500',
    tag: 'Curated',
    highlight: false,
  },
  {
    label: 'Show me electronics',
    tag: 'Catalog',
    highlight: false,
  },
];

export function ChatScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const [isVoiceOpen, setVoiceOpen] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const {
    messages,
    isLoading,
    isThinking,
    agentActions,
    sendMessage,
  } = useChat();

  const isStackScreen = route.name === 'Chat';
  const canGoBack = navigation.canGoBack() && isStackScreen;

  const handledQueryRef = useRef<string | null>(null);

  // Handle initialQuery if passed from other screens (strictly once per query value)
  useEffect(() => {
    const query = route.params?.initialQuery;
    if (query && handledQueryRef.current !== query) {
      handledQueryRef.current = query;
      sendMessage(query);
    }
  }, [route.params?.initialQuery, sendMessage]);

  const handleBuyProduct = (product: Product) => {
    navigation.navigate('PurchaseConfirmation', { product, quantity: 1 });
  };

  const handleViewDetails = (product: Product) => {
    navigation.navigate('ProductDetails', { productId: product.id });
  };

  const handleGoToProducts = () => {
    (navigation as any).navigate('MainTabs', { screen: 'ProductsTab' });
  };

  const handleGoToOrders = () => {
    (navigation as any).navigate('MainTabs', { screen: 'OrdersTab' });
  };

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (hasMessages) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isThinking, hasMessages]);

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return <UserMessage message={item} />;
    }
    return (
      <AIMessage
        message={item}
        onBuyProduct={handleBuyProduct}
        onViewDetails={handleViewDetails}
      />
    );
  };

  const themeColors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Minimal Header */}
      <ChatHeader
        onBackPress={canGoBack ? () => navigation.goBack() : undefined}
        onSearchPress={() => setVoiceOpen(true)}
        onProductsPress={handleGoToProducts}
        onOrdersPress={handleGoToOrders}
      />

      {/* Main Container with Keyboard Avoiding */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {!hasMessages ? (
          /* Editorial Concierge Briefing Board Empty State */
          <View style={styles.emptyScrollWrapper}>
            <SlideUpView distance={16} duration={300} style={styles.emptyContainer}>
              <View style={[styles.aiBadge, { backgroundColor: themeColors.primarySubtle, borderColor: themeColors.testModeBorder }]}>
                <Sparkles size={14} color={themeColors.primary} />
                <Text style={[styles.aiBadgeText, { color: themeColors.primary }]}>AI COMMERCE CONCIERGE</Text>
              </View>

              <Text style={[styles.heroHeadline, { color: themeColors.textPrimary }]}>Shop by simply asking.</Text>
              <Text style={[styles.supportingCopy, { color: themeColors.textSecondary }]}>
                Tell me what you're looking for. I'll help you discover, compare and securely purchase it.
              </Text>

              {/* Curated Inquiries Grid */}
              <View style={styles.promptsContainer}>
                {PROMPT_SUGGESTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.promptPill,
                      { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                      item.highlight && { backgroundColor: themeColors.primarySubtle, borderColor: themeColors.testModeBorder },
                    ]}
                    onPress={() => sendMessage(item.label)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.promptLeft}>
                      <View style={[styles.tagBadge, { backgroundColor: themeColors.backgroundSubtle }, item.highlight && { backgroundColor: themeColors.surface }]}>
                        <Text style={[styles.tagText, { color: themeColors.textSecondary }, item.highlight && { color: themeColors.primary }]}>
                          {item.tag}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.promptLabel,
                          { color: themeColors.textPrimary },
                          item.highlight && styles.promptLabelHighlight,
                        ]}
                        numberOfLines={1}
                      >
                        "{item.label}"
                      </Text>
                    </View>
                    <ArrowUpRight
                      size={15}
                      color={item.highlight ? themeColors.primary : themeColors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </SlideUpView>
          </View>
        ) : (
          /* FlatList Message Stream for peak scroll performance */
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampText}>Today</Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footerContainer}>
                {isThinking ? <ThinkingIndicator /> : null}
                {agentActions && agentActions.length > 0 ? (
                  <AgentActivity actions={agentActions} isThinking={isThinking} />
                ) : null}
              </View>
            }
          />
        )}

        {/* Capsule Input Docked Cleanly with Zero Clearance */}
        <MessageInput
          onSendMessage={(t) => sendMessage(t)}
          isLoading={isLoading}
          onMicPress={() => setVoiceOpen(true)}
          floatingTabBarOffset={false}
        />
      </KeyboardAvoidingView>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        visible={isVoiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSubmitQuery={(query) => sendMessage(query)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  emptyScrollWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 6,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.testModeBorder,
  },
  aiBadgeText: {
    ...typography.captionBold,
    color: colors.aiViolet,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  heroHeadline: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontSize: 32,
    lineHeight: 38,
  },
  supportingCopy: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  promptsContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  promptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.inputs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  promptPillHighlight: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.testModeBorder,
  },
  promptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  tagBadge: {
    backgroundColor: colors.backgroundSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.small,
  },
  tagBadgeHighlight: {
    backgroundColor: colors.surface,
  },
  tagText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  tagTextHighlight: {
    color: colors.aiViolet,
  },
  promptLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  promptLabelHighlight: {
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: 24,
  },
  timestampContainer: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  timestampText: {
    ...typography.captionMedium,
    color: colors.textMuted,
    backgroundColor: colors.backgroundSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    fontSize: 11,
  },
  footerContainer: {
    marginTop: spacing.xs,
  },
});
