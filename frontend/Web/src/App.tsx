import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { CheckoutSessionProvider } from '@/hooks/useCheckoutSession';
import { ActivityPage } from '@/pages/ActivityPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MockCheckoutPage } from '@/pages/MockCheckoutPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { SettingsPage } from '@/pages/SettingsPage';

/**
 * Routes and providers.
 *
 * Provider nesting is load-bearing:
 *
 *   QueryClientProvider  - CheckoutSessionProvider calls useQueryClient, so it has
 *                          to be inside this.
 *   BrowserRouter        - pages navigate; the session provider itself does not.
 *   CheckoutSessionProvider
 *                        - wraps the whole router rather than the checkout page,
 *                          because the dashboard and the activity page read the
 *                          same session (conversation id, locally recorded actions)
 *                          and a per-page provider would give each of them a
 *                          different one.
 *
 * Every route is a real page. There is no route that reports a payment outcome of
 * its own; /mock-checkout is the single simulated surface and it is labelled as such
 * on the page itself, not just in this file.
 */
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CheckoutSessionProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {/*
                  Stands in for the unbuilt payments layer. The URL comes from the
                  mock adapter, never from a provider - this app does not construct
                  Razorpay links.
                */}
                <Route path="mock-checkout/:orderId" element={<MockCheckoutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </CheckoutSessionProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
