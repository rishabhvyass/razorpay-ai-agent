import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Page } from '@/components/layout/PageContainer';
import { Button, Card } from '@/components/ui';

const DESTINATIONS = [
  { to: '/', label: 'Overview', hint: 'Metrics and recent orders' },
  { to: '/checkout', label: 'Checkout', hint: 'Talk to the agent' },
  { to: '/orders', label: 'Orders', hint: 'What has been authorised' },
  { to: '/products', label: 'Products', hint: 'The catalogue the agent reads' },
  { to: '/activity', label: 'Agent activity', hint: 'The full audit trail' },
] as const;

export function NotFoundPage() {
  return (
    <Page title="Not found" description="That route does not exist in this app">
      <div className="max-w-xl">
        <Card>
          <div className="flex items-start gap-3">
            <Compass className="text-faint mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0 space-y-3">
              <div>
                <h2 className="text-ink text-[13px] font-semibold">Nothing here</h2>
                <p className="text-muted mt-1 text-[13px] leading-relaxed">
                  The URL did not match any route. If you followed a link to an order, the id may
                  belong to a database that has since been reset — the Orders page will say so
                  explicitly rather than showing a blank row.
                </p>
              </div>

              <ul className="divide-line divide-y border-t border-b border-[var(--color-line)]">
                {DESTINATIONS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="hover:bg-surface-sunken -mx-1 flex items-baseline justify-between gap-3 rounded px-1 py-2 transition-colors"
                    >
                      <span className="text-ink text-[13px] font-medium">{item.label}</span>
                      <span className="text-faint text-[12px]">{item.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <Link to="/">
                <Button variant="primary" size="md">
                  Go to the overview
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
