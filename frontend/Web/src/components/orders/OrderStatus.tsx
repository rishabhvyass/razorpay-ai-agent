import {
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock,
  Hourglass,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui';
import type { OrderStatus as OrderStatusValue } from '@/types';

interface StatusPresentation {
  label: string;
  tone: NonNullable<BadgeProps['tone']>;
  icon: React.ReactNode;
  pulse: boolean;
  /** One line a non-technical reviewer can read to know what the state means. */
  meaning: string;
}

/**
 * The single mapping from order status to how it is presented.
 *
 * Defined once so a status cannot read as "Paid" in the table and "Complete" in the
 * detail view. Every entry pairs a colour with a label and a glyph - a payment
 * outcome must never be communicated by hue alone.
 *
 * Note what PAID says: verified. The backend only writes PAID from a Razorpay
 * webhook whose HMAC signature checked out, so the wording is a claim the system
 * can actually back.
 */
export const ORDER_STATUS_PRESENTATION: Record<OrderStatusValue, StatusPresentation> = {
  PENDING_CONFIRMATION: {
    label: 'Awaiting confirmation',
    tone: 'neutral',
    icon: <ShieldQuestion className="size-3" aria-hidden />,
    pulse: false,
    meaning: 'Intent recorded. No payment has been started and nothing has been charged.',
  },
  ORDER_CREATED: {
    label: 'Order created',
    tone: 'info',
    icon: <CircleDashed className="size-3" aria-hidden />,
    pulse: false,
    meaning: 'The order exists at the payment provider. Waiting for the customer to pay.',
  },
  PAYMENT_PENDING: {
    label: 'Payment pending',
    tone: 'warning',
    icon: <Hourglass className="size-3" aria-hidden />,
    pulse: true,
    meaning: 'A payment link was issued. Nothing is confirmed until the provider verifies it.',
  },
  PAID: {
    label: 'Paid',
    tone: 'success',
    icon: <CheckCircle2 className="size-3" aria-hidden />,
    pulse: false,
    meaning: 'Payment verified by Razorpay via a signed webhook. This is the only confirmed state.',
  },
  PAYMENT_FAILED: {
    label: 'Payment failed',
    tone: 'danger',
    icon: <XCircle className="size-3" aria-hidden />,
    pulse: false,
    meaning: 'The provider reported the payment was not captured. Nothing was charged.',
  },
  PAYMENT_EXPIRED: {
    label: 'Payment expired',
    tone: 'neutral',
    icon: <Clock className="size-3" aria-hidden />,
    pulse: false,
    meaning: 'The payment link lapsed before it was completed. Nothing was charged.',
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'neutral',
    icon: <CircleSlash className="size-3" aria-hidden />,
    pulse: false,
    meaning: 'The order was cancelled. Nothing was charged.',
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  const presentation = ORDER_STATUS_PRESENTATION[status];
  return (
    <Badge tone={presentation.tone} icon={presentation.icon} pulse={presentation.pulse}>
      {presentation.label}
    </Badge>
  );
}

export function orderStatusMeaning(status: OrderStatusValue): string {
  return ORDER_STATUS_PRESENTATION[status].meaning;
}
