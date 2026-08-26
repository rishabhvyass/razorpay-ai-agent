import React, { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { ChatMessage, Product, SUGGESTED_PROMPTS } from '../../types';
import { AIMessage } from './AIMessage';
import { SuggestedPrompt } from './SuggestedPrompt';
import { ThinkingIndicator } from './ThinkingIndicator';
import { UserMessage } from './UserMessage';

export interface MessageListProps {
  messages: ChatMessage[];
  isThinking?: boolean;
  onSelectPrompt: (prompt: string) => void;
  onViewDetails?: (product: Product) => void;
  onBuyProduct?: (product: Product) => void;
}

export function MessageList({
  messages,
  isThinking = false,
  onSelectPrompt,
  onViewDetails,
  onBuyProduct,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyHeroIcon}>
        <Sparkles size={36} color={colors.accentPurple} />
      </View>
      <Text style={styles.emptyTitle}>Your AI Shopping Assistant</Text>
      <Text style={styles.emptySubtitle}>
        Tell me what you are looking for and I will find verified matches and guide you through secure checkout.
      </Text>
      <SuggestedPrompt
        prompts={SUGGESTED_PROMPTS}
        onSelectPrompt={onSelectPrompt}
      />
    </View>
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmptyState}
      renderItem={({ item }) =>
        item.role === 'user' ? (
          <UserMessage message={item} />
        ) : (
          <AIMessage
            message={item}
            onBuyProduct={onBuyProduct}
            onViewDetails={onViewDetails}
          />
        )
      }
      ListFooterComponent={isThinking ? <ThinkingIndicator /> : <View style={styles.footerSpacer} />}
      onContentSizeChange={() => {
        if (messages.length > 0) {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  footerSpacer: {
    height: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  emptyHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
});
