/**
 * Centralised error handling.
 *
 * Every error - thrown, rejected, or from a malformed request body - ends up
 * here and leaves as the same JSON envelope:
 *
 *   { "error": { "code": "PRODUCT_NOT_FOUND", "message": "...", "requestId": "..." } }
 *
 * The production/development split is the important part. In development you get
 * the real message and the stack, because you are the only one reading it. In
 * production the response carries a code and a generic sentence, while the full
 * detail goes to the server log keyed by the same request id. Nothing that could
 * describe the database, the environment, or a credential crosses the wire.
 *
 * Express 5 forwards rejected promises from async handlers here automatically,
 * so route handlers need no try/catch and no asyncHandler wrapper.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { isProduction } from '../config/env.js';
import { AppError, isAppError, notFound } from '../utils/errors.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

/** Body-parser failures arrive as a SyntaxError carrying an HTTP status. */
function isBodyParserError(error: unknown): error is Error & { status: number } {
  return (
    error instanceof SyntaxError &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

function normalise(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof ZodError) {
    return new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', {
      details: {
        issues: error.issues.map((issue) => ({
          field: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      },
      cause: error,
    });
  }

  if (isBodyParserError(error)) {
    return new AppError(400, 'VALIDATION_ERROR', 'Request body is not valid JSON.', {
      cause: error,
    });
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Internal server error', { cause: error });
}

/**
 * Catch-all for unmatched routes. Registered after every router so a typo in a
 * URL produces the standard envelope instead of Express's HTML error page.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound('ROUTE_NOT_FOUND', `No route matches ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = normalise(err);
  const requestId = req.requestId ?? 'unknown';
  const isServerFault = appError.statusCode >= 500;

  // Log before responding: if serialisation throws, the log still exists.
  // `cause` holds the original driver/provider error - server-side only.
  const logLine = {
    level: isServerFault ? 'error' : 'warn',
    requestId,
    method: req.method,
    path: req.path,
    status: appError.statusCode,
    code: appError.code,
    message: appError.message,
    cause: appError.cause instanceof Error ? appError.cause.message : appError.cause,
  };

  if (isServerFault) {
    console.error(JSON.stringify(logLine), '\n', appError.stack);
  } else {
    console.warn(JSON.stringify(logLine));
  }

  // 5xx messages are suppressed in production. Even though every AppError message
  // is authored by us, 5xx messages tend to name internal operations, and the
  // fallback wraps arbitrary thrown values whose text we do not control.
  const message = isProduction && isServerFault ? 'Internal server error' : appError.message;

  const body: ErrorBody = {
    error: { code: appError.code, message, requestId },
  };

  if (appError.details !== undefined) {
    body.error.details = appError.details;
  }

  // Stack traces are a development affordance only, and never for a 4xx.
  if (!isProduction && isServerFault && appError.stack !== undefined) {
    body.error.details = {
      ...body.error.details,
      stack: appError.stack.split('\n').map((line) => line.trim()),
    };
  }

  res.status(appError.statusCode).json(body);
};
