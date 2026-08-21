import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/types';

/**
 * Product recommendations inside the conversation.
 *
 * "Select this" does not create an order and does not open a payment. It sends the
 * user's intent back to the agent as a message, and the agent replies with the
 * authorisation card. That indirection is the flow the product is built around:
 *
 *   recommendation -> stated intent -> explicit authorisation -> financial action
 *
 * Collapsing it into a single click would remove the one step that makes the agent
 * safe to give a payment capability.
 */
export function ProductMessage({
  products,
  note,
  onSelect,
  disabled = false,
}: {
  products: Product[];
  note?: string;
  onSelect: (product: Product) => void;
  disabled?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {note ? <p className="text-muted text-[12px] leading-relaxed">{note}</p> : null}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compact
            action={
              <Button
                size="sm"
                variant={product.stock > 0 ? 'secondary' : 'ghost'}
                fullWidth
                disabled={disabled || product.stock < 1}
                onClick={() => onSelect(product)}
                icon={<ShoppingBag className="size-3.5" aria-hidden />}
              >
                {product.stock < 1 ? 'Unavailable' : 'Select this'}
              </Button>
            }
          />
        ))}
      </div>
    </div>
  );
}
