/**
 * Agent tool definitions and execution.
 *
 * Each tool is a function the Claude agent can call via the Anthropic tool_use
 * mechanism. Every tool call is recorded in `agent_actions` with the
 * write-before-acting pattern: a 'started' row is written BEFORE the operation,
 * and then resolved to 'success', 'failed' or 'blocked' when the outcome is
 * known. If the process dies mid-call, the 'started' row survives as proof.
 *
 * MONEY_ACTION tools (create_order, create_payment_link) require explicit
 * approval. Without it they write a 'blocked' row and return a refusal to
 * Claude, so the model learns the guardrail exists and can explain it to the
 * user. The refusal is never silent.
 *
 * Tool results are what Claude sees in its next turn. They are plain text
 * summaries, not raw database rows — which keeps the context window efficient
 * and avoids leaking internal ids or metadata the model does not need.
 */

import type Anthropic from '@anthropic-ai/sdk';

import {
  completeAgentAction,
  failAgentAction,
  recordBlockedAction,
  startAgentAction,
} from '../repositories/agentActionRepo.js';
import {
  createOrderRecord,
  getOrderById,
  type PublicOrder,
} from '../repositories/orderRepo.js';
import {
  getProductById,
  searchProducts,
  getCategories,
  type PublicProduct,
} from '../repositories/productRepo.js';
import {
  issuePaymentLink,
} from '../services/paymentService.js';

// -----------------------------------------------------------------------------
// Tool definitions — the schema Claude sees
// -----------------------------------------------------------------------------

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description:
      'Search the product catalogue by text query and/or price range. ' +
      'Returns up to `limit` products sorted by price ascending. ' +
      'Use this when the user asks for a product, a category, or names a budget.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search terms. Matched against product name, description and category.',
        },
        category: {
          type: 'string',
          description: 'Exact category filter (case-insensitive).',
        },
        min_price: {
          type: 'number',
          description: 'Minimum price in minor units (paise). 100000 = ₹1,000.',
        },
        max_price: {
          type: 'number',
          description: 'Maximum price in minor units (paise). 200000 = ₹2,000.',
        },
        in_stock_only: {
          type: 'boolean',
          description: 'When true, only return products with stock > 0. Defaults to true.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results. Defaults to 5, max 20.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_product',
    description:
      'Get full details of a single product by its UUID. Use when the user ' +
      'has selected a specific product from search results.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: {
          type: 'string',
          description: 'The UUID of the product.',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_categories',
    description:
      'List all available product categories. Use when the user asks what ' +
      'kinds of products are available, or when you need to help narrow a search.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_order',
    description:
      'Create a purchase order for a product. This is a MONEY ACTION that ' +
      'requires explicit user approval. Do NOT call this unless the user has ' +
      'clearly said yes to buying the product at the quoted price. The order ' +
      'starts in PENDING_CONFIRMATION and no money moves yet.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: {
          type: 'string',
          description: 'UUID of the product to order.',
        },
        quantity: {
          type: 'number',
          description: 'How many to buy. Defaults to 1.',
        },
        conversation_id: {
          type: 'string',
          description: 'UUID of the current conversation.',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'create_payment_link',
    description:
      'Issue a Razorpay payment link for an existing order. This is a MONEY ' +
      'ACTION that requires explicit user approval. The user must have already ' +
      'approved the purchase and an order must exist. Returns a payment URL ' +
      'the user can click to pay.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'string',
          description: 'UUID of the order to create a payment link for.',
        },
        conversation_id: {
          type: 'string',
          description: 'UUID of the current conversation.',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_order_status',
    description:
      'Check the current status of an order. Use when the user asks about ' +
      'their order or when you need to verify order state before taking action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'string',
          description: 'UUID of the order.',
        },
      },
      required: ['order_id'],
    },
  },
];

export const OPENAI_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_products',
      description:
        'Search the product catalogue by text query and/or price range. ' +
        'Returns up to limit products sorted by price ascending. ' +
        'Use this when the user asks for a product, a category, or names a budget.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Free-text search terms. Matched against product name, description and category.',
          },
          category: {
            type: 'string',
            description: 'Exact category filter (case-insensitive).',
          },
          min_price: {
            type: 'number',
            description: 'Minimum price in minor units (paise). 100000 = ₹1,000.',
          },
          max_price: {
            type: 'number',
            description: 'Maximum price in minor units (paise). 200000 = ₹2,000.',
          },
          in_stock_only: {
            type: 'boolean',
            description: 'When true, only return products with stock > 0. Defaults to true.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results. Defaults to 5, max 20.',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_product',
      description:
        'Get full details of a single product by its UUID. Use when the user ' +
        'has selected a specific product from search results.',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'The UUID of the product.',
          },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_categories',
      description:
        'List all available product categories. Use when the user asks what ' +
        'kinds of products are available, or when you need to help narrow a search.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_order',
      description:
        'Create a purchase order for a product. This is a MONEY ACTION that ' +
        'requires explicit user approval. Do NOT call this unless the user has ' +
        'clearly said yes to buying the product at the quoted price. The order ' +
        'starts in PENDING_CONFIRMATION and no money moves yet.',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'The UUID of the product to order.',
          },
          quantity: {
            type: 'number',
            description: 'Number of units. Defaults to 1.',
          },
          conversation_id: {
            type: 'string',
            description: 'The current conversation UUID to link this order to.',
          },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_payment_link',
      description:
        'Create a hosted Razorpay Payment Link for an order. This is a MONEY ' +
        'ACTION that moves the order to PAYMENT_PENDING and generates a payment ' +
        'URL the user can use to complete checkout. Requires explicit user approval.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The UUID of the order to create a payment link for.',
          },
          conversation_id: {
            type: 'string',
            description: 'The current conversation UUID.',
          },
        },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_order_status',
      description:
        'Check the current status and payment details of an existing order.',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The UUID of the order to check.',
          },
        },
        required: ['order_id'],
      },
    },
  },
];

// -----------------------------------------------------------------------------
// Tool classification
// -----------------------------------------------------------------------------

type ActionType = 'READ_ACTION' | 'WRITE_ACTION' | 'MONEY_ACTION' | 'SYSTEM_ACTION';

const TOOL_ACTION_TYPES: Record<string, ActionType> = {
  search_products: 'READ_ACTION',
  get_product: 'READ_ACTION',
  get_categories: 'READ_ACTION',
  create_order: 'MONEY_ACTION',
  create_payment_link: 'MONEY_ACTION',
  get_order_status: 'READ_ACTION',
};

const MONEY_TOOLS = new Set(['create_order', 'create_payment_link']);

// -----------------------------------------------------------------------------
// Tool execution context
// -----------------------------------------------------------------------------

export interface ToolContext {
  conversationId: string;
  requestId: string;
  /**
   * Whether the user has explicitly approved a money action in this
   * conversation turn. Set to true when the user's message contains clear
   * affirmative intent (e.g., "yes, buy it", "confirm", "go ahead").
   *
   * The agent service determines this before the tool loop begins, so the
   * model cannot grant itself approval by calling a tool.
   */
  userApproved: boolean;
}

// -----------------------------------------------------------------------------
// Format helpers
// -----------------------------------------------------------------------------

function formatProduct(p: PublicProduct): string {
  return [
    `• ${p.name} (${p.id})`,
    `  ${p.priceFormatted}`,
    p.description ? `  ${p.description}` : null,
    p.category ? `  Category: ${p.category}` : null,
    `  ${p.inStock ? `In stock (${p.stock})` : 'Out of stock'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatOrder(o: PublicOrder): string {
  return [
    `Order ${o.id}`,
    `  Status: ${o.status}`,
    `  Amount: ${o.amountFormatted}`,
    `  Product: ${o.productId}`,
    `  Quantity: ${o.quantity}`,
    o.razorpayPaymentId ? `  Payment ID: ${o.razorpayPaymentId}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

// -----------------------------------------------------------------------------
// Individual tool handlers
// -----------------------------------------------------------------------------

async function execSearchProducts(
  input: Record<string, unknown>,
): Promise<{ result: string; output: unknown }> {
  const products = await searchProducts({
    query: typeof input.query === 'string' ? input.query : undefined,
    category: typeof input.category === 'string' ? input.category : undefined,
    minPrice: typeof input.min_price === 'number' ? input.min_price : undefined,
    maxPrice: typeof input.max_price === 'number' ? input.max_price : undefined,
    inStockOnly: input.in_stock_only !== false,
    limit: Math.min(typeof input.limit === 'number' ? input.limit : 5, 20),
  });

  if (products.length === 0) {
    return {
      result: 'No products found matching your search.',
      output: { count: 0 },
    };
  }

  const formatted = products.map(formatProduct).join('\n\n');
  return {
    result: `Found ${products.length} product(s):\n\n${formatted}`,
    output: { count: products.length, products: products.map((p) => ({ id: p.id, name: p.name, price: p.price })) },
  };
}

async function execGetProduct(
  input: Record<string, unknown>,
): Promise<{ result: string; output: unknown }> {
  const productId = input.product_id;
  if (typeof productId !== 'string') {
    return { result: 'Error: product_id is required.', output: { error: 'missing_product_id' } };
  }

  const product = await getProductById(productId);
  if (product === null) {
    return { result: 'Product not found or no longer available.', output: { error: 'not_found' } };
  }

  return {
    result: formatProduct(product),
    output: { id: product.id, name: product.name, price: product.price },
  };
}

async function execGetCategories(): Promise<{ result: string; output: unknown }> {
  const categories = await getCategories();

  if (categories.length === 0) {
    return { result: 'No categories found in the catalogue.', output: { categories: [] } };
  }

  return {
    result: `Available categories: ${categories.join(', ')}`,
    output: { categories },
  };
}

async function execCreateOrder(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{ result: string; output: unknown; orderId?: string }> {
  const productId = input.product_id;
  if (typeof productId !== 'string') {
    return { result: 'Error: product_id is required.', output: { error: 'missing_product_id' } };
  }

  const quantity = typeof input.quantity === 'number' ? Math.max(1, Math.trunc(input.quantity)) : 1;

  const order = await createOrderRecord({
    productId,
    quantity,
    conversationId: ctx.conversationId,
  });

  return {
    result: [
      `Order created successfully.`,
      formatOrder(order),
      '',
      'The order is in PENDING_CONFIRMATION. To proceed with payment, call create_payment_link.',
    ].join('\n'),
    output: { orderId: order.id, status: order.status, amount: order.amount },
    orderId: order.id,
  };
}

async function execCreatePaymentLink(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{ result: string; output: unknown }> {
  const orderId = input.order_id;
  if (typeof orderId !== 'string') {
    return { result: 'Error: order_id is required.', output: { error: 'missing_order_id' } };
  }

  const view = await issuePaymentLink({
    orderId,
    approved: true,
    approvalReason: 'User explicitly approved purchase in conversation.',
    conversationId: ctx.conversationId,
    requestId: ctx.requestId,
  });

  const paymentUrl = view.paymentUrl;

  return {
    result: [
      `Payment link issued.`,
      `Order: ${view.order.id}`,
      `Status: ${view.order.status}`,
      `Amount: ${view.order.amountFormatted}`,
      paymentUrl ? `Payment URL: ${paymentUrl}` : 'No payment URL was returned.',
      '',
      'Share the payment URL with the user. The order becomes PAID only after Razorpay confirms.',
    ].join('\n'),
    output: {
      orderId: view.order.id,
      status: view.order.status,
      paymentUrl,
    },
  };
}

async function execGetOrderStatus(
  input: Record<string, unknown>,
): Promise<{ result: string; output: unknown }> {
  const orderId = input.order_id;
  if (typeof orderId !== 'string') {
    return { result: 'Error: order_id is required.', output: { error: 'missing_order_id' } };
  }

  const order = await getOrderById(orderId);
  if (order === null) {
    return { result: 'Order not found.', output: { error: 'not_found' } };
  }

  return {
    result: formatOrder(order),
    output: { orderId: order.id, status: order.status, amount: order.amount },
  };
}

// -----------------------------------------------------------------------------
// Unified tool executor
// -----------------------------------------------------------------------------

export interface ToolResult {
  toolUseId: string;
  toolName: string;
  /** The text Claude sees as the tool result. */
  result: string;
  /** Whether this was an error result. */
  isError: boolean;
  /** Structured output for the agent_actions row. */
  output: unknown;
  /** The order id, if this tool created or acted on one. */
  orderId?: string;
}

/**
 * Execute a single tool call from Claude.
 *
 * MONEY_ACTION guardrail: if the tool is a money action and the user has not
 * explicitly approved, the call is blocked BEFORE anything happens. The blocked
 * row is written to agent_actions so the activity feed shows the refusal.
 */
export async function executeTool(
  toolUseId: string,
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const actionType = TOOL_ACTION_TYPES[toolName] ?? 'SYSTEM_ACTION';

  // MONEY_ACTION guardrail
  if (MONEY_TOOLS.has(toolName) && !ctx.userApproved) {
    await recordBlockedAction({
      toolName,
      actionType,
      conversationId: ctx.conversationId,
      reason: 'Money action attempted without explicit user approval in this conversation turn.',
      input,
      requestId: ctx.requestId,
      errorCode: 'APPROVAL_REQUIRED',
      reasonMessage:
        'This is a money action that requires explicit user approval. ' +
        'Ask the user to confirm before proceeding.',
    });

    return {
      toolUseId,
      toolName,
      result:
        'BLOCKED: This action requires explicit user approval. ' +
        'You must ask the user to confirm the purchase (product name, price, quantity) ' +
        'and receive a clear "yes" before calling this tool.',
      isError: true,
      output: { blocked: true, reason: 'approval_required' },
    };
  }

  // Start the audit row
  const action = await startAgentAction({
    toolName,
    actionType,
    conversationId: ctx.conversationId,
    reason: `Tool call from agent: ${toolName}`,
    input,
    requestId: ctx.requestId,
  });

  try {
    let execResult: { result: string; output: unknown; orderId?: string };

    switch (toolName) {
      case 'search_products':
        execResult = await execSearchProducts(input);
        break;
      case 'get_product':
        execResult = await execGetProduct(input);
        break;
      case 'get_categories':
        execResult = await execGetCategories();
        break;
      case 'create_order':
        execResult = await execCreateOrder(input, ctx);
        break;
      case 'create_payment_link':
        execResult = await execCreatePaymentLink(input, ctx);
        break;
      case 'get_order_status':
        execResult = await execGetOrderStatus(input);
        break;
      default:
        execResult = {
          result: `Unknown tool: ${toolName}. Available tools: ${TOOL_DEFINITIONS.map((t) => t.name).join(', ')}`,
          output: { error: 'unknown_tool' },
        };
    }

    await completeAgentAction(action.id, execResult.output, execResult.orderId ?? null);

    return {
      toolUseId,
      toolName,
      result: execResult.result,
      isError: false,
      output: execResult.output,
      orderId: execResult.orderId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await failAgentAction(
      action.id,
      'TOOL_EXECUTION_ERROR',
      `Tool ${toolName} failed: ${message}`,
    ).catch(() => undefined); // Best-effort; the thrown error is more important.

    return {
      toolUseId,
      toolName,
      result: `Error executing ${toolName}: ${message}`,
      isError: true,
      output: { error: message },
    };
  }
}
