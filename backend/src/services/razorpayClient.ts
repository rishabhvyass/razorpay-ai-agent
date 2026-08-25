/**
 * Razorpay REST client.
 *
 * ============================================================================
 * This is the ONLY file that knows a Razorpay credential exists.
 *
 * Nothing here reads or writes the database, and nothing here decides what a
 * payment outcome means. It speaks HTTP to Razorpay and hands back a validated
 * shape. Deciding that a given shape means "this order is PAID" belongs to
 * services/paymentService.ts, where it can be read next to the order row it is
 * about.
 * ============================================================================
 *
 * Why no `razorpay` npm package: the two calls this layer needs are plain JSON
 * over Basic auth, Node has `fetch` built in, and the one genuinely subtle piece -
 * webhook signature verification - is a `node:crypto` HMAC that must use a
 * timing-safe comparison. The SDK's helper does not. So the dependency would add
 * surface without covering the part that actually matters. See webhookService.ts.
 *
 * Two rules this file exists to hold:
 *
 *   1. Credentials never leave it. Not in a log line, not in an error message, not
 *      in an AppError's `details`. The Basic auth header is built per call and
 *      never stored anywhere a stack trace could reach.
 *
 *   2. Razorpay's response is VALIDATED, not cast. A missing `short_url` or a
 *      renamed `status` becomes a loud 502 here rather than an `undefined` that
 *      travels onward and gets compared against an order amount.
 */

import { z } from 'zod';

import { razorpayConfig } from '../config/env.js';
import { badGateway, internal } from '../utils/errors.js';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

/**
 * Razorpay is a hard dependency of a request that has already decided to spend
 * money, so a slow provider must not hold a socket open indefinitely. Ten seconds
 * is generous for these two endpoints and still well inside any sane client
 * timeout, so the caller learns it failed rather than guessing.
 */
const REQUEST_TIMEOUT_MS = 10_000;

// -----------------------------------------------------------------------------
// Response shapes
//
// Only the fields this application acts on are described. Razorpay sends a good
// deal more; `.loose()` keeps the rest rather than stripping it, because the full
// body is stored as the payment_events payload for audit and an unknown field is
// evidence, not noise.
// -----------------------------------------------------------------------------

/**
 * Payment Link lifecycle, as Razorpay reports it.
 *
 * `partially_paid` is accepted by the schema but is NOT treated as payment by
 * paymentService - links are created with `accept_partial: false`, so seeing it
 * would mean the provider did something we did not ask for, and the safe reading
 * of a part-paid order is "not paid".
 */
const PAYMENT_LINK_STATUSES = [
  'created',
  'partially_paid',
  'expired',
  'cancelled',
  'paid',
] as const;

export type PaymentLinkStatus = (typeof PAYMENT_LINK_STATUSES)[number];

/**
 * One payment attempt against a link.
 *
 * `status` is left as a free string rather than an enum: Razorpay documents
 * `created | authorized | captured | refunded | failed`, but an unrecognised value
 * must not fail validation of the whole response - a link we can still read the
 * status of is more useful than a 502. paymentService only ever tests for exact
 * values it knows.
 */
const paymentAttemptSchema = z.looseObject({
  payment_id: z.string().min(1),
  status: z.string().min(1),
  amount: z.number().int().nonnegative().optional(),
  method: z.string().optional(),
});

const paymentLinkSchema = z.looseObject({
  id: z.string().min(1),
  status: z.enum(PAYMENT_LINK_STATUSES),
  /** Provider-issued. The application never constructs a payment URL. */
  short_url: z.string().min(1),
  amount: z.number().int().nonnegative(),
  amount_paid: z.number().int().nonnegative().optional(),
  currency: z.string().min(3),
  /** Our order UUID, echoed back. */
  reference_id: z.string().nullish(),
  /**
   * Present on links created through recent API versions, absent on older ones,
   * which is why the column it lands in is nullable. Never required to identify
   * the order - `reference_id` and our own stored link id both do that.
   */
  order_id: z.string().nullish(),
  /** `null` until someone attempts payment. */
  payments: z.array(paymentAttemptSchema).nullish(),
});

export type RazorpayPaymentLink = z.infer<typeof paymentLinkSchema>;

/**
 * Razorpay's error envelope.
 *
 * Only `code` is read back out to a caller. `description`, `reason`, `source` and
 * `step` are free text written by the provider and routinely quote account
 * configuration, so they stay in `cause` where only the server log sees them.
 */
const providerErrorSchema = z.looseObject({
  error: z.looseObject({
    code: z.string().optional(),
    description: z.string().optional(),
  }),
});

// -----------------------------------------------------------------------------
// Transport
// -----------------------------------------------------------------------------

/**
 * Basic auth header.
 *
 * Built fresh per request and returned rather than cached in a module constant, so
 * there is no long-lived string holding the secret for a heap dump or a debugger
 * to find. The cost is one small base64 encode per payment call.
 */
function authorisationHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

/**
 * Credentials, or a thrown 500.
 *
 * Callers are expected to have checked `isRazorpayConfigured` at the route edge and
 * returned a 501 already, so reaching here unconfigured is a programming error
 * rather than a deployment one - hence `internal` rather than a friendly message.
 */
function requireConfig(): NonNullable<typeof razorpayConfig> {
  if (razorpayConfig === null) {
    throw internal('razorpayClient was called with no Razorpay credentials configured');
  }
  return razorpayConfig;
}

interface CallOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  /** Named in error messages so a failure says which call failed. */
  operation: string;
}

/**
 * One Razorpay call, with every failure mode turned into an AppError.
 *
 * Note the deliberate ordering: the response body is read as text FIRST, then
 * parsed. Razorpay answers some failures with an HTML error page rather than JSON,
 * and `response.json()` on those throws a SyntaxError whose message is the HTML -
 * which is how a provider outage turns into an unreadable 500. Reading text first
 * means a non-JSON body is reported as exactly that.
 */
async function call<T>(schema: z.ZodType<T>, options: CallOptions): Promise<T> {
  const { keyId, keySecret } = requireConfig();

  let response: Response;
  let rawBody: string;

  try {
    response = await fetch(`${RAZORPAY_API_BASE}${options.path}`, {
      method: options.method,
      headers: {
        Authorization: authorisationHeader(keyId, keySecret),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    rawBody = await response.text();
  } catch (cause) {
    // Network failure, DNS failure, or the timeout above. The distinction matters
    // to an operator reading logs but not to the caller, who gets the same 502
    // either way - and `cause` preserves it for the log.
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';

    throw badGateway(
      'PAYMENT_PROVIDER_ERROR',
      timedOut
        ? `Razorpay did not respond within ${REQUEST_TIMEOUT_MS / 1000}s (${options.operation}).`
        : `Could not reach Razorpay (${options.operation}).`,
      { cause, details: { operation: options.operation } },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (cause) {
    throw badGateway(
      'PAYMENT_PROVIDER_ERROR',
      `Razorpay returned a non-JSON response (${options.operation}).`,
      { cause, details: { operation: options.operation, providerHttpStatus: response.status } },
    );
  }

  if (!response.ok) {
    // The provider's machine-readable code is safe to pass on: it is a small
    // enumeration (BAD_REQUEST_ERROR, GATEWAY_ERROR, SERVER_ERROR). Its prose
    // `description` is not, and stays in `cause`.
    const providerError = providerErrorSchema.safeParse(parsedBody);

    // A 401/403 from Razorpay is not the caller's fault and must not be reported as
    // one - our own 401 would tell a customer they need to authenticate, when in
    // fact this server's key pair was rejected. It stays a 502 (the failure is
    // upstream of the request) with a message that names the real problem, so an
    // operator reading it reaches for the dashboard rather than the login page.
    const credentialsRejected = response.status === 401 || response.status === 403;

    throw badGateway(
      'PAYMENT_PROVIDER_ERROR',
      credentialsRejected
        ? `Razorpay rejected this server's credentials (${options.operation}). ` +
            'Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the backend environment.'
        : `Razorpay rejected the request (${options.operation}).`,
      {
        cause: parsedBody,
        details: {
          operation: options.operation,
          providerHttpStatus: response.status,
          ...(providerError.success && providerError.data.error.code !== undefined
            ? { providerErrorCode: providerError.data.error.code }
            : {}),
        },
      },
    );
  }

  const validated = schema.safeParse(parsedBody);

  if (!validated.success) {
    // A 200 whose shape we do not recognise is the most dangerous outcome of the
    // three, because it looks like success. Refusing it is what stops a renamed
    // field from being read as `undefined` and compared against an order amount.
    throw badGateway(
      'PAYMENT_PROVIDER_ERROR',
      `Razorpay returned an unrecognised response shape (${options.operation}).`,
      {
        cause: validated.error,
        details: {
          operation: options.operation,
          fields: validated.error.issues.map((issue) => issue.path.join('.') || '(root)'),
        },
      },
    );
  }

  return validated.data;
}

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

export interface CreatePaymentLinkInput {
  /** Minor units (paise for INR). Read from the order row, never from a request. */
  amountMinor: number;
  currency: string;
  /**
   * Our order UUID. Razorpay enforces uniqueness on it, which makes a duplicate
   * "create a link for this order" fail at the provider even if it somehow got
   * past the local check in paymentService.
   */
  referenceId: string;
  /** Shown to the customer on Razorpay's hosted page. */
  description: string;
  /**
   * Small string map echoed back on the link and on its webhooks. Useful for
   * correlating a delivery with the request that caused it. Razorpay caps this at
   * 15 keys and string values.
   */
  notes?: Record<string, string>;
}

/**
 * Create a hosted Payment Link.
 *
 * Notable choices, and why:
 *
 *   accept_partial: false   A part-payment cannot settle an order in this design.
 *                           Allowing it would mean deciding what a half-paid order
 *                           is, and there is no honest answer that is not "unpaid".
 *
 *   notify: both false      There is no authenticated user yet, so there is no
 *                           verified email or phone to notify. Sending to an
 *                           unverified address supplied by a client would be a way
 *                           to have Razorpay mail strangers on our behalf.
 *
 *   no callback_url         Razorpay would redirect the customer back to it after
 *                           payment, but a redirect arriving at our frontend is
 *                           the customer's browser asserting success - exactly the
 *                           claim this product refuses to act on. Status is
 *                           observed from the webhook or by asking Razorpay
 *                           directly. The UI already polls the order.
 *
 *   no expire_by            Razorpay's default validity applies. An explicit
 *                           expiry is not needed to exercise PAYMENT_EXPIRED - a
 *                           `payment_link.expired` webhook does that - and setting
 *                           one adds a way for a test link to die mid-test.
 */
export async function createPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<RazorpayPaymentLink> {
  return call(paymentLinkSchema, {
    method: 'POST',
    path: '/payment_links',
    operation: 'createPaymentLink',
    body: {
      amount: input.amountMinor,
      currency: input.currency,
      accept_partial: false,
      reference_id: input.referenceId,
      description: input.description,
      notify: { sms: false, email: false },
      reminder_enable: false,
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    },
  });
}

/**
 * Read a Payment Link's current state from Razorpay.
 *
 * This is the reconciliation path, and it is what makes the money flow testable
 * against a server on localhost: Razorpay cannot deliver a webhook to a private
 * address, but nothing stops us asking it what happened. The answer is still the
 * provider's, so "payment is verified by Razorpay" holds either way - the webhook
 * is push, this is pull, and both go through the same single writer.
 */
export async function fetchPaymentLink(paymentLinkId: string): Promise<RazorpayPaymentLink> {
  return call(paymentLinkSchema, {
    method: 'GET',
    path: `/payment_links/${encodeURIComponent(paymentLinkId)}`,
    operation: 'fetchPaymentLink',
  });
}

// -----------------------------------------------------------------------------
// Standard Checkout
//
// A second payment method, not a replacement. Payment Links hand the customer a
// provider-hosted page; Standard Checkout opens Razorpay's modal inside our own
// page. Both end at the same place - a payment Razorpay has captured - and both
// are read back through the same `paymentService.applyProviderState`.
//
// The extra machinery below exists because the modal path returns its outcome
// through the CUSTOMER'S BROWSER. Three values come back from `checkout.js`:
// payment id, order id, and an HMAC signature over the pair. The signature proves
// Razorpay issued them, and that is all it proves - it says nothing about how much
// was collected. So the browser's word is used only to look up the payment, and
// every figure acted on comes from `fetchPayment` below.
// -----------------------------------------------------------------------------

/**
 * Razorpay's minimum for an order, in minor units. ₹1.00.
 *
 * Enforced here as well as in the service so a sub-minimum amount fails with a
 * sentence rather than as an opaque BAD_REQUEST_ERROR from the provider.
 */
export const MINIMUM_ORDER_AMOUNT_MINOR = 100;

/**
 * Order lifecycle, as Razorpay reports it.
 *
 * `attempted` means at least one payment was tried against the order - it does NOT
 * mean money arrived, and paymentService treats it as no change. `paid` means the
 * full amount was captured.
 */
const ORDER_STATUSES = ['created', 'attempted', 'paid'] as const;

const orderSchema = z.looseObject({
  id: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  /** The figure we asked for, echoed back. Never treated as money collected. */
  amount: z.number().int().nonnegative(),
  /** Razorpay's own tally of what has been captured against this order. */
  amount_paid: z.number().int().nonnegative().optional(),
  currency: z.string().min(3),
  /** Our order UUID, echoed back. */
  receipt: z.string().nullish(),
});

export type RazorpayOrder = z.infer<typeof orderSchema>;

/**
 * One payment, as `GET /v1/payments/{id}` reports it.
 *
 * `status` is a free string for the same reason `paymentAttemptSchema.status` is:
 * an unrecognised value must not turn a readable payment into a 502. The documented
 * set is `created | authorized | captured | refunded | failed`, and paymentService
 * only ever tests for exact values it knows.
 *
 * `amount` is the load-bearing field and is required. For a captured payment it is
 * what Razorpay collected, which is the figure `applyProviderState` checks against
 * the order row. A response missing it is refused rather than read as `undefined`.
 */
const paymentSchema = z.looseObject({
  id: z.string().min(1),
  status: z.string().min(1),
  amount: z.number().int().nonnegative(),
  currency: z.string().min(3),
  /** The Razorpay order this payment settles. Cross-checked against ours. */
  order_id: z.string().nullish(),
  method: z.string().nullish(),
  /** Provider prose. Recorded for the audit trail, never shown to a customer. */
  error_code: z.string().nullish(),
  error_description: z.string().nullish(),
});

export type RazorpayPayment = z.infer<typeof paymentSchema>;

/** `GET /v1/orders/{id}/payments` - a collection envelope around the above. */
const paymentCollectionSchema = z.looseObject({
  count: z.number().int().nonnegative(),
  items: z.array(paymentSchema),
});

export interface CreateOrderInput {
  /** Minor units. Read from the order row, never from a request body. */
  amountMinor: number;
  currency: string;
  /**
   * Our order UUID. Razorpay's `receipt` field, which is exactly what it is for -
   * "your own identifier for this order". Capped at 40 characters by the provider;
   * a UUID is 36.
   */
  receipt: string;
  notes?: Record<string, string>;
}

/**
 * Create a Razorpay Order for the Standard Checkout modal.
 *
 * The order is what binds an amount to a checkout session BEFORE the browser is
 * involved. `checkout.js` is handed only this order's id; it cannot name a price,
 * because the price is already fixed here, server-side, from our own order row.
 * That is the property that makes a browser-driven payment method safe at all.
 *
 * `payment_capture` is deliberately NOT sent. It is a legacy flag, the account-level
 * auto-capture setting supersedes it, and relying on either would make the outcome
 * depend on dashboard configuration. `checkoutService` captures explicitly instead,
 * so an authorised payment settles the same way on every account.
 */
export async function createOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  return call(orderSchema, {
    method: 'POST',
    path: '/orders',
    operation: 'createOrder',
    body: {
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.receipt,
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    },
  });
}

/**
 * Read one payment from Razorpay.
 *
 * THIS IS THE CALL THAT MAKES THE MODAL PATH TRUSTWORTHY. The browser's success
 * handler supplies a payment id and a signature proving Razorpay issued it. It does
 * not supply - and is never asked for - the amount, the currency, or the status.
 * Those are read here, from Razorpay, over an authenticated connection the customer
 * has no part in.
 */
export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return call(paymentSchema, {
    method: 'GET',
    path: `/payments/${encodeURIComponent(paymentId)}`,
    operation: 'fetchPayment',
  });
}

/**
 * Capture an authorised payment.
 *
 * Standard Checkout leaves a payment `authorized` unless the account has
 * auto-capture switched on, and an authorised payment is a hold, not money. Rather
 * than treat "authorized" as paid - which would report a settled order for funds
 * that were never taken - the service captures explicitly and acts on the result.
 *
 * Razorpay requires `amount` and `currency` here and REJECTS a capture whose amount
 * differs from the authorised amount. That makes this call an amount check in its
 * own right: passing our order's figure means a payment authorised for anything else
 * fails to capture instead of quietly settling.
 */
export async function capturePayment(
  paymentId: string,
  amountMinor: number,
  currency: string,
): Promise<RazorpayPayment> {
  return call(paymentSchema, {
    method: 'POST',
    path: `/payments/${encodeURIComponent(paymentId)}/capture`,
    operation: 'capturePayment',
    body: { amount: amountMinor, currency },
  });
}

/**
 * Every payment attempted against a Razorpay Order.
 *
 * The reconciliation path for the modal method, and the counterpart to
 * `fetchPaymentLink` for links: it is how an order paid in a modal reaches PAID on a
 * backend Razorpay cannot deliver a webhook to, and how a lost webhook is recovered
 * in a deployment that it can. Needed because a customer who closes the tab between
 * paying and the success handler firing has still paid.
 */
export async function fetchOrderPayments(razorpayOrderId: string): Promise<RazorpayPayment[]> {
  const collection = await call(paymentCollectionSchema, {
    method: 'GET',
    path: `/orders/${encodeURIComponent(razorpayOrderId)}/payments`,
    operation: 'fetchOrderPayments',
  });

  return collection.items;
}
