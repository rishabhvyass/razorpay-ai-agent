import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError } from '@/services/api';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/**
 * Turn any thrown value into something a user can act on.
 *
 * Spec section 17 / 33: show what failed, why, and what to do - and show the
 * request id so a failure can be traced in backend logs. Never show a stack trace,
 * a header, or a key. `ApiError` deliberately carries only code, message,
 * requestId and validation details, so there is nothing sensitive to leak here.
 */
function describe(error: unknown): {
  title: string;
  message: string;
  hint: string;
  code: string | null;
  requestId: string | null;
  offline: boolean;
} {
  if (error instanceof ApiError) {
    if (error.isNetworkFailure) {
      return {
        title: 'Cannot reach the backend',
        message: error.message,
        hint: 'Check that the API server is running on port 3000, then retry.',
        code: error.code,
        requestId: error.requestId,
        offline: true,
      };
    }

    if (error.isNotImplemented) {
      return {
        title: 'Not implemented yet',
        message: error.message,
        hint: 'This endpoint has not shipped on the backend. See Settings for the current gaps.',
        code: error.code,
        requestId: error.requestId,
        offline: false,
      };
    }

    if (error.status >= 500) {
      return {
        title: 'The backend returned an error',
        message: error.message,
        hint: 'Often the database schema has not been applied yet. Retry once it has.',
        code: error.code,
        requestId: error.requestId,
        offline: false,
      };
    }

    return {
      title: 'Request rejected',
      message: error.message,
      hint: 'The request was not accepted, so nothing was changed.',
      code: error.code,
      requestId: error.requestId,
      offline: false,
    };
  }

  return {
    title: 'Something went wrong',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    hint: 'Retry, or reload the page if it persists.',
    code: null,
    requestId: null,
    offline: false,
  };
}

export function ErrorState({
  error,
  onRetry,
  compact = false,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const info = describe(error);
  const Icon = info.offline ? WifiOff : AlertTriangle;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-card border-danger-line bg-danger-bg border',
        compact ? 'p-3' : 'p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-ink text-sm font-semibold">{info.title}</p>
          <p className="text-muted mt-1 text-[13px] leading-relaxed break-words">{info.message}</p>
          <p className="text-muted mt-1.5 text-xs leading-relaxed">{info.hint}</p>

          {info.code || info.requestId ? (
            <div className="text-faint nums mt-2.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
              {info.code ? <span>{info.code}</span> : null}
              {/* Traceable in backend logs. Not a secret - the backend puts this
                  same id in its own log line for the failed request. */}
              {info.requestId ? <span>request {info.requestId}</span> : null}
            </div>
          ) : null}

          {onRetry ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRetry}
              icon={<RefreshCw className="size-3.5" aria-hidden />}
              className="mt-3.5"
            >
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
