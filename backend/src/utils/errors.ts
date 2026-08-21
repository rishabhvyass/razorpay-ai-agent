/**
 * Error types.
 *
 * Two categories, and the distinction is the whole point of this file:
 *
 *   AppError  - something we anticipated and can describe to a caller.
 *               "Product not found." Its `message` is safe to return verbatim.
 *
 *   Anything else - a bug, a dropped connection, a Postgres error we did not
 *               classify. Its message may contain a connection string, a table
 *               definition, or part of a key. The error handler replaces it with
 *               a generic string in production and never returns a stack trace.
 *
 * Every error leaves the API in the same envelope, so clients parse one shape:
 *
 *   { "error": { "code": "PRODUCT_NOT_FOUND", "message": "...", "requestId": "..." } }
 */

/**
 * Machine-readable error codes. Clients branch on these; `message` is for humans
 * and may be reworded freely without breaking anyone.
 */
export const ERROR_CODES = [
  // 400
  'VALIDATION_ERROR',
  'INVALID_UUID',
  // 401 / 403
  'UNAUTHENTICATED',
  'FORBIDDEN',
  // 404
  'NOT_FOUND',
  'PRODUCT_NOT_FOUND',
  'CONVERSATION_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'ROUTE_NOT_FOUND',
  // 409
  'CONFLICT',
  'DUPLICATE_IDEMPOTENCY_KEY',
  // The key exists and describes a *different* request. Distinct from
  // DUPLICATE_IDEMPOTENCY_KEY, which is a bare collision: this one tells the
  // caller its key was reused with mismatched parameters, so a retry with the
  // same key will never succeed and a new key is required.
  'IDEMPOTENCY_KEY_REUSED',
  'INVALID_STATE_TRANSITION',
  // 500 / 503
  'INTERNAL_ERROR',
  'DATABASE_ERROR',
  'NOT_IMPLEMENTED',
  'SERVICE_UNAVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;

  /**
   * Structured, caller-safe context - a field name, an allowed-values list.
   * Never provider payloads, credentials, or raw database output.
   */
  readonly details: Record<string, unknown> | undefined;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options?: { details?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;

    // Without this, `instanceof AppError` fails for subclasses when the compiled
    // target is ES5-like. Harmless on modern targets, cheap insurance.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// -----------------------------------------------------------------------------
// Constructors
//
// Named for the HTTP outcome so route code reads as intent:
//   throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
// -----------------------------------------------------------------------------

export const badRequest = (
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): AppError => new AppError(400, code, message, { details });

export const unauthenticated = (message = 'Authentication required'): AppError =>
  new AppError(401, 'UNAUTHENTICATED', message);

export const forbidden = (message = 'You do not have access to this resource'): AppError =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (
  code: ErrorCode = 'NOT_FOUND',
  message = 'Resource not found',
): AppError => new AppError(404, code, message);

export const conflict = (
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): AppError => new AppError(409, code, message, { details });

export const notImplemented = (message: string): AppError =>
  new AppError(501, 'NOT_IMPLEMENTED', message);

export const internal = (message = 'Internal server error', cause?: unknown): AppError =>
  new AppError(500, 'INTERNAL_ERROR', message, { cause });

export const serviceUnavailable = (message: string, cause?: unknown): AppError =>
  new AppError(503, 'SERVICE_UNAVAILABLE', message, { cause });

// -----------------------------------------------------------------------------
// Postgres / PostgREST translation
// -----------------------------------------------------------------------------

/** The error shape PostgREST returns. Structural, so no import from supabase-js. */
export interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * Turn a PostgREST/Postgres error into an AppError.
 *
 * `message` is written by us, from the SQLSTATE - the driver's own message is
 * attached only as `cause` (kept for server logs, never serialised to a client).
 * Postgres error text routinely quotes constraint names, column definitions and
 * offending values.
 *
 * SQLSTATE reference: 23505 unique_violation, 23503 foreign_key_violation,
 * 23514 check_violation, 23502 not_null_violation, 22P02 invalid_text_representation,
 * 22003 numeric_value_out_of_range, 42501 insufficient_privilege (which is how an
 * RLS denial surfaces), PGRST116 "no rows returned for a single-row request".
 */
export function fromPostgrestError(
  error: PostgrestLikeError,
  context: { operation: string; notFoundCode?: ErrorCode },
): AppError {
  switch (error.code) {
    case 'PGRST116':
      return notFound(context.notFoundCode ?? 'NOT_FOUND', 'Resource not found');

    case '23505':
      return conflict('CONFLICT', 'That record already exists.');

    case '23503':
      return badRequest('VALIDATION_ERROR', 'A referenced record does not exist.');

    case '23514':
    case '23502':
      return badRequest('VALIDATION_ERROR', 'The submitted values violate a database constraint.');

    case '22P02':
      return badRequest('INVALID_UUID', 'A supplied identifier is not a valid UUID.');

    // 22003 numeric_value_out_of_range. Reached when a filter value exceeds the
    // range of the column it is compared against - typically an INTEGER price or
    // amount. Mapped explicitly rather than left to the `default` arm, because a
    // caller-supplied number that is simply too large is a bad request, and
    // returning 500 for it both misleads the client and pollutes the server-fault
    // signal that monitoring depends on.
    //
    // Deliberately narrow: only this one code, not all of class 22. Several class
    // 22 conditions do indicate a genuine server bug, and blanket-mapping the
    // class to 400 would hide them.
    case '22003':
      return badRequest('VALIDATION_ERROR', 'A supplied value is out of the accepted range.');

    // An RLS policy refused the operation. Reported as 403 rather than 404 only
    // because the caller reaching here is our own trusted backend; a
    // client-facing path would prefer 404 to avoid confirming the row exists.
    case '42501':
      return forbidden('This operation is not permitted.');

    default:
      return new AppError(500, 'DATABASE_ERROR', `Database operation failed: ${context.operation}`, {
        cause: error,
      });
  }
}
