/**
 * Development fallback for `POST /api/chat`.
 *
 * The backend's route index lists that endpoint under `notImplementedYet` -
 * "needs the Claude + MCP layer". This module fills the gap so the section 41
 * demo flow is walkable, and it does so under two constraints:
 *
 *   1. NO FABRICATED PRODUCTS. Every product this returns comes from the real
 *      `GET /api/products` endpoint against the real catalogue. The intent parse
 *      below turns "black hoodie under 2000" into actual query parameters. If the
 *      catalogue is empty the agent says so rather than inventing a hoodie.
 *
 *   2. NO FABRICATED MONEY. Prices come from the product rows. The confirmation
 *      block quotes them, and the real backend recomputes the total server-side
 *      when the order is submitted, so the quote is never authoritative.
 *
 * What IS fabricated: the agent's prose, and the decision of which tool to
 * "call". Every turn produced here carries `mock: true`, which the renderer
 * turns into a visible marker.
 *
 * This is a keyword parser, not a language model. It is meant to be obviously
 * mechanical - the point is to exercise the UI, not to imitate Claude.
 */

import { searchProducts } from '../productService';
import type { AgentAction, ChatResponse, ChatTurn, Product } from '@/types';

let seq = 0;
const nextId = (prefix: string): string => {
  seq += 1;
  return `${prefix}_mock_${Date.now().toString(36)}_${seq}`;
};

const now = (): string => new Date().toISOString();

function mockAction(init: {
  toolName: string;
  actionType: AgentAction['actionType'];
  reason: string;
  status: AgentAction['status'];
  input?: AgentAction['input'];
  output?: AgentAction['output'];
}): AgentAction {
  return {
    id: nextId('act'),
    conversationId: null,
    orderId: null,
    toolName: init.toolName,
    actionType: init.actionType,
    reason: init.reason,
    input: init.input ?? null,
    output: init.output ?? null,
    status: init.status,
    errorCode: null,
    errorMessage: null,
    requestId: nextId('req'),
    createdAt: now(),
  };
}

// -----------------------------------------------------------------------------
// Intent parsing
// -----------------------------------------------------------------------------

interface ParsedIntent {
  kind: 'search' | 'buy' | 'greeting' | 'unknown';
  /** Free-text terms for the catalogue query. */
  terms: string;
  /** Minor units, when the user named a ceiling. */
  maxPriceMinor?: number;
}

/**
 * Pull a rupee ceiling out of the phrasing people actually use: "under 2000",
 * "below ₹1,500", "less than 2.5k", "upto 3000".
 */
function extractMaxPriceMinor(text: string): number | undefined {
  const cleaned = text.replace(/[,₹]/g, '');
  const match = cleaned.match(/(?:under|below|less than|upto|up to|max|within)\s*(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!match?.[1]) return undefined;

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return undefined;

  const rupees = match[2] ? value * 1000 : value;
  return Math.round(rupees * 100);
}

/** Words that carry no catalogue signal - stripped before querying. */
const STOP_WORDS = new Set([
  'find', 'show', 'me', 'a', 'an', 'the', 'some', 'any', 'get', 'i', 'want', 'need',
  'looking', 'for', 'search', 'please', 'can', 'you', 'help', 'with', 'buy', 'purchase',
  'under', 'below', 'less', 'than', 'upto', 'up', 'to', 'max', 'within', 'rs', 'inr',
  'rupees', 'something', 'gift', 'good', 'nice', 'best', 'my',
]);

function extractTerms(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word) && !/^\d+k?$/.test(word))
    .slice(0, 4)
    .join(' ');
}

const AFFIRMATIVE = /\b(yes|yeah|yep|sure|ok|okay|buy it|buy this|purchase|i'?ll take it|take it|go ahead|do it|confirm)\b/i;

export function parseIntent(text: string): ParsedIntent {
  const trimmed = text.trim();

  if (/^(hi|hello|hey|yo|good (morning|evening|afternoon))\b/i.test(trimmed)) {
    return { kind: 'greeting', terms: '' };
  }

  // An affirmative with no product words is an approval of the standing
  // recommendation, not a new search.
  if (AFFIRMATIVE.test(trimmed) && extractTerms(trimmed) === '') {
    return { kind: 'buy', terms: '' };
  }

  const terms = extractTerms(trimmed);
  const maxPriceMinor = extractMaxPriceMinor(trimmed);

  if (terms || maxPriceMinor !== undefined) {
    return {
      kind: 'search',
      terms,
      ...(maxPriceMinor !== undefined ? { maxPriceMinor } : {}),
    };
  }

  return { kind: 'unknown', terms: '' };
}

// -----------------------------------------------------------------------------
// Turn production
// -----------------------------------------------------------------------------

/** Deliberate latency so the "Agent is thinking…" state is actually observable. */
const THINK_MS = 620;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function assistantTurn(content: string, extra: Partial<ChatTurn> = {}): ChatTurn {
  return {
    id: nextId('turn'),
    role: 'assistant',
    content,
    createdAt: now(),
    mock: true,
    ...extra,
  };
}

/**
 * Produce the agent's reply to a user message.
 *
 * `standingProduct` is the recommendation currently on screen, so "yes, buy it"
 * can resolve to something without the mock inventing a product.
 */
export async function mockChat(args: {
  message: string;
  standingProduct: Product | null;
  /**
   * Called when the work being done changes, so the UI can name it. Reported from
   * here rather than guessed at by a timer in the component: the only reason this
   * adapter can honestly say "searching the catalogue" is that it is the thing
   * awaiting `searchProducts`.
   */
  onPhase?: (phase: 'thinking' | 'searching-catalogue') => void;
}): Promise<ChatResponse> {
  await wait(THINK_MS);

  const intent = parseIntent(args.message);

  if (intent.kind === 'greeting') {
    return {
      mock: true,
      turns: [
        assistantTurn(
          "Hello. Tell me what you're shopping for - a category, a budget, or both - and I'll search the catalogue.",
        ),
      ],
      actions: [],
    };
  }

  // --- Approval of the standing recommendation ------------------------------
  if (intent.kind === 'buy') {
    if (!args.standingProduct) {
      return {
        mock: true,
        turns: [
          assistantTurn(
            "I don't have a product selected yet. Search for something first and I'll line it up for purchase.",
          ),
        ],
        actions: [],
      };
    }

    const product = args.standingProduct;

    if (product.stock < 1) {
      return {
        mock: true,
        turns: [
          assistantTurn(`${product.name} is out of stock, so I can't start a purchase for it.`, {
            failed: true,
            blocks: [
              {
                kind: 'error',
                code: 'PRODUCT_UNAVAILABLE',
                message: `${product.name} is out of stock.`,
                hint: 'Ask me for an alternative and I will search again.',
              },
            ],
          }),
        ],
        actions: [
          mockAction({
            toolName: 'check_stock',
            actionType: 'READ_ACTION',
            reason: 'User approved a purchase; verifying availability before any money action.',
            status: 'blocked',
            input: { productId: product.id },
            output: { stock: product.stock },
          }),
        ],
      };
    }

    return {
      mock: true,
      turns: [
        assistantTurn(
          `Before I create a payment I need your explicit approval. Here's exactly what will be charged.`,
          {
            blocks: [
              {
                kind: 'purchase-confirmation',
                product,
                quantity: 1,
                amountMinor: product.price,
                currency: product.currency,
              },
            ],
          },
        ),
      ],
      actions: [
        mockAction({
          toolName: 'product_selected',
          actionType: 'READ_ACTION',
          reason: 'User indicated intent to buy the recommended product.',
          status: 'success',
          input: { productId: product.id },
          output: { name: product.name, price: product.price },
        }),
        mockAction({
          toolName: 'request_purchase_approval',
          actionType: 'MONEY_ACTION',
          reason: 'A money action requires explicit user authorisation before it can proceed.',
          status: 'started',
          input: { productId: product.id, quantity: 1 },
        }),
      ],
    };
  }

  // --- Catalogue search -----------------------------------------------------
  if (intent.kind === 'search') {
    const searchAction = mockAction({
      toolName: 'search_product',
      actionType: 'READ_ACTION',
      reason: `User asked for: "${args.message.trim()}"`,
      status: 'success',
      input: {
        query: intent.terms || null,
        maxPrice: intent.maxPriceMinor ?? null,
      },
    });

    try {
      args.onPhase?.('searching-catalogue');
      // Real endpoint, real catalogue.
      const result = await searchProducts({
        ...(intent.terms ? { q: intent.terms } : {}),
        ...(intent.maxPriceMinor !== undefined ? { maxPrice: intent.maxPriceMinor } : {}),
        limit: 3,
      });

      if (result.products.length === 0) {
        return {
          mock: true,
          turns: [
            assistantTurn(
              intent.maxPriceMinor !== undefined
                ? "Nothing in the catalogue matches that description and budget. Try relaxing the price, or describe the item differently."
                : "I couldn't find anything matching that in the catalogue. Try describing the item differently.",
            ),
          ],
          actions: [{ ...searchAction, output: { count: 0 } }],
        };
      }

      const first = result.products[0]!;

      return {
        mock: true,
        turns: [
          assistantTurn(
            result.products.length === 1
              ? `I found one match in the catalogue.`
              : `I found ${result.products.length} matches. The closest fit is ${first.name}.`,
            {
              blocks: [{ kind: 'product', products: result.products }],
            },
          ),
        ],
        actions: [
          {
            ...searchAction,
            output: {
              count: result.products.length,
              topMatch: first.name,
            },
          },
        ],
      };
    } catch (error) {
      // The catalogue call failed. Report it as a failure - never substitute
      // invented products for a broken backend.
      return {
        mock: true,
        turns: [
          assistantTurn('I could not reach the product catalogue, so I have nothing to recommend.', {
            failed: true,
            blocks: [
              {
                kind: 'error',
                code: 'CATALOGUE_UNAVAILABLE',
                message: error instanceof Error ? error.message : 'The catalogue request failed.',
                hint: 'Check that the backend is running on port 3000 and that the database migration has been applied.',
              },
            ],
          }),
        ],
        actions: [{ ...searchAction, status: 'failed' }],
      };
    }
  }

  return {
    mock: true,
    turns: [
      assistantTurn(
        "I can search the catalogue by description and budget - try \"a black hoodie under ₹2,000\". I can't do anything else yet.",
      ),
    ],
    actions: [],
  };
}

/** Activity entries for the approval -> order -> link sequence. */
export function mockApprovalActions(args: {
  productName: string;
  orderId: string;
  /** Null when the simulated provider issued nothing. */
  razorpayOrderId: string | null;
  /** Null when no link was issued - the link step is then recorded as failed. */
  paymentLinkId: string | null;
}): AgentAction[] {
  const linkIssued = args.paymentLinkId !== null;

  return [
    mockAction({
      toolName: 'purchase_approved',
      actionType: 'MONEY_ACTION',
      reason: 'User explicitly approved the purchase.',
      status: 'success',
      input: { product: args.productName },
      output: { approved: true },
    }),
    mockAction({
      toolName: 'create_order',
      actionType: 'MONEY_ACTION',
      reason: 'Approved purchase; recording the order.',
      status: 'success',
      output: { orderId: args.orderId, razorpayOrderId: args.razorpayOrderId },
    }),
    mockAction({
      toolName: 'create_payment_link',
      actionType: 'MONEY_ACTION',
      reason: 'Order created; issuing a payment link for the user to complete.',
      status: linkIssued ? 'success' : 'failed',
      output: { paymentLinkId: args.paymentLinkId },
    }),
    // Only claim we are waiting on a confirmation if something was actually
    // issued to confirm. Otherwise the trail shows a payment in flight that
    // nothing is going to settle.
    ...(linkIssued
      ? [
          mockAction({
            toolName: 'payment_pending',
            actionType: 'SYSTEM_ACTION',
            reason: 'Waiting for a signature-verified payment confirmation.',
            status: 'started',
          }),
        ]
      : []),
  ];
}

/** Activity entries for the webhook settling. */
export function mockSettlementActions(args: {
  outcome: 'success' | 'failure';
  paymentId: string | null;
}): AgentAction[] {
  if (args.outcome === 'failure') {
    return [
      mockAction({
        toolName: 'payment_verification',
        actionType: 'SYSTEM_ACTION',
        reason: 'Provider reported the payment was not captured.',
        status: 'failed',
        output: { verified: false },
      }),
    ];
  }

  return [
    mockAction({
      toolName: 'payment_verified',
      actionType: 'SYSTEM_ACTION',
      reason: 'Webhook signature verified; payment captured.',
      status: 'success',
      output: { paymentId: args.paymentId },
    }),
    mockAction({
      toolName: 'order_completed',
      actionType: 'WRITE_ACTION',
      reason: 'Verified payment; order marked PAID.',
      status: 'success',
      output: { status: 'PAID' },
    }),
  ];
}
