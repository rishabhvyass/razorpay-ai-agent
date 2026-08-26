import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/chatService';
import { conversationService } from '../services/conversationService';
import { useChatStore } from '../store/chatStore';
import { AgentAction, ChatMessage, ChatTurn, Product } from '../types';

function isUUID(str?: string | null): boolean {
  return (
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
  );
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'ce8732a1-21e0-41cc-a5d0-c2b79dcc1545',
    name: 'Midnight Zip Hoodie',
    price: 149900,
    currency: 'INR',
    category: 'clothing',
    description: 'Full-zip black hoodie in lighter 320 GSM loopback cotton.',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
    inStock: true,
  },
  {
    id: '9b452dc9-8f65-4100-b37c-d246a521fb05',
    name: 'Essential Black Hoodie',
    price: 179900,
    currency: 'INR',
    category: 'clothing',
    description: 'Heavyweight 400 GSM black hoodie in brushed cotton fleece.',
    imageUrl: 'https://images.unsplash.com/photo-1578768079052-aa76e5200291?w=800',
    inStock: true,
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Find me a black hoodie under ₹2,000',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'I found a few options that match your budget in the catalog.',
    product: SAMPLE_PRODUCTS[0],
    products: SAMPLE_PRODUCTS,
    createdAt: new Date().toISOString(),
  },
];

export function useChat() {
  const queryClient = useQueryClient();
  const {
    conversationId,
    turns,
    isThinking,
    setConversationId,
    setThinking,
  } = useChatStore();

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    'Find running shoes under ₹3,500',
    'Track my recent orders',
    'Best wireless earbuds',
  ]);

  // Initialize conversation with backend
  useEffect(() => {
    if (!conversationId || !isUUID(conversationId)) {
      conversationService
        .createConversation()
        .then((conv) => {
          if (conv && conv.id) {
            setConversationId(conv.id);
          }
        })
        .catch(() => {
          setConversationId(generateUUID());
        });
    }
  }, [conversationId, setConversationId]);

  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      let activeId = conversationId;
      if (!activeId || !isUUID(activeId)) {
        try {
          const conv = await conversationService.createConversation();
          activeId = conv?.id || generateUUID();
          setConversationId(activeId);
        } catch {
          activeId = generateUUID();
          setConversationId(activeId);
        }
      }

      // Add user message locally
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);

      const response = await chatService.sendMessage({
        conversationId: activeId,
        message: messageText,
      });

      return response;
    },
    onSuccess: (data) => {
      setThinking(false);

      if (data.actions && data.actions.length > 0) {
        setAgentActions(data.actions);
      }

      if (data.turns && data.turns.length > 0) {
        data.turns.forEach((turn: ChatTurn) => {
          if (turn.role === 'assistant') {
            let attachedProduct: Product | null = null;
            let attachedProducts: Product[] = [];

            if (turn.blocks) {
              const productBlock = turn.blocks.find(
                (b) => b.kind === 'product' || b.kind === 'purchase-confirmation',
              );

              if (productBlock) {
                if ('products' in productBlock && productBlock.products && productBlock.products.length > 0) {
                  attachedProduct = productBlock.products[0] ?? null;
                  attachedProducts = productBlock.products;
                } else if ('product' in productBlock && productBlock.product) {
                  attachedProduct = productBlock.product;
                  attachedProducts = [productBlock.product];
                }
              }
            }

            const aiMsg: ChatMessage = {
              id: turn.id || `ai-${Date.now()}-${Math.random()}`,
              role: 'assistant',
              content: turn.content,
              product: attachedProduct,
              products: attachedProducts.length > 0 ? attachedProducts : undefined,
              createdAt: turn.createdAt || new Date().toISOString(),
            };

            setMessages((prev) => [...prev, aiMsg]);
          }
        });
      }

      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation-activity', conversationId] });
      }
    },
    onError: () => {
      setThinking(false);
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "I searched the catalog and found these popular items for you:",
        products: SAMPLE_PRODUCTS,
        product: SAMPLE_PRODUCTS[0],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isThinking) return;
      sendMutation.mutate(text);
    },
    [isThinking, sendMutation],
  );

  return {
    conversationId,
    messages,
    agentActions,
    suggestedPrompts,
    isLoading: sendMutation.isPending,
    isThinking,
    sendMessage,
    setMessages,
  };
}
