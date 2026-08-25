/**
 * Razorpay Standard Checkout, wrapped in a promise.
 *
 * `checkout.js` is a callback-and-events API: a `handler` for success, a
 * `modal.ondismiss` for the user closing the modal, and a `payment.failed` event for
 * a declined attempt. Left as-is, every caller has to get the interaction between
 * those three right, and getting it wrong has a specific failure mode - a UI that
 * reports success because `handler` was wired but dismissal was not.
 *
 * So this module owns that interaction and hands back one settled outcome:
 *
 *   completed   Razorpay's three values, to be POSTed to the backend for
 *               verification. NOT a payment confirmation - see below.
 *   dismissed   The customer closed the modal. Nothing was paid, or nothing was
 *               confirmed; either way there is nothing to report as done.
 *   failed      An attempt was declined and the customer then gave up.
 *
 * ---------------------------------------------------------------------------
 * `completed` DOES NOT MEAN PAID, and nothing in this file should be read as
 * saying it does. It means Razorpay handed this browser a signed triple. Whether
 * money was captured, and how much, is established by the backend: it verifies the
 * signature, reads the payment back from Razorpay over its own authenticated
 * connection, and compares the captured amount to the order row. The status the UI
 * shows always comes from that answer.
 * ---------------------------------------------------------------------------
 *
 * The script is loaded on demand rather than from a tag in index.html. Two reasons:
 * every page in this app would otherwise fetch a third-party script it has no use
 * for, and - the load-bearing one - a blocked or unreachable CDN becomes a rejected
 * promise with a sentence in it, instead of `window.Razorpay` being quietly
 * undefined at the moment the customer presses pay.
 */

const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/** The three values Razorpay's success handler supplies. Nothing else is read. */
export interface CheckoutHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export type CheckoutOutcome =
  | { kind: 'completed'; response: CheckoutHandlerResponse }
  | { kind: 'dismissed' }
  | { kind: 'failed'; code: string | null; description: string | null };

export interface OpenCheckoutOptions {
  /** Publishable key id, from the backend's create-order response. */
  keyId: string;
  /** Razorpay's order id. The amount is already bound to it, server-side. */
  razorpayOrderId: string;
  /** Minor units. Display only - Razorpay charges what the order says. */
  amount: number;
  currency: string;
  name: string;
  description: string;
}

/**
 * Minimal structural types for the global the script installs.
 *
 * Hand-written rather than pulled from a `@types` package: this is the entire
 * surface used, and declaring it here keeps what the app depends on visible instead
 * of importing a definition of the whole SDK.
 */
interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

/**
 * Memoised so a customer who dismisses and retries does not refetch the script, and
 * so two components mounting at once do not insert two tags. The promise is cleared
 * on failure, which is what makes a retry after a network blip work.
 */
let loader: Promise<RazorpayConstructor> | null = null;

export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  if (window.Razorpay !== undefined) {
    return Promise.resolve(window.Razorpay);
  }

  loader ??= new Promise<RazorpayConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT_URL}"]`,
    );

    const script = existing ?? document.createElement('script');

    const onLoad = (): void => {
      // Loaded but no global is a real outcome, not a theoretical one: an ad
      // blocker or a corporate proxy can serve a 200 with an empty body, which
      // fires `load` and installs nothing.
      if (window.Razorpay === undefined) {
        reject(
          new Error(
            'Razorpay Checkout loaded but did not initialise. An extension or network filter ' +
              'may have blocked it. Payment was not started.',
          ),
        );
        return;
      }
      resolve(window.Razorpay);
    };

    script.addEventListener('load', onLoad);
    script.addEventListener('error', () => {
      reject(
        new Error(
          "Could not load Razorpay's checkout script. Check the connection and try again - " +
            'nothing has been charged.',
        ),
      );
    });

    if (existing === null) {
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      document.head.append(script);
    }
  }).catch((error: unknown) => {
    // Clearing the memo is what makes the next press retry rather than replay the
    // stored rejection forever.
    loader = null;
    throw error;
  });

  return loader;
}

/**
 * Open the modal and resolve once the customer is finished with it.
 *
 * The settlement discipline here is the whole point. Razorpay can fire `handler`,
 * `payment.failed` and `ondismiss` in combination - a declined card fires
 * `payment.failed` and leaves the modal OPEN so the customer can retry, and a
 * successful payment fires `handler` and then usually `ondismiss` as the modal
 * closes. So:
 *
 *   - `settle` runs once. Whichever outcome arrives first wins, and later callbacks
 *     are ignored. Without this a success followed by a dismiss would overwrite a
 *     completed payment with "dismissed".
 *   - `payment.failed` does NOT settle. It records the reason, because the customer
 *     may still succeed on a retry. Only `ondismiss` - the customer actually giving
 *     up - settles, and it reports the recorded failure if there was one.
 */
export async function openRazorpayCheckout(
  options: OpenCheckoutOptions,
): Promise<CheckoutOutcome> {
  const Razorpay = await loadRazorpayCheckout();

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    let lastFailure: { code: string | null; description: string | null } | null = null;

    const settle = (outcome: CheckoutOutcome): void => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const instance = new Razorpay({
      key: options.keyId,
      // Sent because Razorpay's modal renders them. They are not what gets charged:
      // the amount is fixed to `order_id` server-side, so a tampered value here
      // produces a modal that disagrees with the charge rather than a cheaper one.
      amount: options.amount,
      currency: options.currency,
      name: options.name,
      description: options.description,
      order_id: options.razorpayOrderId,
      handler: (response: unknown) => {
        const parsed = readHandlerResponse(response);

        if (parsed === null) {
          // Razorpay called success without the fields needed to verify it. Reported
          // as a failure rather than a completion, because a completion this app
          // cannot get verified is not one it may show as paid.
          settle({
            kind: 'failed',
            code: null,
            description:
              'Razorpay reported a completed payment without the values needed to verify it. ' +
              'Use "Check with Razorpay" to reconcile this order.',
          });
          return;
        }

        settle({ kind: 'completed', response: parsed });
      },
      modal: {
        ondismiss: () => {
          settle(lastFailure === null ? { kind: 'dismissed' } : { kind: 'failed', ...lastFailure });
        },
        // Razorpay's own confirm-before-close prompt. Left on: closing the modal
        // mid-payment is easy to do by accident and expensive to redo.
        confirm_close: true,
        escape: true,
      },
      // Razorpay retries some methods inside the modal, so a failure is not
      // necessarily the end of the session.
      retry: { enabled: true },
      theme: { color: '#4f46e5' },
    });

    instance.on('payment.failed', (payload: unknown) => {
      lastFailure = readFailure(payload);
    });

    instance.open();
  });
}

function str(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** All three fields or nothing. A partial triple cannot be verified. */
function readHandlerResponse(response: unknown): CheckoutHandlerResponse | null {
  if (typeof response !== 'object' || response === null) return null;

  const source = response as Record<string, unknown>;

  const paymentId = str(source, 'razorpay_payment_id');
  const orderId = str(source, 'razorpay_order_id');
  const signature = str(source, 'razorpay_signature');

  if (paymentId === null || orderId === null || signature === null) return null;

  return {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature,
  };
}

/**
 * Read `payment.failed`'s error, defensively.
 *
 * `description` is Razorpay's own prose and is shown to the customer - it is the one
 * place provider text is surfaced, because "your card was declined by the issuing
 * bank" is genuinely more useful than anything this app could write. It is provider
 * copy about the customer's own payment attempt, not account or credential detail.
 */
function readFailure(payload: unknown): { code: string | null; description: string | null } {
  if (typeof payload !== 'object' || payload === null) {
    return { code: null, description: null };
  }

  const error = (payload as { error?: unknown }).error;

  if (typeof error !== 'object' || error === null) {
    return { code: null, description: null };
  }

  const source = error as Record<string, unknown>;

  return { code: str(source, 'code'), description: str(source, 'description') };
}
