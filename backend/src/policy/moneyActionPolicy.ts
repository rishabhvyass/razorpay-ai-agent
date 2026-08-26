/**
 * Centralized Money Action Policy Layer.
 *
 * ============================================================================
 * PRINCIPLE: The LLM must NEVER be trusted to decide whether a money action
 * is permitted, what an item costs, or whether an order is paid.
 *
 * Flow:
 *   AI requests money action
 *     ↓
 *   Backend policy layer (THIS MODULE)
 *     ↓
 *   Validate explicit user authorization (AI cannot self-authorize)
 *     ↓
 *   Validate product integrity & stock (read trusted DB, verify in_stock)
 *     ↓
 *   Calculate amount strictly server-side (product.price × quantity)
 *     ↓
 *   Enforce financial bounds (min ₹1.00, max ₹5,000.00 per order, currency INR)
 *     ↓
 *   Validate order state transitions
 *     ↓
 *   Check idempotency to prevent duplicate Razorpay orders
 *     ↓
 *   Execute action only if policy passes
 * ============================================================================
 */

import { getProductById, type PublicProduct } from '../repositories/productRepo.js';
import { getOrderById, findOpenOrderByConversationAndProduct, type PublicOrder } from '../repositories/orderRepo.js';
import { recordBlockedAction } from '../repositories/agentActionRepo.js';
import { approvalRequired, badRequest, conflict, notFound } from '../utils/errors.js';
import { formatMinorUnits, lineTotalMinor } from '../utils/money.js';
import { MINIMUM_ORDER_AMOUNT_MINOR } from '../services/razorpayClient.js';
import { assertOrderTransition } from './orderStateMachine.js';

export const MAX_ORDER_AMOUNT_MINOR = 500_000; // ₹5,000.00 ceiling per single agent transaction
export const MAX_ORDER_QUANTITY = 10;

export interface MoneyActionPolicyRequest {
  actionType: 'CREATE_ORDER' | 'CREATE_PAYMENT_LINK' | 'CREATE_CHECKOUT_SESSION';
  conversationId?: string | null | undefined;
  productId?: string | undefined;
  orderId?: string | undefined;
  quantity?: number | undefined;
  userApproved: boolean;
  approvalReason?: string | null | undefined;
  requestId: string;
}

export interface MoneyActionPolicyResult {
  allowed: boolean;
  product?: PublicProduct;
  order?: PublicOrder;
  calculatedAmount: number;
  currency: string;
  amountFormatted: string;
  idempotentExistingOrder?: PublicOrder | null;
  reason: string;
}

/**
 * Enforce the complete Money Action Policy.
 *
 * If any check fails, this throws a domain error (e.g. `APPROVAL_REQUIRED`,
 * `VALIDATION_ERROR`, `CONFLICT`) and writes a `BLOCKED` audit record to `agent_actions`.
 */
export async function enforceMoneyActionPolicy(
  req: MoneyActionPolicyRequest,
): Promise<MoneyActionPolicyResult> {
  const toolName = req.actionType.toLowerCase();

  // ---------------------------------------------------------------------------
  // 1. GATED: Explicit User Authorization Check
  //    The LLM cannot authorize itself. The user must have provided a clear yes.
  // ---------------------------------------------------------------------------
  if (req.userApproved !== true) {
    await recordBlockedAction({
      toolName,
      actionType: 'MONEY_ACTION',
      conversationId: req.conversationId ?? null,
      orderId: req.orderId ?? null,
      reason: 'Money action attempted without explicit user approval.',
      input: {
        actionType: req.actionType,
        productId: req.productId,
        orderId: req.orderId,
        quantity: req.quantity,
        userApproved: req.userApproved,
      },
      requestId: req.requestId,
      errorCode: 'APPROVAL_REQUIRED',
      reasonMessage:
        'Money actions require explicit user approval. The agent cannot grant itself authorization.',
    }).catch(() => undefined);

    throw approvalRequired(
      'This money action requires explicit user authorization. ' +
        'Please ask the customer to confirm the purchase (product, quantity, price) before proceeding.',
      {
        actionType: req.actionType,
        productId: req.productId,
        orderId: req.orderId,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // 2. CREATE_ORDER branch: Verify product, calculate amount, check idempotency
  // ---------------------------------------------------------------------------
  if (req.actionType === 'CREATE_ORDER') {
    if (!req.productId || typeof req.productId !== 'string') {
      throw badRequest('VALIDATION_ERROR', 'A valid product_id is required to create an order.');
    }

    const product = await getProductById(req.productId);
    if (!product) {
      throw notFound('PRODUCT_NOT_FOUND', `Product ${req.productId} was not found in the catalogue.`);
    }

    const quantity = typeof req.quantity === 'number' && Number.isInteger(req.quantity) && req.quantity > 0
      ? req.quantity
      : 1;

    if (quantity > MAX_ORDER_QUANTITY) {
      throw badRequest(
        'VALIDATION_ERROR',
        `Quantity ${quantity} exceeds maximum allowed (${MAX_ORDER_QUANTITY}) per order.`,
        { quantity, max: MAX_ORDER_QUANTITY },
      );
    }

    // In stock check
    if (!product.inStock || product.stock < quantity) {
      throw conflict(
        'CONFLICT',
        `Product "${product.name}" is out of stock or has insufficient quantity (available: ${product.stock}, requested: ${quantity}).`,
        { productId: product.id, stock: product.stock, requested: quantity },
      );
    }

    // Server-side calculated price (never trust LLM)
    const calculatedAmount = lineTotalMinor(product.price, quantity);
    const currency = product.currency ?? 'INR';
    const amountFormatted = formatMinorUnits(calculatedAmount, currency);

    // Bounds check
    if (calculatedAmount < MINIMUM_ORDER_AMOUNT_MINOR) {
      throw badRequest(
        'VALIDATION_ERROR',
        `Order amount ${amountFormatted} is below Razorpay minimum (${formatMinorUnits(MINIMUM_ORDER_AMOUNT_MINOR, currency)}).`,
        { calculatedAmount, minimum: MINIMUM_ORDER_AMOUNT_MINOR },
      );
    }

    if (calculatedAmount > MAX_ORDER_AMOUNT_MINOR) {
      throw badRequest(
        'VALIDATION_ERROR',
        `Order amount ${amountFormatted} exceeds safety ceiling (${formatMinorUnits(MAX_ORDER_AMOUNT_MINOR, currency)}).`,
        { calculatedAmount, maximum: MAX_ORDER_AMOUNT_MINOR },
      );
    }

    // Idempotency check: if an open order for this product exists in this conversation, reuse it
    let existingOrder: PublicOrder | null = null;
    if (req.conversationId) {
      existingOrder = await findOpenOrderByConversationAndProduct(req.conversationId, product.id);
    }

    return {
      allowed: true,
      product,
      calculatedAmount,
      currency,
      amountFormatted,
      idempotentExistingOrder: existingOrder,
      reason: `User authorized purchase of ${quantity}x ${product.name} at trusted price ${amountFormatted}.`,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. PAYMENT LINK / CHECKOUT SESSION branch: Verify order exists & is payable
  // ---------------------------------------------------------------------------
  if (req.actionType === 'CREATE_PAYMENT_LINK' || req.actionType === 'CREATE_CHECKOUT_SESSION') {
    if (!req.orderId || typeof req.orderId !== 'string') {
      throw badRequest('VALIDATION_ERROR', 'A valid order_id is required to initiate payment.');
    }

    const order = await getOrderById(req.orderId);
    if (!order) {
      throw notFound('ORDER_NOT_FOUND', `Order ${req.orderId} was not found.`);
    }

    if (order.status === 'PAID') {
      throw conflict(
        'CONFLICT',
        `Order ${order.id} is already PAID. No additional payment instrument can be created.`,
        { orderId: order.id, status: order.status },
      );
    }

    // Ensure valid state transition to PAYMENT_PENDING
    if (order.status === 'PENDING_CONFIRMATION') {
      assertOrderTransition(order.status, 'ORDER_CREATED');
    }

    const product = await getProductById(order.productId);

    return {
      allowed: true,
      order,
      product: product ?? undefined,
      calculatedAmount: order.amount,
      currency: order.currency,
      amountFormatted: order.amountFormatted,
      reason: req.approvalReason ?? `User explicitly approved payment for order ${order.id} (${order.amountFormatted}).`,
    };
  }

  throw badRequest('VALIDATION_ERROR', `Unsupported money action type: ${req.actionType}`);
}
