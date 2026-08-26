import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AgentActivity } from '../../components/agent/AgentActivity';
import { AIMessage } from '../../components/chat/AIMessage';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { MessageInput } from '../../components/chat/MessageInput';
import { SuggestedPrompt } from '../../components/chat/SuggestedPrompt';
import { ThinkingIndicator } from '../../components/chat/ThinkingIndicator';
import { UserMessage } from '../../components/chat/UserMessage';
import { VoiceSearchModal } from '../../components/chat/VoiceSearchModal';
import { useChat } from '../../hooks/useChat';
import { RootNavigationProp, RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { Product } from '../../types';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export function ChatScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const [isVoiceOpen, setVoiceOpen] = useState(false);

  const {
    messages,
    isLoading,
    isThinking,
    agentActions,
    suggestedPrompts,
    sendMessage,
  } = useChat();

  const isStackScreen = route.name === 'Chat';
  const canGoBack = navigation.canGoBack() && isStackScreen;

  // Handle initialQuery if passed from other screens
  useEffect(() => {
    if (route.params?.initialQuery) {
      sendMessage(route.params.initialQuery);
    }
  }, [route.params?.initialQuery, sendMessage]);

  const handleBuyProduct = (product: Product) => {
    navigation.navigate('PurchaseConfirmation', { product, quantity: 1 });
  };

  const handleViewDetails = (product: Product) => {
    navigation.navigate('ProductDetails', { productId: product.id });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top App Header */}
      <ChatHeader
        onBackPress={canGoBack ? () => navigation.goBack() : undefined}
        onSearchPress={() => setVoiceOpen(true)}
      />

      {/* Main Chat Scrollable Feed */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Timestamp Header */}
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>Today, 8:40 PM</Text>
          </View>

          {/* Chat Messages */}
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return <UserMessage key={msg.id} message={msg} />;
            }
            return (
              <AIMessage
                key={msg.id}
                message={msg}
                onBuyProduct={handleBuyProduct}
                onViewDetails={handleViewDetails}
              />
            );
          })}

          {/* Thinking State */}
          {isThinking ? <ThinkingIndicator /> : null}

          {/* Inline Agent Activity Accordion */}
          {agentActions && agentActions.length > 0 ? (
            <AgentActivity actions={agentActions} isThinking={isThinking} />
          ) : null}

          {/* Suggested Prompts */}
          {suggestedPrompts && suggestedPrompts.length > 0 ? (
            <SuggestedPrompt
              prompts={suggestedPrompts}
              onSelectPrompt={(p) => sendMessage(p)}
            />
          ) : null}
        </ScrollView>

        {/* Input Bar */}
        <MessageInput
          onSendMessage={(t) => sendMessage(t)}
          isLoading={isLoading}
          onMicPress={() => setVoiceOpen(true)}
          floatingTabBarOffset={!isStackScreen}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  timestampContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timestampText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
  },
});
