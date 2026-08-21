/**
 * Request ID middleware.
 *
 * Assigns every request a stable id, exposed as `X-Request-ID` on the response
 * and as `req.requestId` to everything downstream.
 *
 * This is the thread that makes an agentic system debuggable. One id will link:
 *
 *   client request -> agent turn -> MCP tool call -> Razorpay API call
 *                  -> webhook delivery -> agent_actions row
 *
 * When a customer says "my payment did not show up", that id is how you find out
 * which of those six steps failed, in one query rather than six.
 *
 * An inbound `X-Request-ID` is honoured so a caller can correlate across
 * services - but only after sanitising it. It is attacker-controlled input that
 * ends up in a response header and in the database.
 */

import type { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Present on every request; assigned by `requestId` middleware. */
      requestId: string;
    }
  }
}

export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Conservative allowlist: UUIDs, ULIDs, and the `trace:span` shapes tracing
 * systems emit. Anything else is rejected outright rather than escaped.
 *
 * The characters this excludes are the point. CR and LF in a header value are a
 * response-splitting primitive; `<` and `>` matter if the id is ever rendered
 * into a page. Rejecting rather than stripping avoids the class of bug where two
 * different inputs sanitise to the same id.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const inbound = req.get(REQUEST_ID_HEADER);
  const id = inbound !== undefined && SAFE_REQUEST_ID.test(inbound) ? inbound : uuidv4();

  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
