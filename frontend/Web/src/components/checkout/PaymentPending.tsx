import { Link } from 'react-router-dom';
import { ExternalLink, Hourglass, Info, Loader2, RefreshCw } from 'lucide-react';
import { Badge, Button, ErrorState, MockNotice } from '@/components/ui';
import { AGENT_PHASE_LABEL } from '@/hooks/useCheckoutSession';
import { PaymentSteps } from './PaymentSteps';
import { formatMinor } from '@/lib/money';
import type { ReactNode } from 'react';
import type { Order } from '@/types';

/**
 * Waiting on the payment provider.
 *
 * The wording matters here. This state does not say "processing" or "almost done",
 * because the app does not know: the customer may be mid-payment, may have closed
 * the tab, or may never return. It says what is true - a payment was started and
 * nothing is confirmed until the provider says so.
 *
 * There is no client-side timer that flips this to success. Only a backend status
 * change, observed by the poll, can do that.
 */
export function PaymentPending({
  order,
  paymentUrl,
  isMock,
  checkout,
  onSimulate,
  simulateError,
  simulating = false,
  onReconcile,
  reconcileError,
  reconciling = false,
}: {
  order: Order;
  paymentUrl: string | null;
  isMock: boolean;
  /**
   * The in-page Standard Checkout control, when this order can use it. Passed in
   * rather than rendered here so this component stays presentational and the two
   * payment methods stay separable - an order has one instrument, never both.
   */
  checkout?: ReactNode;
  /** Mock only. Provided so a reviewer can reach both outcomes deliberately. */
  onSimulate?: (outcome: 'success' | 'failure') => void;
  /** A settlement attempt that failed. Surfaced rather than swallowed. */
  simulateError?: unknown;
  simulating?: boolean;
  /**
   * Real mode only. Asks the backend to read this payment's state from Razorpay and
   * apply whatever the provider reports. It cannot make a payment succeed - it carries
   * no payment information, only the order id - which is why offering it here is not a
   * back door into the status the rest of this component refuses to fabricate.
   */
  onReconcile?: () => void;
  reconcileError?: unknown;
  reconciling?: boolean;
}) {
  // A leading slash means the link is this app's simulated checkout route. Anything
  // else is a provider-issued URL and must open in its own tab.
  const isInternal = Boolean(paymentUrl?.startsWith('/'));

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <Badge tone="warning" icon={<Hourglass className="size-3" aria-hidden />} pulse>
          Awaiting payment
        </Badge>
        <span className="text-faint inline-flex items-center gap-1.5 text-[11px]">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Checking with the backend
        </span>
      </div>

      <PaymentSteps order={order} paymentUrl={paymentUrl} />

      <p className="text-ink text-[13px] font-medium">Complete the payment to continue.</p>

      {/* Three different sentences, because the state genuinely differs and each of
          the other two was previously asserted for all of them. A link was issued; a
          checkout session is open and payable in-page; or nothing has been started at
          all - the interface used to claim a payment link existed while the block
          below it said none did. */}
      <p className="text-muted text-[13px] leading-relaxed">
        {paymentUrl
          ? `A payment link for ${formatMinor(order.amount, order.currency)} has been issued.`
          : checkout
            ? `A secure Razorpay checkout is ready for the ${formatMinor(order.amount, order.currency)} due.`
            : `No payment has been started for the ${formatMinor(order.amount, order.currency)} due.`}{' '}
        This page is polling the backend and will update on its own — it will only report success
        once Razorpay confirms the payment was captured.
      </p>

      {paymentUrl ? (
        isInternal ? (
          <Link
            to={paymentUrl}
            className="bg-accent hover:bg-accent-700 rounded-control inline-flex h-10 w-full items-center justify-center gap-2 px-4 text-sm font-medium text-white transition-colors"
          >
            Open simulated checkout
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent hover:bg-accent-700 rounded-control inline-flex h-10 w-full items-center justify-center gap-2 px-4 text-sm font-medium text-white transition-colors"
          >
            Complete payment
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )
      ) : checkout ? (
        checkout
      ) : (
        <div className="rounded-control border-line bg-surface-sunken flex items-start gap-2.5 border px-3 py-2.5">
          <Info className="text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p className="text-muted text-xs leading-relaxed">
            No payment has been started for this order, so there is nothing to pay yet and nothing
            has been charged. Razorpay issues the payment server-side when a purchase is authorised;
            this app never constructs a payment URL of its own.
          </p>
        </div>
      )}

      {onReconcile ? (
        <div className="space-y-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onReconcile}
            loading={reconciling}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            fullWidth
          >
            Check with Razorpay
          </Button>
          <p className="text-faint text-[11px] leading-relaxed">
            Reads this payment&apos;s state from Razorpay and applies what the provider reports.
            Worth pressing if the backend is running locally, where Razorpay has no public URL to
            deliver its webhook to. It cannot make a payment succeed: the status that appears is the
            provider&apos;s answer, whatever that is.
          </p>
          {reconciling ? (
            <p className="text-muted text-[12px]" role="status" aria-live="polite">
              {AGENT_PHASE_LABEL['verifying-payment']}: asking Razorpay what happened to this
              payment.
            </p>
          ) : null}
          {reconcileError ? <ErrorState error={reconcileError} compact /> : null}
        </div>
      ) : null}

      {isMock && onSimulate ? (
        <div className="space-y-2">
          <MockNotice>
            The payment provider is simulated. Use the controls below to settle this payment either
            way — a real deployment has no such controls, because only a signature-verified webhook
            can change an order's status.
          </MockNotice>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => onSimulate('success')}
              loading={simulating}
              className="flex-1"
            >
              Simulate verified payment
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSimulate('failure')}
              disabled={simulating}
              className="flex-1"
            >
              Simulate failure
            </Button>
          </div>
          {/* Named work rather than a bare disabled state, and the same string the
              chat surface uses for this phase, so the two cannot drift. It is only
              rendered while the settlement call is actually awaiting - spec section
              33's labels describe requests in flight, not a spinner on a timer. */}
          {simulating ? (
            <p className="text-muted text-[12px]" role="status" aria-live="polite">
              {AGENT_PHASE_LABEL['verifying-payment']} — waiting for the simulated provider to
              settle this order.
            </p>
          ) : null}
          {/* A settlement can legitimately fail - no overlay exists for this order
              id in this browser. Swallowing it left the buttons looking inert. */}
          {simulateError ? <ErrorState error={simulateError} compact /> : null}
        </div>
      ) : null}
    </div>
  );
}
