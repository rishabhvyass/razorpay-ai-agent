/**
 * Standard Checkout routes. Mounted at `/api`, so this file owns two paths:
 *
 *   POST /api/create-order      create a Razorpay Order for an existing order
 *   POST /api/verify-payment    verify what the checkout modal handed the browser
 *
 * ---------------------------------------------------------------------------
 * WHAT `POST /api/create-order` DOES NOT ACCEPT: an amount.
 *
 * The name is Razorpay's convention and refers to a RAZORPAY order - the provider
 * object that binds a price to a checkout session. It is not `POST /api/orders`,
 * which creates the application's own order row from a product id and a quantity.
 * This route takes that row's id and asks Razorpay for a matching provider order,
 * reading the figure from the database.
 *
 * A route that took `{ amount }` from a request body would be the one hole big
 * enough to undo the rest of this codebase: the browser would name its own price,
 * the modal would collect it, the signature would verify, and the amount check in
 * `applyProviderState` would compare Razorpay's honest report of what it collected
 * against an order row that says the same wrong number. `.strict()` below makes
 * sending `amount` a 400 rather than a silently ignored field.
 * ---------------------------------------------------------------------------
 *
 * Both routes answer 501 when no Razorpay credentials are configured, naming the
 * missing variables - names only, never values.
 */

import { Router } from 'express';
import { z } from 'zod';

import { RAZORPAY_ENV_VARS, isRazorpayConfigured } from '../config/env.js';
import { getOrderByRazorpayOrderId } from '../repositories/orderRepo.js';
import {
  cancelCheckout,
  createCheckoutSession,
  verifyCheckoutPayment,
} from '../services/checkoutService.js';
import { badRequest, notFound, paymentNotConfigured } from '../utils/errors.js';

export const checkoutRouter = Router();

function requirePaymentsConfigured(): void {
  if (!isRazorpayConfigured) {
    throw paymentNotConfigured(
      'Payments are not configured on this server. Set ' +
        `${RAZORPAY_ENV_VARS.join(', ')} in the backend environment.`,
    );
  }
}

function issues(error: z.ZodError): Record<string, unknown> {
  return {
    issues: error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}

/**
 * The authorisation payload, identical in spirit to `payments.ts`.
 *
 * `approved` is `z.literal(true)` for the same reason it is there: `false` has to
 * reach the service so the blocked MONEY_ACTION row gets written, so a parse failure
 * is handled by calling the service unapproved on purpose rather than by returning a
 * bare 400.
 *
 * Note what is absent: `amount`, `currency`, `price`, `total`. See the file header.
 */
const createOrderSchema = z
  .object({
    orderId: z.uuid({ error: 'orderId must be the UUID of an order created by POST /api/orders.' }),
    approved: z.literal(true, {
      error: 'Opening checkout requires explicit approval: send "approved": true.',
    }),
    approvalReason: z
      .string()
      .trim()
      .min(8, 'approvalReason must describe what the customer agreed to.')
      .max(1000),
    conversationId: z.uuid().nullish(),
  })
  .strict();

/**
 * The three values `checkout.js` hands its success handler, and nothing else.
 *
 * Named exactly as Razorpay names them. This is the one place in the codebase where
 * snake_case wire fields are deliberate: the browser receives these keys from
 * Razorpay's own SDK and forwards them untouched, so there is no renaming step in
 * which a typo becomes a payment that silently fails to verify.
 *
 * `orderId` is optional and is the strong form. When present, the service checks the
 * signed `razorpay_order_id` against the one stored on THAT order - so a genuine
 * signature covering some other order cannot settle this one. When absent, the order
 * is resolved from `razorpay_order_id` instead, which keeps the minimal three-field
 * body working.
 *
 * Absent, and rejected by `.strict()`: `amount`, `currency`, `status`, `paid`. The
 * amount is read from Razorpay inside the handler; a client-supplied one would be
 * the browser reporting its own payment total.
 */
const verifyPaymentSchema = z
  .object({
    razorpay_order_id: z.string().trim().min(1, 'razorpay_order_id is required.'),
    razorpay_payment_id: z.string().trim().min(1, 'razorpay_payment_id is required.'),
    razorpay_signature: z.string().trim().min(1, 'razorpay_signature is required.'),
    orderId: z.uuid().optional(),
  })
  .strict();

const cancelCheckoutSchema = z
  .object({
    orderId: z.uuid({ error: 'orderId must be the UUID of the order being cancelled.' }),
    reason: z
      .string()
      .trim()
      .min(8, 'reason must explain why checkout was cancelled.')
      .max(1000),
  })
  .strict();

/**
 * Create a Razorpay Order and return what the modal needs to open.
 *
 * 201, because a provider order is a resource that did not exist before.
 *
 * The response splits two namespaces on purpose. The snake_case fields are the
 * `checkout.js` option bag, named as Razorpay's SDK expects them. `order` is our own
 * serialised row in the app's camelCase, and it is what the UI must display - the
 * amount shown to a customer comes from the trusted backend row, not from the
 * figure that happens to be sitting in the modal.
 */
checkoutRouter.post('/create-order', async (req, res) => {
  requirePaymentsConfigured();

  const parsed = createOrderSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    // An unapproved request is not a validation problem to be reported and
    // forgotten - it is an attempt to move money without a yes, and the service is
    // what records it. Hand it over unapproved so it writes the blocked row.
    //
    // Only possible when the payload at least names a valid order; without one there
    // is nothing to record the refusal against, so that stays a plain 400.
    const body = typeof req.body === 'object' && req.body === null ? {} : req.body;
    const approvedAnyway = (body as { approved?: unknown } | undefined)?.approved === true;
    const claimedOrderId = (body as { orderId?: unknown } | undefined)?.orderId;

    if (!approvedAnyway && typeof claimedOrderId === 'string' && z.uuid().safeParse(claimedOrderId).success) {
      await createCheckoutSession({
        orderId: claimedOrderId,
        approved: false,
        approvalReason: 'Request carried no valid approval.',
        requestId: req.requestId,
      });
    }

    // `createCheckoutSession` throws APPROVAL_REQUIRED for an unapproved request, so
    // the call above does not return. Kept as a hard stop rather than a comment: if
    // that gate is ever loosened, this must not fall through to a success response.
    throw badRequest('VALIDATION_ERROR', 'Invalid create-order payload.', issues(parsed.error));
  }

  const session = await createCheckoutSession({
    orderId: parsed.data.orderId,
    approved: parsed.data.approved,
    approvalReason: parsed.data.approvalReason,
    conversationId: parsed.data.conversationId ?? null,
    requestId: req.requestId,
  });

  res.status(201).json({
    data: {
      // The checkout.js option bag.
      key_id: session.keyId,
      order_id: session.razorpayOrderId,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      // Ours. Display from this, not from the three fields above.
      orderId: session.orderId,
      amountFormatted: session.amountFormatted,
    },
    meta: {
      note:
        'Razorpay order created and this order is PAYMENT_PENDING. No money has moved. It ' +
        'becomes PAID only after Razorpay reports a captured payment for this amount.',
    },
    requestId: req.requestId,
  });
});

/**
 * Record that the customer closed the currently open Standard Checkout modal.
 *
 * This does not call Razorpay and it cannot mark anything paid. It only moves the
 * matching app order from PAYMENT_PENDING to CANCELLED after the service confirms
 * that the order belongs to this checkout flow. The response is a complete payment
 * view so the browser can replace its pending card without waiting for a poll.
 */
checkoutRouter.post('/cancel-checkout', async (req, res) => {
  requirePaymentsConfigured();

  const parsed = cancelCheckoutSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw badRequest(
      'VALIDATION_ERROR',
      'Invalid cancel-checkout payload. Send orderId and a short cancellation reason.',
      issues(parsed.error),
    );
  }

  const view = await cancelCheckout({
    orderId: parsed.data.orderId,
    reason: parsed.data.reason,
    requestId: req.requestId,
  });

  res.json({
    data: view,
    meta: {
      note:
        'The customer closed Standard Checkout before a successful payment was verified. ' +
        'The order is CANCELLED and no payment was marked as received.',
    },
    requestId: req.requestId,
  });
});

/**
 * Verify a checkout result and settle the order from what Razorpay reports.
 *
 * A 400 here means the order was NOT marked paid - see `INVALID_PAYMENT_SIGNATURE`.
 * The response body on success is a full payment view, so the client re-reads the
 * order's real status rather than inferring one from the 200.
 *
 * Deliberately NOT a route that can produce a PAID order from its own arguments: the
 * signature is checked, and then the payment is read back from Razorpay and pushed
 * through `applyProviderState`, which compares the captured amount against the order
 * row before anything is written.
 */
checkoutRouter.post('/verify-payment', async (req, res) => {
  requirePaymentsConfigured();

  const parsed = verifyPaymentSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    throw badRequest(
      'VALIDATION_ERROR',
      'Invalid verify-payment payload. Send razorpay_order_id, razorpay_payment_id and ' +
        'razorpay_signature exactly as Razorpay Checkout returned them.',
      issues(parsed.error),
    );
  }

  // Resolve our order. Preferring the caller-supplied `orderId` is what makes the
  // binding check in the service load-bearing: the URL-independent pair "this app
  // order" + "this signed Razorpay order" must agree, and only the caller naming
  // both can be checked. Falling back to a lookup by the provider id keeps the
  // three-field body working, at the cost of that one check being tautological.
  let appOrderId = parsed.data.orderId;

  if (appOrderId === undefined) {
    const order = await getOrderByRazorpayOrderId(parsed.data.razorpay_order_id);

    if (order === null) {
      throw notFound('ORDER_NOT_FOUND', 'No order was found for that Razorpay order id.');
    }

    appOrderId = order.id;
  }

  const view = await verifyCheckoutPayment({
    orderId: appOrderId,
    razorpayOrderId: parsed.data.razorpay_order_id,
    razorpayPaymentId: parsed.data.razorpay_payment_id,
    razorpaySignature: parsed.data.razorpay_signature,
    requestId: req.requestId,
  });

  res.json({
    data: view,
    meta: {
      // Worth spelling out: a 200 from this route is not itself the confirmation.
      // The status in `data.order.status` is, and it was written from a figure
      // Razorpay reported after the signature was checked.
      note:
        'Signature verified and the payment was read back from Razorpay. The order status in ' +
        'this response is what the provider reported, checked against the order amount.',
    },
    requestId: req.requestId,
  });
});
