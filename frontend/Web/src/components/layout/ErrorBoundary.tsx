import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

/**
 * Last-resort boundary for a render-time crash.
 *
 * React unmounts the whole tree when a render throws, so without this the app
 * becomes a blank white page - which in a payments demo is the worst possible
 * failure display: a user cannot tell a crashed page from a page that is waiting,
 * and cannot tell either from a payment that did or did not go through.
 *
 * So the fallback says two things explicitly: the interface broke, and the
 * interface breaking cannot have changed any order or payment. That is true by
 * construction - every status shown in this app is read from the backend, and the
 * only write it can perform is order creation from a click handler that no longer
 * exists once the tree has unmounted.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry service is wired up, and inventing one would mean sending app
    // state somewhere the user did not agree to. The console is the honest place.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="bg-canvas grid min-h-dvh place-items-center p-6">
        <div className="rounded-card border-line bg-surface shadow-subtle w-full max-w-lg border p-6">
          <div className="flex items-start gap-3">
            <TriangleAlert className="text-danger mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0 space-y-3">
              <div>
                <h1 className="text-ink text-sm font-semibold">The interface stopped rendering</h1>
                <p className="text-muted mt-1 text-[13px] leading-relaxed">
                  Something threw while drawing the page. No order and no payment was affected —
                  this app never changes an order's status, and a crash cannot start a payment.
                </p>
              </div>

              <pre className="rounded-control border-line bg-surface-sunken text-muted scrollbar-slim max-h-40 overflow-auto border px-3 py-2.5 text-[11px] leading-relaxed whitespace-pre-wrap">
                {error.message}
              </pre>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => this.setState({ error: null })}
                  className="bg-accent hover:bg-accent-700 rounded-control h-10 px-4 text-sm font-medium text-white transition-colors"
                >
                  Try rendering again
                </button>
                <a
                  href="/"
                  className="border-line-strong text-ink hover:bg-surface-sunken rounded-control inline-flex h-10 items-center border px-4 text-sm font-medium transition-colors"
                >
                  Reload the app
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
