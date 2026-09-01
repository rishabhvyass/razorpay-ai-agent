import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, ShieldCheck, Sparkles } from 'lucide-react';
import { Page } from '@/components/layout/PageContainer';
import { ProductImage, StockBadge } from '@/components/products/ProductCard';
import { QuantityStepper } from '@/components/products/QuantityStepper';
import { Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useProduct } from '@/hooks/useProducts';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import { formatMinor, formatMinorSpoken } from '@/lib/money';
import type { Product } from '@/types';

/**
 * One product, and the one way to buy it.
 *
 * The buy action does not create an order. It states the intent to the agent - product
 * and quantity - and moves the user to the conversation, where the authorisation card
 * appears and the total is stated before anything involving money happens. That gate is
 * the product, so a page like this cannot be allowed to route around it: nothing here
 * calls `POST /api/orders`, and nothing here can.
 */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useCheckoutSession();
  const product = useProduct(id);
  const [quantity, setQuantity] = useState(1);

  const row = product.data ?? null;
  const outOfStock = row !== null && row.stock < 1;

  const buy = () => {
    if (!row || outOfStock) return;
    session.selectProduct(row, quantity);
    void navigate('/checkout');
  };

  return (
    <Page
      title={row?.name ?? 'Product'}
      description={
        row ? 'Catalogue row read from the backend, not a cached copy' : 'Loading from the catalogue'
      }
    >
      <div className="space-y-6">
        <Link
          to="/products"
          className="text-muted hover:text-ink inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold transition-colors"
        >
          <ArrowLeft className="size-4" strokeWidth={2.5} aria-hidden />
          All products
        </Link>

        {product.isError ? (
          <ErrorState error={product.error} onRetry={() => void product.refetch()} />
        ) : product.isPending ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-4/3 w-full rounded-card" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        ) : row === null ? (
          <div className="rounded-card bg-surface-sunken">
            <EmptyState
              icon={<Package className="size-5" aria-hidden />}
              title="That product is not in the catalogue"
              description="The id in the URL did not resolve to a row. It may have been removed since the link was made."
              action={
                <Button variant="secondary" onClick={() => void navigate('/products')}>
                  Browse the catalogue
                </Button>
              }
            />
          </div>
        ) : (
          <ProductDetail
            product={row}
            quantity={quantity}
            onQuantityChange={setQuantity}
            outOfStock={outOfStock}
            onBuy={buy}
            busy={session.isThinking}
          />
        )}
      </div>
    </Page>
  );
}

/** The three parties, in the order they act. Named so the page cannot imply otherwise. */
const CHAIN = [
  { label: 'Mercora proposes', detail: 'The agent can search, price and draft. It cannot pay.' },
  { label: 'You approve', detail: 'One explicit click, with the exact total in front of you.' },
  { label: 'Razorpay verifies', detail: 'Payment is confirmed by a signed webhook, server-side.' },
] as const;

function ProductDetail({
  product,
  quantity,
  onQuantityChange,
  outOfStock,
  onBuy,
  busy,
}: {
  product: Product;
  quantity: number;
  onQuantityChange: (next: number) => void;
  outOfStock: boolean;
  onBuy: () => void;
  busy: boolean;
}) {
  const total = product.price * quantity;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <ProductImage product={product} className="rounded-card aspect-4/3 w-full" />

      <div className="min-w-0">
        {product.category ? (
          <p className="text-faint text-[10px] font-bold tracking-[0.12em] uppercase">
            {product.category}
          </p>
        ) : null}

        <h2 className="text-ink mt-2 text-[28px] leading-[1.15] font-extrabold tracking-[-0.02em] md:text-[34px]">
          {product.name}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className="text-ink nums text-[26px] leading-none font-extrabold tracking-[-0.02em]"
            aria-label={formatMinorSpoken(product.price, product.currency)}
          >
            {formatMinor(product.price, product.currency)}
          </span>
          <StockBadge stock={product.stock} />
        </div>

        {product.description ? (
          <p className="text-muted mt-5 text-[14px] leading-relaxed">{product.description}</p>
        ) : null}

        {/* The block that leads to money. Kept together and set apart from the
            description, so what the click does is read as one statement. */}
        <div className="rounded-card bg-surface-sunken mt-7 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-muted text-[11px] font-bold tracking-[0.08em] uppercase">
                Quantity
              </p>
              <QuantityStepper
                value={quantity}
                onChange={onQuantityChange}
                max={Math.max(1, product.stock)}
                disabled={outOfStock || busy}
                className="mt-2"
              />
            </div>

            <div className="text-right">
              <p className="text-muted text-[11px] font-bold tracking-[0.08em] uppercase">Total</p>
              <p
                className="text-ink nums mt-2 text-[24px] leading-none font-extrabold tracking-[-0.02em]"
                aria-label={formatMinorSpoken(total, product.currency)}
              >
                {formatMinor(total, product.currency)}
              </p>
            </div>
          </div>

          <Button
            size="xl"
            fullWidth
            onClick={onBuy}
            disabled={outOfStock}
            loading={busy}
            icon={<Sparkles className="size-4.5" aria-hidden />}
            className="mt-5"
          >
            {outOfStock ? 'Out of stock' : `Buy with Mercora · ${formatMinor(total, product.currency)}`}
          </Button>

          <p className="text-muted mt-3 text-[12px] leading-relaxed">
            This opens the conversation and asks the agent for an authorisation card. Nothing is
            ordered and nothing is charged until you approve the exact total there.
          </p>
        </div>

        <Card tone="info" className="mt-6">
          <CardHeader
            title="Who does what"
            description="The same three steps every purchase in this app goes through."
            icon={<ShieldCheck className="size-4" aria-hidden />}
          />
          <ol className="mt-4 space-y-3">
            {CHAIN.map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <span className="bg-brand-blue nums grid size-6 shrink-0 place-items-center rounded-control text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-[13px] leading-relaxed">
                  <span className="text-ink font-bold">{step.label}.</span>{' '}
                  <span className="text-muted">{step.detail}</span>
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
