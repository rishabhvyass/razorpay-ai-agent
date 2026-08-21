import { Link } from 'react-router-dom';
import { ExternalLink, Hourglass, Info, Loader2 } from 'lucide-react';
import { Badge, Button, MockNotice } from '@/components/ui';
import { formatMinor } from '@/lib/money';
import type { Order } from '@/types';

/**
 * Waiting on the payment provider.
 *
 * The wording matters here. This state does not say "processing" or "almost done",
 * because the app does not know: the customer may be mid-payment, may have closed
 * the tab, or may never return. It says what is true - a link was issued and
 * nothing is confirmed until the provider says so.
 *
 * There is no client-side timer that flips this to success. Only a backend status
 * change, observed by the poll, can do that.
 */
export function PaymentPending({
  order,
  paymentUrl,
  isMock,
  onSimulate,
}: {
  order: Order;
  paymentUrl: string | null;
  isMock: boolean;
  /** Mock only. Provided so a reviewer can reach both outcomes deliberately. */
  onSimulate?: (outcome: 'success' | 'failure') => void;
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

      <p className="text-muted text-[13px] leading-relaxed">
        A payment link for {formatMinor(order.amount, order.currency)} has been issued. This page is
        polling the backend and will update on its own — it will only report success once Razorpay
        confirms the payment with a verified webhook.
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
      ) : (
        <div className="rounded-control border-line bg-surface-sunken flex items-start gap-2.5 border px-3 py-2.5">
          <Info className="text-muted mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p className="text-muted text-xs leading-relaxed">
            No payment link has been issued. Razorpay order creation and payment links live in the
            backend's payments layer, which is not implemented yet, so this app did not construct a
            link of its own.
          </p>
        </div>
      )}

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
              className="flex-1"
            >
              Simulate verified payment
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSimulate('failure')}
              className="flex-1"
            >
              Simulate failure
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
