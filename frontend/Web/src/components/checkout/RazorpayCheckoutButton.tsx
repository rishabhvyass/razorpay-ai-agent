import { useRef, useState } from 'react';
import { Info, Lock, ShieldCheck } from 'lucide-react';
import { Button, ErrorState } from '@/components/ui';
import { AGENT_PHASE_LABEL } from '@/hooks/useCheckoutSession';
import { config } from '@/lib/config';
import { describePurchase } from '@/lib/format';
import { formatMinor } from '@/lib/money';
import { openRazorpayCheckout, type CheckoutOutcome } from '@/lib/razorpayCheckout';
import {
  createRazorpayCheckoutSession,
  verifyRazorpayPayment,
  type PaymentView,
} from '@/services/paymentService';
import type { Order, Product } from '@/types';

/**
 * Pay in-page with Razorpay Standard Checkout.
 *
 * The whole method, in one component, because it is one uninterruptible sequence and
 * splitting it across a hook and a view would mean two places that can each believe
 * the payment is finished:
 *
 *   1. POST /api/create-order    the gated MONEY_ACTION. Approval-checked and audited
 *                               server-side; idempotent, so a second press reuses the
 *                               session rather than opening a way to be charged twice.
 *   2. open the modal            Razorpay collects the card. This app never sees it.
 *   3. POST /api/verify-payment  the modal's three values, verified server-side.
 *   4. render what came back     the order status from the database.
 *
 * ---------------------------------------------------------------------------
 * STEP 4 IS NOT OPTIONAL, AND IT IS WHY THIS COMPONENT HAS NO SUCCESS STATE OF ITS
 * OWN. Reaching step 3 without an error is not the same as being paid: the backend
 * verifies the signature, then reads the payment back from Razorpay and compares the
 * captured amount against the order row before writing anything. A signed triple for
 * an authorised-but-uncaptured payment, or for the wrong amount, produces a 200 and
 * an order that is still not PAID.
 *
 * So the verified view is handed to `onSettled` and the surrounding card renders
 * whatever status it carries. This component reports only what it did - prepared,
 * waited, verified - never what the payment turned out to be.
 * ---------------------------------------------------------------------------
 */

/** Shown as the merchant name in Razorpay's modal. */
const MERCHANT_NAME = 'Checkout Concierge';

type Stage = 'idle' | 'preparing' | 'awaiting' | 'verifying';

export function RazorpayCheckoutButton({
  order,
  product,
  onSettled,
  onSessionOpened,
}: {
  order: Order;
  /** Only for the audit-trail reason and the modal's description line. */
  product?: Product | null;
  /**
   * The verified payment view, straight from `POST /api/verify-payment`. It is the
   * database's current answer for this order, and the caller should render it rather
   * than assume the payment succeeded because this fired.
   */
  onSettled: (view: PaymentView) => void;
  /**
   * A Razorpay order now exists and our row has moved to PAYMENT_PENDING. Lets the
   * caller refresh, so the surface stops saying no payment has been started while the
   * modal is open over it.
   */
  onSessionOpened?: () => void;
}) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<unknown>(null);
  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null);

  // A guard for the whole sequence rather than for the button alone. The button is
  // disabled while `stage !== 'idle'`, but the modal is Razorpay's own overlay and the
  // page behind it stays interactive, so a keyboard-triggered second press is
  // reachable. Two sessions for one order is exactly what must not happen.
  const running = useRef(false);

  const amount = formatMinor(order.amount, order.currency);

  const pay = async () => {
    if (running.current) return;
    running.current = true;

    setError(null);
    setOutcome(null);
    setStage('preparing');

    try {
      // The click is the approval, and this sentence is what the backend records
      // against the MONEY_ACTION. It names the product, the quantity and the amount
      // the customer was actually shown - a reason reading "user approved" documents
      // nothing a reviewer could check. The amount is the order row's own figure.
      const description = describePurchase(order, product);

      const session = await createRazorpayCheckoutSession(
        order.id,
        `Customer authorised payment of ${amount} for ${description}.`,
      );

      // The row is PAYMENT_PENDING from here on, whatever happens in the modal.
      onSessionOpened?.();

      // The backend returns the key that created this Razorpay order, so it is the one
      // that can pay it. `VITE_RAZORPAY_KEY_ID` is optional and used only as a
      // cross-check: if the two disagree, the browser is configured against a
      // different Razorpay account than the server, and the modal would fail with
      // Razorpay's own opaque error. Better to say which two things disagree.
      if (config.razorpayKeyId !== null && config.razorpayKeyId !== session.key_id) {
        throw new Error(
          'This app is built with a VITE_RAZORPAY_KEY_ID that does not match the key the ' +
            'server used to create the payment. Nothing was charged. Remove the frontend ' +
            'variable, or point both at the same Razorpay account.',
        );
      }

      setStage('awaiting');

      const result = await openRazorpayCheckout({
        keyId: session.key_id,
        razorpayOrderId: session.order_id,
        amount: session.amount,
        currency: session.currency,
        name: MERCHANT_NAME,
        description: session.description,
      });

      if (result.kind !== 'completed') {
        // Dismissed, or declined and then abandoned. Neither is an error and neither
        // is reported as one: no money moved, and the order is still payable.
        setOutcome(result);
        setStage('idle');
        return;
      }

      setStage('verifying');

      const view = await verifyRazorpayPayment(order.id, result.response);

      setStage('idle');
      onSettled(view);
    } catch (cause) {
      setError(cause);
      setStage('idle');
    } finally {
      running.current = false;
    }
  };

  const busy = stage !== 'idle';

  return (
    <div className="space-y-2.5">
      <Button
        variant="primary"
        size="md"
        onClick={() => void pay()}
        loading={stage === 'preparing' || stage === 'verifying'}
        disabled={busy}
        icon={busy ? undefined : <Lock className="size-3.5" aria-hidden />}
        fullWidth
      >
        {stage === 'preparing'
          ? 'Opening secure checkout…'
          : stage === 'awaiting'
            ? 'Complete the payment in the Razorpay window'
            : stage === 'verifying'
              ? `${AGENT_PHASE_LABEL['verifying-payment']}…`
              : `Pay ${amount} securely`}
      </Button>

      {/* The stage is announced because the modal takes focus away from this button,
          and on return the only thing that changed may be this line. Spec section 37:
          the state is in the text, not only in the spinner. */}
      <p className="sr-only" role="status" aria-live="polite">
        {stage === 'preparing'
          ? 'Opening Razorpay checkout. Nothing has been charged yet.'
          : stage === 'awaiting'
            ? 'The Razorpay payment window is open. Complete the payment there.'
            : stage === 'verifying'
              ? 'Verifying the payment with the backend. The result will replace this card.'
              : ''}
      </p>

      {stage === 'idle' && outcome === null && error === null ? (
        <p className="text-faint text-[11px] leading-relaxed">
          Razorpay collects the card details in its own window — they never reach this app or its
          backend. The amount is fixed to the order server-side, and this page will only report
          success once Razorpay confirms the payment was captured.
        </p>
      ) : null}

      {stage === 'verifying' ? (
        <p className="text-muted text-[12px] leading-relaxed" role="status" aria-live="polite">
          Razorpay returned a signed result. The backend is checking the signature and reading the
          payment back from Razorpay before anything is marked paid.
        </p>
      ) : null}

      {/* A dismissed modal is a perfectly ordinary thing to do and is reported as
          information, not failure. It says what is true - nothing was charged - and
          then hedges honestly: this app cannot see inside the modal, so if the
          customer did pay and closed it before Razorpay called back, reconciliation is
          the way to find out. */}
      {outcome?.kind === 'dismissed' ? (
        <div className="rounded-control border-line bg-surface-sunken flex items-start gap-2.5 border px-3 py-2.5">
          <Info className="text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p className="text-muted text-xs leading-relaxed">
            Checkout was closed, so nothing has been charged and this order is still payable. If
            you did complete a payment, use <strong>Check with Razorpay</strong> below — it asks the
            provider what happened rather than guessing.
          </p>
        </div>
      ) : null}

      {outcome?.kind === 'failed' ? (
        <div className="rounded-control border-danger-line bg-danger-bg flex items-start gap-2.5 border px-3 py-2.5">
          <ShieldCheck className="text-danger mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="text-danger text-xs leading-relaxed font-medium">
              The payment did not go through, so nothing was charged.
            </p>
            {/* Razorpay's own words about the customer's own attempt - "card declined
                by the issuing bank" is more use than anything this app could write.
                Provider copy about a payment attempt, never account detail. */}
            {outcome.description !== null ? (
              <p className="text-muted text-xs leading-relaxed">
                Razorpay reported: {outcome.description}
              </p>
            ) : null}
            <p className="text-muted text-xs leading-relaxed">
              You can try again — the same order and amount are reused, so retrying cannot create a
              second charge.
            </p>
          </div>
        </div>
      ) : null}

      {/* Covers all three failure classes: the script never loaded, the backend
          refused to open a session (no approval, wrong state, a link already issued),
          or verification was rejected. All of them mean no confirmed payment, and
          ErrorState carries the backend's code and request id for tracing. */}
      {error ? <ErrorState error={error} onRetry={() => void pay()} compact /> : null}
    </div>
  );
}
