import { cn } from '@/lib/cn';
import type { Order } from '@/types';

/**
 * Order lifecycle funnel.
 *
 * Computed from the order rows the app actually has - nothing is modelled or
 * extrapolated. The stages are cumulative and derived from status, so a PAID order
 * counts at every earlier stage too: it really did pass through them.
 *
 * "Conversations" is deliberately absent as a stage. There is no endpoint that lists
 * conversations, so the app cannot know how many were started, and a funnel whose
 * first stage is a guess makes every percentage below it a guess as well.
 */
const REACHED: Record<string, ReadonlyArray<Order['status']>> = {
  recorded: [
    'PENDING_CONFIRMATION',
    'ORDER_CREATED',
    'PAYMENT_PENDING',
    'PAID',
    'PAYMENT_FAILED',
    'PAYMENT_EXPIRED',
    'CANCELLED',
  ],
  payment_started: ['ORDER_CREATED', 'PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED'],
  verified: ['PAID'],
};

export function ConversionFunnel({ orders }: { orders: Order[] }) {
  const stages = [
    {
      key: 'recorded',
      label: 'Purchase authorised',
      description: 'User confirmed and an order row was written',
      tone: 'bg-accent',
    },
    {
      key: 'payment_started',
      label: 'Payment requested',
      description: 'A payment link was issued by the provider',
      tone: 'bg-warning',
    },
    {
      key: 'verified',
      label: 'Payment verified',
      description: 'Confirmed by a signed Razorpay webhook',
      tone: 'bg-success',
    },
  ] as const;

  const counts = stages.map((stage) => ({
    ...stage,
    count: orders.filter((order) => REACHED[stage.key]?.includes(order.status)).length,
  }));

  const top = counts[0]?.count ?? 0;

  return (
    <div className="space-y-3.5">
      {counts.map((stage, index) => {
        const previous = counts[index - 1]?.count ?? stage.count;
        const widthPercent = top === 0 ? 0 : Math.round((stage.count / top) * 100);
        const stepPercent =
          index === 0 || previous === 0 ? null : Math.round((stage.count / previous) * 100);

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
              <div
                className={cn('h-full rounded-full transition-all duration-500', stage.tone)}
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
          No orders yet, so every stage is zero. Complete a checkout to populate the funnel.
        </p>
      ) : null}
    </div>
  );
}
