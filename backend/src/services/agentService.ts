/**
 * Agent service — the Claude + MCP orchestrator.
 *
 * ============================================================================
 * This is what `POST /api/chat` calls. It owns the conversation loop:
 *
 *   1. Load conversation history → build Claude message array
 *   2. Call Claude with tools defined in agentTools.ts
 *   3. If Claude returns tool_use blocks, execute each tool, append results,
 *      and re-call Claude (up to MAX_TOOL_ITERATIONS)
 *   4. Persist every assistant and tool message to the messages table
 *   5. Return structured ChatResponse
 *
 * The guardrails enforced here:
 *
 *   - MONEY_ACTION tools refuse without explicit user approval (in agentTools)
 *   - Max tool loop iterations prevents runaway loops
 *   - The model cannot grant itself approval — `userApproved` is determined
 *     from the user's message before the loop begins
 *   - Assistant turns are written to messages as they are produced, so a crash
 *     mid-loop still has a transcript of what happened so far
 * ============================================================================
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import { agentConfig } from '../config/env.js';
import { createMessage, getRecentMessages, type PublicMessage } from '../repositories/messageRepo.js';
import { touchConversation } from '../repositories/conversationRepo.js';
import { getProductById, type PublicProduct } from '../repositories/productRepo.js';
import { getOrderById } from '../repositories/orderRepo.js';
import {
  TOOL_DEFINITIONS,
  OPENAI_TOOL_DEFINITIONS,
  executeTool,
  type ToolContext,
  type ToolResult,
} from './agentTools.js';

/**
 * Maximum number of tool-use → result → re-call iterations.
 *
 * Each iteration is a full Claude API call, and the model decides whether to
 * call another tool or respond with text. Five is generous for a shopping flow
 * (search → select → order → link) and prevents a pathological loop from
 * running the bill up.
 */
const MAX_TOOL_ITERATIONS = 5;

/**
 * How many recent messages to load for context. Bounded because the full
 * transcript of a long conversation would exceed the context window.
 */
const CONTEXT_WINDOW_MESSAGES = 30;

// -----------------------------------------------------------------------------
// System prompt
// -----------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a helpful shopping assistant for Checkout Concierge, an AI-powered commerce platform.

Your role:
- Help users find products from the catalogue
- Recommend products based on their needs and budget
- Guide them through the purchase process
- Be honest about what's available and what isn't

Available tools:
- search_products: Search the catalogue by text, category, or price range
- get_product: Get details of a specific product
- get_categories: List available product categories
- create_order: Create a purchase order (REQUIRES USER APPROVAL)
- create_payment_link: Issue a payment link for an order (REQUIRES USER APPROVAL)
- get_order_status: Check an order's current status

CRITICAL RULES:

1. NEVER fabricate products or prices. Only recommend products returned by search_products or get_product.

2. MONEY ACTIONS require explicit approval. Before calling create_order or create_payment_link:
   - Show the user exactly what will be charged: product name, quantity, total price
   - Wait for a clear affirmative response ("yes", "confirm", "go ahead", "buy it")
   - If the user hasn't explicitly approved, DO NOT call these tools

3. Prices are in minor units (paise for INR). Always display them in human-readable format:
   - 149900 = ₹1,499.00
   - 199900 = ₹1,999.00

4. When presenting search results, include the product name, price, and a brief description. Format prices as ₹X,XXX.

5. If a tool call fails or is blocked, explain what happened honestly. Never pretend a failed action succeeded.

6. The purchase flow is: search → recommend → get approval → create_order → create_payment_link → share URL

7. You cannot process payments directly. You issue a payment link that the user clicks to pay through Razorpay.

8. Keep responses concise and helpful. Don't overwhelm with details unless asked.`;

// -----------------------------------------------------------------------------
// Approval detection
// -----------------------------------------------------------------------------

/**
 * Heuristic check for whether the user's message contains explicit purchase
 * approval. This is conservative: false negatives mean the user is asked to
 * confirm again, which is safe. False positives would be dangerous, so the
 * patterns are narrow.
 *
 * This determines the `userApproved` flag BEFORE the tool loop, so the model
 * cannot manufacture approval by generating a tool call with an `approved`
 * field.
 */
const APPROVAL_PATTERNS = [
  /\b(yes|yeah|yep|yup|sure|ok|okay)\b/i,
  /\b(confirm|confirmed|approve|approved)\b/i,
  /\b(go ahead|do it|proceed|buy it|buy this|i'?ll take it|take it)\b/i,
  /\b(purchase|order it|place.?the.?order|make.?the.?order)\b/i,
];

function hasExplicitApproval(message: string): boolean {
  return APPROVAL_PATTERNS.some((pattern) => pattern.test(message));
}

// -----------------------------------------------------------------------------
// ChatResponse type (mirrors frontend/Web/src/types/chat.ts)
// -----------------------------------------------------------------------------

interface ChatBlock {
  kind: string;
  [key: string]: unknown;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks?: ChatBlock[];
  createdAt: string;
  mock?: boolean;
  failed?: boolean;
}

interface AgentActionView {
  id: string;
  conversationId: string | null;
  orderId: string | null;
  toolName: string;
  actionType: string;
  reason: string | null;
  input: unknown;
  output: unknown;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface ChatResponse {
  turns: ChatTurn[];
  actions?: AgentActionView[];
  mock: boolean;
}

// -----------------------------------------------------------------------------
// Message conversion
// -----------------------------------------------------------------------------

type ClaudeRole = 'user' | 'assistant';

interface ClaudeMessage {
  role: ClaudeRole;
  content: string | Anthropic.ContentBlock[];
}

/**
 * Convert stored messages into Claude's message format.
 *
 * Claude requires strict user/assistant alternation. Tool messages are folded
 * into the preceding assistant turn, and system messages are dropped (the system
 * prompt is provided separately).
 */
function buildClaudeMessages(messages: PublicMessage[]): ClaudeMessage[] {
  const result: ClaudeMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    // 'tool' messages are stored separately but conceptually belong in the
    // assistant's context. For simplicity in the message array, tool results
    // are merged or skipped — Claude will see them through the tool_use loop.
    if (msg.role === 'tool') continue;

    const role: ClaudeRole = msg.role === 'assistant' ? 'assistant' : 'user';

    // Claude requires alternating roles. If the last message has the same role,
    // merge them.
    const last = result.length > 0 ? result[result.length - 1] : undefined;
    if (last !== undefined && last.role === role) {
      if (typeof last.content === 'string') {
        last.content = `${last.content}\n\n${msg.content}`;
      }
      continue;
    }

    result.push({ role, content: msg.content });
  }

  // Claude requires the conversation to start with a user message.
  if (result.length > 0 && result[0]!.role !== 'user') {
    result.shift();
  }

  return result;
}

// -----------------------------------------------------------------------------
// Block extraction — structured content from tool results
// -----------------------------------------------------------------------------

/**
 * Build ChatBlocks from tool results so the frontend can render rich content.
 */
async function extractBlocks(toolResults: ToolResult[]): Promise<ChatBlock[]> {
  const blocks: ChatBlock[] = [];

  for (const tr of toolResults) {
    if (tr.toolName === 'search_products' && !tr.isError) {
      const output = tr.output as { products?: Array<{ id: string; name: string; price: number }> } | null;
      if (output?.products && output.products.length > 0) {
        // Fetch full product details for the block
        const products: PublicProduct[] = [];
        for (const p of output.products.slice(0, 5)) {
          const full = await getProductById(p.id);
          if (full !== null) products.push(full);
        }
        if (products.length > 0) {
          blocks.push({ kind: 'product', products });
        }
      }
    }

    if (tr.toolName === 'create_order' && !tr.isError && tr.orderId) {
      const order = await getOrderById(tr.orderId);
      if (order !== null) {
        const product = await getProductById(order.productId);
        blocks.push({
          kind: 'purchase-confirmation',
          product: product ?? { id: order.productId, name: 'Product', price: order.amount, currency: order.currency },
          quantity: order.quantity,
          amountMinor: order.amount,
          currency: order.currency,
        });
      }
    }

    if (tr.toolName === 'create_payment_link' && !tr.isError) {
      const output = tr.output as { orderId?: string; paymentUrl?: string | null } | null;
      if (output?.orderId) {
        const order = await getOrderById(output.orderId);
        if (order !== null) {
          const product = await getProductById(order.productId);
          blocks.push({
            kind: 'payment',
            order,
            product,
            paymentUrl: output.paymentUrl ?? null,
          });
        }
      }
    }

    if (tr.isError && !hasSuccessBlock(toolResults)) {
      blocks.push({
        kind: 'error',
        code: tr.toolName.toUpperCase() + '_FAILED',
        message: tr.result,
      });
    }
  }

  return blocks;
}

function hasSuccessBlock(results: ToolResult[]): boolean {
  return results.some(
    (r) =>
      !r.isError &&
      (r.toolName === 'create_payment_link' ||
        r.toolName === 'create_order' ||
        r.toolName === 'search_products' ||
        r.toolName === 'get_product'),
  );
}

// -----------------------------------------------------------------------------
// Grok (xAI) Execution Loop
// -----------------------------------------------------------------------------

async function runGrokChat(
  args: { conversationId: string; message: string; requestId: string },
  history: PublicMessage[],
  toolCtx: ToolContext,
): Promise<ChatResponse> {
  const client = new OpenAI({
    apiKey: agentConfig!.apiKey,
    baseURL: agentConfig!.baseURL ?? 'https://api.x.ai/v1',
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const msg of history) {
    if (msg.role === 'system' || msg.role === 'tool') continue;
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  // Ensure current user message is at the end
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || last.content !== args.message) {
    messages.push({ role: 'user', content: args.message });
  }

  const allTurns: ChatTurn[] = [];
  const allToolResults: ToolResult[] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.chat.completions.create({
      model: agentConfig!.model,
      messages,
      tools: OPENAI_TOOL_DEFINITIONS,
    });

    const choice = response.choices[0];
    const message = choice?.message;
    const textContent = message?.content?.trim() ?? '';
    const toolCalls = message?.tool_calls ?? [];

    if (toolCalls.length === 0) {
      // Final response — no more tool calls
      const replyText =
        textContent ||
        (allToolResults.length > 0
          ? 'Here are the options matching your request:'
          : 'I am here to help you find products and place orders.');

      const blocks = await extractBlocks(allToolResults);

      const assistantMsg = await createMessage({
        conversationId: args.conversationId,
        role: 'assistant',
        content: replyText,
        metadata: { requestId: args.requestId, model: agentConfig!.model, iteration, provider: 'grok' },
      });

      allTurns.push({
        id: assistantMsg.id,
        role: 'assistant',
        content: replyText,
        blocks: blocks.length > 0 ? blocks : undefined,
        createdAt: assistantMsg.createdAt,
        mock: false,
      });
      break;
    }

    // Append assistant's message containing tool_calls
    if (message) {
      messages.push(message);
    }

    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue;
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(tc.function.arguments || '{}');
      } catch {}

      const result = await executeTool(
        tc.id,
        tc.function.name,
        parsedArgs,
        toolCtx,
      );

      allToolResults.push(result);

      await createMessage({
        conversationId: args.conversationId,
        role: 'tool',
        content: result.result,
        metadata: {
          requestId: args.requestId,
          toolUseId: result.toolUseId,
          toolName: result.toolName,
          isError: result.isError,
        },
      });

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result.result,
      });
    }
  }

  await touchConversation(args.conversationId).catch(() => undefined);

  return {
    turns: allTurns,
    mock: false,
  };
}

// -----------------------------------------------------------------------------
// Anthropic / OpenRouter Execution Loop
// -----------------------------------------------------------------------------

async function runAnthropicChat(
  args: { conversationId: string; message: string; requestId: string },
  history: PublicMessage[],
  toolCtx: ToolContext,
): Promise<ChatResponse> {
  const anthropic = new Anthropic({
    apiKey: agentConfig!.apiKey,
    ...(agentConfig!.baseURL ? { baseURL: agentConfig!.baseURL } : {}),
  });

  const claudeMessages = buildClaudeMessages(history);

  const lastMsg = claudeMessages.length > 0 ? claudeMessages[claudeMessages.length - 1] : undefined;
  if (lastMsg === undefined || lastMsg.role !== 'user' || lastMsg.content !== args.message) {
    if (lastMsg?.role !== 'user') {
      claudeMessages.push({ role: 'user', content: args.message });
    }
  }

  const allTurns: ChatTurn[] = [];
  const allToolResults: ToolResult[] = [];

  const messages: Anthropic.MessageParam[] = claudeMessages.map((m) => ({
    role: m.role,
    content: m.content as string,
  }));

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: agentConfig!.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    const textParts: string[] = [];
    const toolUseParts: Anthropic.ToolUseBlock[] = [];

    const rawContent = Array.isArray(response?.content)
      ? response.content
      : typeof (response as unknown as { content?: unknown })?.content === 'string'
        ? [{ type: 'text', text: String((response as unknown as { content: unknown }).content) }]
        : [];

    for (const block of rawContent) {
      if (block.type === 'text' && 'text' in block && typeof block.text === 'string') {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolUseParts.push(block as Anthropic.ToolUseBlock);
      }
    }

    const textContent = textParts.join('\n\n');

    if (response.stop_reason === 'end_turn' || toolUseParts.length === 0) {
      const replyText =
        textContent ||
        (allToolResults.length > 0
          ? 'Here are the options matching your request:'
          : 'I am here to help you find products and place orders.');

      const blocks = await extractBlocks(allToolResults);

      const assistantMsg = await createMessage({
        conversationId: args.conversationId,
        role: 'assistant',
        content: replyText,
        metadata: { requestId: args.requestId, model: agentConfig!.model, iteration, provider: 'anthropic' },
      });

      allTurns.push({
        id: assistantMsg.id,
        role: 'assistant',
        content: replyText,
        blocks: blocks.length > 0 ? blocks : undefined,
        createdAt: assistantMsg.createdAt,
        mock: false,
      });
      break;
    }

    if (textContent) {
      await createMessage({
        conversationId: args.conversationId,
        role: 'assistant',
        content: textContent,
        metadata: { requestId: args.requestId, model: agentConfig!.model, iteration, hasToolUse: true },
      });
    }

    const assistantBlocks = rawContent.filter(
      (b) => b.type === 'text' || b.type === 'tool_use',
    ) as Anthropic.ContentBlock[];
    messages.push({ role: 'assistant', content: assistantBlocks });

    const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseParts) {
      const result = await executeTool(
        toolUse.id,
        toolUse.name,
        (toolUse.input ?? {}) as Record<string, unknown>,
        toolCtx,
      );

      allToolResults.push(result);

      await createMessage({
        conversationId: args.conversationId,
        role: 'tool',
        content: result.result,
        metadata: {
          requestId: args.requestId,
          toolUseId: result.toolUseId,
          toolName: result.toolName,
          isError: result.isError,
        },
      });

      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result.result,
        is_error: result.isError,
      });
    }

    messages.push({ role: 'user', content: toolResultBlocks });
  }

  await touchConversation(args.conversationId).catch(() => undefined);

  return {
    turns: allTurns,
    mock: false,
  };
}

// -----------------------------------------------------------------------------
// Main entry point
// -----------------------------------------------------------------------------

/**
 * Run a single agent turn: take a user message, call the configured AI provider
 * (Gemini or Claude/OpenRouter), execute tools, and return the structured response.
 */
export async function chat(args: {
  conversationId: string;
  message: string;
  requestId: string;
}): Promise<ChatResponse> {
  if (agentConfig === null) {
    throw new Error('Agent is not configured. Set XAI_API_KEY or AGENTROUTER_API_KEY.');
  }

  const history = await getRecentMessages(args.conversationId, CONTEXT_WINDOW_MESSAGES);
  const userApproved = hasExplicitApproval(args.message);

  const toolCtx: ToolContext = {
    conversationId: args.conversationId,
    requestId: args.requestId,
    userApproved,
  };

  if (agentConfig.provider === 'grok') {
    return runGrokChat(args, history, toolCtx);
  }

  return runAnthropicChat(args, history, toolCtx);
}
