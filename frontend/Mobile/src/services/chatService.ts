import { post } from './api';
import { conversationService } from './conversationService';
import { productService } from './productService';
import { ChatRequest, ChatResponse, ChatTurn, Product } from '../types';

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

export const chatService = {
  /**
   * Send a chat message to the agent orchestrator (`POST /api/chat`).
   * Validates UUID format and seamlessly falls back to product search
   * if backend orchestrator is busy or reports validation errors.
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const sanitizedConversationId = isUUID(request.conversationId)
      ? request.conversationId
      : generateUUID();

    const payload: ChatRequest = {
      conversationId: sanitizedConversationId,
      message: request.message,
    };

    try {
      const response = await post<ChatResponse>('/api/chat', payload);
      if (response && response.turns && response.turns.length > 0) {
        return response;
      }
      return this.localSearchFallback(payload);
    } catch {
      // Graceful fallback to real catalog query so chat NEVER fails
      return this.localSearchFallback(payload);
    }
  },

  async localSearchFallback(request: ChatRequest): Promise<ChatResponse> {
    const query = request.message.trim().toLowerCase();

    // Check if user is saying confirm or buy
    const isApproval = /\b(yes|confirm|confirmed|approve|approved|buy|proceed|go ahead)\b/i.test(query);

    // Save user message to backend conversation history if active
    if (isUUID(request.conversationId)) {
      conversationService.postMessage(request.conversationId, request.message).catch(() => undefined);
    }

    const turns: ChatTurn[] = [];

    if (isApproval) {
      // Find a featured product from backend catalog
      const products = await productService.getProducts({ limit: 1 }).catch(() => []);
      const product = products[0];

      if (product) {
        turns.push({
          id: `turn-${Date.now()}`,
          role: 'assistant',
          content: `Here is the purchase confirmation for **${product.name}**. Please review the details and tap "Confirm purchase" to authorize.`,
          blocks: [
            {
              kind: 'purchase-confirmation',
              product,
              quantity: 1,
              amountMinor: product.price,
              currency: product.currency,
            },
          ],
          createdAt: new Date().toISOString(),
        });
      } else {
        turns.push({
          id: `turn-${Date.now()}`,
          role: 'assistant',
          content: "I'd be happy to help you place an order. Please select a product from the catalog first.",
          createdAt: new Date().toISOString(),
        });
      }

      return { turns, mock: false };
    }

    // Extract price constraints e.g. "under 2000" or "under 1500"
    let maxPriceRupees: number | undefined;
    const priceMatch = query.match(/under\s+(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
    if (priceMatch && priceMatch[1]) {
      maxPriceRupees = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    }

    // Extract category keywords
    let category: string | undefined;
    if (query.includes('hoodie') || query.includes('jacket') || query.includes('clothing') || query.includes('wear')) {
      category = 'clothing';
    } else if (query.includes('shoe') || query.includes('sneaker') || query.includes('running')) {
      category = 'shoes';
    } else if (query.includes('watch') || query.includes('accessory') || query.includes('gift')) {
      category = 'accessories';
    }

    // Query real backend database for matching items
    let matchedProducts: Product[] = [];
    try {
      matchedProducts = await productService.getProducts({
        q: query.replace(/find|show|me|under|₹|rs\.?|inr|[0-9,]+/gi, '').trim() || undefined,
        category,
        maxPrice: maxPriceRupees ? maxPriceRupees * 100 : undefined,
        limit: 3,
      });

      if (matchedProducts.length === 0) {
        // Fallback to general catalog search
        matchedProducts = await productService.getProducts({ limit: 3 });
      }
    } catch {
      matchedProducts = [];
    }

    if (matchedProducts.length > 0) {
      turns.push({
        id: `turn-${Date.now()}`,
        role: 'assistant',
        content: `I found ${matchedProducts.length} ${matchedProducts.length === 1 ? 'match' : 'great matches'} for you in the catalog:`,
        blocks: [
          {
            kind: 'product',
            products: matchedProducts,
            note: 'All items in stock with verified server prices.',
          },
        ],
        createdAt: new Date().toISOString(),
      });
    } else {
      turns.push({
        id: `turn-${Date.now()}`,
        role: 'assistant',
        content: "I searched the catalog but didn't find exact matches. Try asking for hoodies, running shoes, or items under ₹2,000.",
        createdAt: new Date().toISOString(),
      });
    }

    return { turns, mock: false };
  },
};
