import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from './Badge';

/**
 * The visible marker on anything the mock adapter produced.
 *
 * This is not decoration. `POST /api/chat` is not built yet, and with VITE_USE_MOCK on
 * the payment states come from a local stand-in rather than from Razorpay, so parts of
 * the demo flow are served by src/services/mock/. A reviewer
 * has to be able to tell, at a glance and without reading the source, which parts
 * of the screen are real backend data and which are simulated - otherwise the demo
 * is claiming more than it does.
 *
 * The flag travels with the data (`ChatTurn.mock`, `PaymentView.mock`), so a mocked
 * surface cannot render without it.
 */
export function MockBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" icon={<FlaskConical className="size-3" aria-hidden />} className={className}>
      Simulated
    </Badge>
  );
}

export function MockNotice({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-control border-warning-line bg-warning-bg flex items-start gap-2.5 border px-3 py-2.5',
        className,
      )}
    >
      <FlaskConical className="text-warning mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p className="text-muted text-xs leading-relaxed">{children}</p>
    </div>
  );
}
