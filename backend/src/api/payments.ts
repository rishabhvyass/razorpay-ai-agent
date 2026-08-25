/**
 * Payment routes. Mounted at `/api`, so this file owns three paths:
 *
 *   POST /api/orders/:id/payment-link      the gate - requires an explicit yes
 *   GET  /api/orders/:id/payment           current payment view (contacts nobody)
 *   POST /api/orders/:id/payment/refresh   ask Razorpay what happened
 *
 * ---------------------------------------------------------------------------
 * STILL DELIBERATELY ABSENT: no route here sets an order's status directly.
 *
 * `POST .../payment-link` moves an order to PAYMENT_PENDING, which is a statement
 * about our own intent - we have asked Razorpay for a link. Nothing in this file can
 * produce PAID. That comes from `applyProviderState`, reached only from a
 * signature-verified webhook or from a value Razorpay handed back on `/refresh`.
 *
 * `/refresh` deserves a note, because "an HTTP call that can make an order PAID"
 * sounds exactly like the thing the previous paragraph forbids. It isn't: the caller
 * supplies no payment information at all, only an order id. Everything acted on
 * comes back from Razorpay inside the handler. An attacker calling it repeatedly
 * achieves precisely what an honest client does - the order reflects whatever
 * Razorpay says, which is what it should have said anyway.
 * ---------------------------------------------------------------------------
 *
 * All three answer 501 when no Razorpay credentials are configured. That is a
 * deployment fault rather than a caller fault, so the message names the missing
 * variables - names only, never values, the same rule config/env.ts follows.
 */

import { Router } from 'express';
import { z } from 'zod';

import { RAZORPAY_ENV_VARS, isRazorpayConfigured } from '../config/env.js';
import {
  getPaymentView,
  issuePaymentLink,
  refreshPaymentStatus,
} from '../services/paymentService.js';
import { badRequest, paymentNotConfigured } from '../utils/errors.js';

export const paymentsRouter = Router();

const orderIdParamSchema = z.object({
  id: z.uuid({ error: 'Order id must be a UUID.' }),
});

/**
 * The authorisation payload.
 *
 * `approved` is `z.literal(true)`, not `z.boolean()`. The difference is where the
 * refusal happens: a boolean would let `false` through to the service, which would
 * then reject it *and write a blocked audit row*. That row is the product's evidence
 * that the guardrail fired, so `false` must reach the service rather than dying in a
 * validator. Hence: the schema accepts only `true`, and a parse failure is handled
 * below by calling the service with `approved: false` on purpose.
 *
 * `approvalReason` is required and has a floor of 8 characters, because an audit
 * trail whose justification column reads "ok" documents nothing.
 *
 * Note what is NOT accepted: `amount`, `currency`, `paymentUrl`, `status`. `.strict()`
 * makes sending one a 400 rather than a silently ignored field. The amount charged is
 * read from the order row inside the service, so no caller can name its own price -
 * the same invariant `POST /api/orders` holds.
 */
const authorisationSchema = z
  .object({
    approved: z.literal(true, {
      error: 'A payment link requires explicit approval: send "approved": true.',
    }),
    approvalReason: z
      .string()
      .trim()
      .min(8, 'approvalReason must describe what the customer agreed to.')
      .max(1000),
    conversationId: z.uuid().nullish(),
  })
  .strict();

function issues(error: z.ZodError): Record<string, unknown> {
  return {
    issues: error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}

/**
 * Refuse early when payments are unconfigured.
 *
 * Checked at the route edge rather than inside the service so that a deployment
 * without keys returns one clear 501 instead of failing deeper with a 500 about a
 * missing credential. The variable names are in the `message`, not in `details`:
 * `errorHandler` suppresses 5xx messages in production but always serialises
 * `details`, so this way an operator sees them in development and a stranger sees
 * nothing in production.
 */
function requirePaymentsConfigured(): void {
  if (!isRazorpayConfigured) {
    throw paymentNotConfigured(
      'Payments are not configured on this server. Set ' +
        `${RAZORPAY_ENV_VARS.join(', ')} in the backend environment.`,
    );
  }
}

function orderId(params: unknown): string {
  const parsed = orderIdParamSchema.safeParse(params);

  if (!parsed.success) {
    throw badRequest('INVALID_UUID', 'Order id must be a UUID.');
  }

  return parsed.data.id;
}

/**
 * Create a Razorpay Payment Link for an order.
 *
 * 201, because a payment link is a resource that did not exist before. The response
 * carries the provider-issued `short_url` verbatim; the client navigates to it and
 * must not build a URL of its own.
 */
paymentsRouter.post('/orders/:id/payment-link', async (req, res) => {
  requirePaymentsConfigured();

  const id = orderId(req.params);
  const parsed = authorisationSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    // An unapproved request is not a validation problem to be reported and
    // forgotten - it is an attempt to move money without a yes, and the service is
    // what records it. So hand it over unapproved and let it write the blocked row,
    // then answer 403.
    //
    // The one exception is a payload that is malformed in some *other* way, where
    // `approved` was in fact `true`. That is a genuine 400 and gets one.
    const approvedAnyway =
      typeof req.body === 'object' &&
      req.body !== null &&
      (req.body as { approved?: unknown }).approved === true;

    if (approvedAnyway) {
      throw badRequest('VALIDATION_ERROR', 'Invalid authorisation payload.', issues(parsed.error));
    }

    await issuePaymentLink({
      orderId: id,
      approved: false,
      approvalReason: 'Request carried no valid approval.',
      requestId: req.requestId,
    });

    // `issuePaymentLink` throws APPROVAL_REQUIRED for an unapproved request, so this
    // is unreachable. Kept as a hard stop rather than a comment: if that gate is
    // ever loosened, this must not fall through to a success response.
    throw badRequest('VALIDATION_ERROR', 'Invalid authorisation payload.', issues(parsed.error));
  }

  const view = await issuePaymentLink({
    orderId: id,
    approved: parsed.data.approved,
    approvalReason: parsed.data.approvalReason,
    conversationId: parsed.data.conversationId ?? null,
    requestId: req.requestId,
  });

  res.status(201).json({
    data: view,
    meta: {
      // Spelled out because a client holding a payment URL is the moment most
      // likely to be mistaken for a completed purchase.
      note:
        'Payment link issued. The order is PAYMENT_PENDING and no money has moved. ' +
        'It becomes PAID only when Razorpay confirms the payment.',
    },
    requestId: req.requestId,
  });
});

/** Current payment state as this server knows it. No provider call. */
paymentsRouter.get('/orders/:id/payment', async (req, res) => {
  requirePaymentsConfigured();

  const view = await getPaymentView(orderId(req.params));

  res.json({ data: view, requestId: req.requestId });
});

/**
 * Ask Razorpay for this order's payment link state and apply it.
 *
 * Two jobs, one implementation. In development it is what makes the money path
 * testable at all - Razorpay cannot deliver a webhook to localhost, but the server
 * can still ask. In production it is the reconciliation tool for a webhook that was
 * never delivered, because an order stuck in PAYMENT_PENDING is not evidence that
 * nobody paid.
 */
paymentsRouter.post('/orders/:id/payment/refresh', async (req, res) => {
  requirePaymentsConfigured();

  const view = await refreshPaymentStatus(orderId(req.params), { requestId: req.requestId });

  res.json({
    data: view,
    meta: { note: 'Reconciled against Razorpay. Status reflects what the provider reported.' },
    requestId: req.requestId,
  });
});
