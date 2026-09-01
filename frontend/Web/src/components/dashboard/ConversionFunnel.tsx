import { cn } from '@/lib/cn';
import { ErrorState, SkeletonText } from '@/components/ui';
import type { Order } from '@/types';

/**
 * The six-stage conversion funnel from spec section 27.
 *
 * Conversation started -> Product selected -> Purchase approved -> Payment initiated
 * -> Payment verified -> Order completed.
 *
 * All six stages are shown, because the shape of the funnel is part of what the demo
 * is arguing: money only moves at the far end, after an explicit approval and a
 * verified webhook. But only the stages a real endpoint can measure carry a number.
 *
 * The first two cannot be measured and say so:
 *
 *   - "Conversation started" would need a count of conversations. No endpoint lists
 *     them; `GET /api/conversations/:id` reads one by id. Counting distinct
 *     `conversationId`s on the orders in hand would only count conversations that
 *     already reached an order - which is stage three, not stage one - and would make
 *     every percentage beneath it wrong.
 *   - "Product selected" would need a per-conversation selection event. Agent actions
 *     are recorded per conversation, and there is no endpoint that aggregates them
 *     across conversations.
 *
 * A funnel is exactly where an invented top-of-funnel number does the most damage, so
 * those rows read "Not measurable" rather than "0". Everything below them is computed
 * from order rows the backend returned, cumulatively: a PAID order counts at every
 * earlier measurable stage too, because it really did pass through them.
 */

/** Statuses that prove a payment was actually requested from the provider. */
const PAYMENT_INITIATED: ReadonlyArray<Order['status']> = [
  'ORDER_CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'PAYMENT_FAILED',
  'PAYMENT_EXPIRED',
];

interface Stage {
  key: string;
  label: string;
  description: string;
  tone: string;
  /** null when no endpoint can measure the stage. Rendered as "Not measurable". */
  count: number | null;
}

export function ConversionFunnel({
  orders,
  isPending = false,
  error,
  onRetry,
}: {
  orders: Order[];
  isPending?: boolean;
  /** The query behind `orders` failed. An empty array is not a measured zero. */
  error?: unknown;
  onRetry?: () => void;
}) {
  // A funnel drawn from an empty array looks identical whether nothing has happened
  // or the read failed - six stages of zero, with "No orders yet" underneath
  // asserting the first of those. So neither state is drawn at all.
  if (error) {
    return <ErrorState error={error} compact {...(onRetry ? { onRetry } : {})} />;
  }

  if (isPending) {
    return <SkeletonText lines={6} />;
  }

  // Every order row exists because someone pressed the confirmation button:
  // `confirmPurchase` is the only caller of POST /api/orders in the whole app.
  const approved = orders.length;
  const initiated = orders.filter((order) => PAYMENT_INITIATED.includes(order.status)).length;
  const verified = orders.filter((order) => order.status === 'PAID').length;

  const stages: Stage[] = [
    {
      key: 'conversation',
      label: 'Conversation started',
      description: 'No endpoint counts conversations, so this stage is not measured',
      tone: 'bg-line-strong',
      count: null,
    },
    {
      key: 'selected',
      label: 'Product selected',
      description: 'Selection is not recorded as a countable event',
      tone: 'bg-line-strong',
      count: null,
    },
    {
      key: 'approved',
      label: 'Purchase approved',
      description: 'User explicitly authorised and an order row was written',
      tone: 'bg-accent',
      count: approved,
    },
    {
      key: 'initiated',
      label: 'Payment initiated',
      description: 'A payment was requested from the provider',
      tone: 'bg-warning',
      count: initiated,
    },
    {
      key: 'verified',
      label: 'Payment verified',
      description: 'Confirmed by a signature-verified Razorpay webhook',
      tone: 'bg-success',
      count: verified,
    },
    {
      key: 'completed',
      label: 'Order completed',
      description: 'PAID is the terminal success state; the schema has no separate fulfilment step',
      tone: 'bg-success',
      count: verified,
    },
  ];

  // Percentages are relative to the first stage that is actually measured, not to an
  // imagined top of funnel.
  const baseline = stages.find((stage) => stage.count !== null)?.count ?? 0;

  return (
    <div className="space-y-3.5">
      {stages.map((stage, index) => {
        if (stage.count === null) {
          return (
            <div key={stage.key}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-muted text-[13px] font-medium">{stage.label}</p>
                <p className="text-faint shrink-0 text-[11px] font-medium">Not measurable</p>
              </div>

              {/* A dashed rail rather than a filled bar: there is no value to draw, and
                  an empty bar would read as zero. */}
              <div
                className="border-line-strong mt-1.5 h-2 rounded-full border border-dashed"
                aria-hidden
              />

              <p className="text-faint mt-1 text-[11px]">{stage.description}</p>
            </div>
          );
        }

        // Compare against the previous measured stage, skipping the unmeasured ones.
        const previous = stages
          .slice(0, index)
          .reverse()
          .find((candidate) => candidate.count !== null)?.count;
        const widthPercent = baseline === 0 ? 0 : Math.round((stage.count / baseline) * 100);
        // `.find()` does not narrow through its predicate, so `previous` is still
        // `number | null | undefined` here even though the predicate excluded null.
        const stepPercent =
          previous === null || previous === undefined || previous === 0
            ? null
            : Math.round((stage.count / previous) * 100);

        return (
          <div key={stage.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-ink text-[13px] font-medium">{stage.label}</p>
              <p className="text-ink nums shrink-0 text-[13px] font-semibold">
                {stage.count}
                {stepPercent !== null ? (
                  <span className="text-faint ml-1.5 text-[11px] font-normal">
                    {stepPercent}% of previous
                  </span>
                ) : null}
              </p>
            </div>

            <div className="bg-surface-sunken mt-1.5 h-2 overflow-hidden rounded-full">
              {/*
                Width, on the large token: this bar is the one thing on the dashboard
                whose length carries a figure, so it moves when the figure changes and
                is otherwise still. `transition-all` was also animating the tone colour
                over half a second, which is longer than any token in the system.
              */}
              <div
                className={cn('motion-large h-full rounded-full transition-[width]', stage.tone)}
                style={{ width: `${widthPercent}%` }}
                role="presentation"
              />
            </div>

            <p className="text-faint mt-1 text-[11px]">{stage.description}</p>
          </div>
        );
      })}

      {orders.length === 0 ? (
        <p className="text-faint text-[12px] leading-relaxed">
          No orders yet, so every measured stage is zero. Complete a checkout to populate the funnel.
        </p>
      ) : null}
    </div>
  );
}
