import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { CheckoutSessionProvider } from '@/hooks/useCheckoutSession';
import { ThemeProvider } from '@/hooks/useTheme';
import { ActivityPage } from '@/pages/ActivityPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MockCheckoutPage } from '@/pages/MockCheckoutPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderDetailPage } from '@/pages/OrderDetailPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
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
                  The mock adapter's stand-in checkout, reachable only while
                  VITE_USE_MOCK is on. Its URL comes from the mock adapter, never
                  from a provider - this app does not construct Razorpay links.
                */}
                <Route path="mock-checkout/:orderId" element={<MockCheckoutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </CheckoutSessionProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
}
