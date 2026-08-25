/**
 * HTTP smoke test against the compiled server.
 *
 * Boots the real Express app on an ephemeral port with PLACEHOLDER Supabase
 * credentials, so every database-backed route fails on purpose. That is the point:
 * the routes that need no database must work, and the ones that do must fail in
 * the standard envelope without leaking a stack trace, a URL, or a key.
 *
 * NODE_ENV is read once at import time, so the production-redaction case has to
 * run as a separate process. Pass `--prod` (or SMOKE_NODE_ENV=production) to get
 * it; `npm run test:http:prod` does exactly that. A flag rather than an env
 * assignment because `VAR=value cmd` in an npm script does not work on Windows,
 * where scripts run through cmd.exe.
 */

const wantProd = process.argv.includes('--prod');

process.env.SUPABASE_URL = 'https://placeholder-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'placeholder-anon-key-0000000000000000';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role-key-000000';
process.env.NODE_ENV = wantProd ? 'production' : (process.env.SMOKE_NODE_ENV ?? 'development');

const SECRETS = [
  'placeholder-service-role-key-000000',
  'placeholder-anon-key-0000000000000000',
  'placeholder-project.supabase.co',
];

const { createApp } = await import('../dist/server.js');

const app = createApp();
const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0;
let fail = 0;
const bodies = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

async function req(method, path, { body, headers } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  bodies.push({ path, text });
  return { status: res.status, headers: res.headers, json, text };
}

console.log(`\n### HTTP smoke (NODE_ENV=${process.env.NODE_ENV}) on ${base}`);

console.log('\n=== 1. /health (no database needed) ===');
{
  const r = await req('GET', '/health');
  check('200', r.status === 200, `got ${r.status}`);
  check('reports status ok', r.json?.status === 'ok', JSON.stringify(r.json));
  check('names the service', typeof r.json?.service === 'string', JSON.stringify(r.json));
  check('reports the environment', r.json?.environment === process.env.NODE_ENV,
    JSON.stringify(r.json));
  // Liveness is deliberately minimal - status/service/environment and nothing
  // else. uptimeSeconds belongs to /health/ready. README.md documents this exact
  // body, so an extra field here would make the docs wrong.
  check('body matches the README exactly (3 keys, no more)',
    JSON.stringify(Object.keys(r.json ?? {}).sort()) ===
      JSON.stringify(['environment', 'service', 'status']),
    JSON.stringify(Object.keys(r.json ?? {})));
  check('X-Request-ID header present', r.headers.get('x-request-id') !== null);
  check('X-Powered-By suppressed', r.headers.get('x-powered-by') === null,
    r.headers.get('x-powered-by') ?? '');
  check('no credential in body', !SECRETS.some((s) => r.text.includes(s)), r.text);
}

console.log('\n=== 2. Request id propagation ===');
{
  const mine = 'smoke-test-request-id-123';
  const r = await req('GET', '/health', { headers: { 'X-Request-ID': mine } });
  check('inbound X-Request-ID echoed back', r.headers.get('x-request-id') === mine,
    r.headers.get('x-request-id') ?? 'absent');

  const a = await req('GET', '/health');
  const b = await req('GET', '/health');
  check('generated ids are unique per request',
    a.headers.get('x-request-id') !== b.headers.get('x-request-id'));
  check('generated id is a uuid',
    /^[0-9a-f-]{36}$/.test(a.headers.get('x-request-id')), a.headers.get('x-request-id'));
}

console.log('\n=== 3. /health/ready degrades, does not hang ===');
{
  const started = Date.now();
  const r = await req('GET', '/health/ready');
  const elapsed = Date.now() - started;
  check('503 with unreachable database', r.status === 503, `got ${r.status}`);
  check('body says degraded', r.json?.status === 'degraded', JSON.stringify(r.json));
  check('database reported unreachable', r.json?.checks?.database?.reachable === false,
    JSON.stringify(r.json?.checks));
  check('returned inside the timeout budget (<8s)', elapsed < 8000, `${elapsed}ms`);
  check('database error is a classification, not a driver message',
    ['timeout', 'unreachable', 'query_failed', 'permission_denied'].includes(
      r.json?.checks?.database?.error),
    String(r.json?.checks?.database?.error));
  check('readiness reports uptime', typeof r.json?.uptimeSeconds === 'number',
    JSON.stringify(r.json));
  check('latency is a number even on failure',
    typeof r.json?.checks?.database?.latencyMs === 'number');
  check('no credential in the error detail', !SECRETS.some((s) => r.text.includes(s)), r.text);
}

console.log('\n=== 4. Route index ===');
{
  const r = await req('GET', '/');
  check('200', r.status === 200, `got ${r.status}`);
  check('declares the phase', r.json?.phase === 'backend-payments');
  check('lists /api/products', JSON.stringify(r.json?.endpoints).includes('GET /api/products'));
  check('declares /api/chat as not yet implemented',
    JSON.stringify(r.json?.notImplementedYet).includes('/api/chat'));
  // The webhook moved out of notImplementedYet when the payments layer landed.
  // Asserted in both directions so a regression either way is caught.
  check('no longer declares the webhook as unimplemented',
    !JSON.stringify(r.json?.notImplementedYet).includes('webhooks'));
  check('lists the payment routes',
    JSON.stringify(r.json?.endpoints).includes('POST /api/orders/:id/payment-link'));
  check('lists the webhook route',
    JSON.stringify(r.json?.endpoints).includes('POST /api/webhooks/razorpay'));
  // No Razorpay keys are set in this harness, so the index must say so - and must
  // say it without naming a value.
  check('reports payments as unconfigured', r.json?.payments?.configured === false,
    JSON.stringify(r.json?.payments));
}

console.log('\n=== 5. 404 envelope ===');
{
  const r = await req('GET', '/nope');
  check('404', r.status === 404, `got ${r.status}`);
  check('code ROUTE_NOT_FOUND', r.json?.error?.code === 'ROUTE_NOT_FOUND', JSON.stringify(r.json));
  check('envelope has message', typeof r.json?.error?.message === 'string');
  check('envelope carries requestId', typeof r.json?.error?.requestId === 'string');
  // 4xx never carries a stack, in either mode - the handler gates it on
  // isServerFault as well as on NODE_ENV.
  check('no stack on a 4xx', r.json?.error?.details?.stack === undefined,
    JSON.stringify(r.json?.error?.details));

  const withId = await req('GET', '/nope', { headers: { 'X-Request-ID': 'my-404-id' } });
  check('404 envelope honours inbound request id', withId.json?.error?.requestId === 'my-404-id',
    JSON.stringify(withId.json));
}

console.log('\n=== 6. Validation happens before the database is touched ===');
{
  const bad = await req('GET', '/api/products?limit=abc');
  check('non-numeric limit -> 400', bad.status === 400, `got ${bad.status}: ${bad.text}`);
  check('code VALIDATION_ERROR', bad.json?.error?.code === 'VALIDATION_ERROR', bad.text);

  const neg = await req('GET', '/api/products?maxPrice=-1');
  check('negative maxPrice -> 400', neg.status === 400, `got ${neg.status}: ${neg.text}`);

  const huge = await req('GET', '/api/products?maxPrice=99999999999999');
  check('maxPrice above int4 ceiling -> 400 (not a 500 from Postgres)',
    huge.status === 400, `got ${huge.status}: ${huge.text}`);
  check('ceiling rejection is VALIDATION_ERROR',
    huge.json?.error?.code === 'VALIDATION_ERROR', huge.text);

  const badUuid = await req('GET', '/api/products/not-a-uuid');
  check('malformed uuid path param -> 400', badUuid.status === 400,
    `got ${badUuid.status}: ${badUuid.text}`);

  const badBody = await req('POST', '/api/orders', { body: { quantity: 0 } });
  check('order with quantity 0 -> 400', badBody.status === 400,
    `got ${badBody.status}: ${badBody.text}`);

  const noBody = await req('POST', '/api/orders', { body: {} });
  check('order with no productId -> 400', noBody.status === 400,
    `got ${noBody.status}: ${noBody.text}`);
}

console.log('\n=== 7. Malformed JSON is handled, not crashed on ===');
{
  const res = await fetch(`${base}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"broken":',
  });
  const text = await res.text();
  bodies.push({ path: 'malformed-json', text });
  check('400, not 500', res.status === 400, `got ${res.status}: ${text}`);
  check('still the standard envelope', text.includes('"error"'), text);
  check('no stack trace leaked', !text.includes('SyntaxError:') || !text.includes(' at '), text);
}

console.log('\n=== 8. Database failure surfaces as a clean envelope ===');
{
  // Placeholder host does not resolve, so this is a genuine connection failure.
  const r = await req('GET', '/api/products');
  const isProd = process.env.NODE_ENV === 'production';

  check('a 5xx, not a hang or a crash', r.status >= 500 && r.status < 600, `got ${r.status}`);
  check('standard envelope', typeof r.json?.error?.code === 'string', r.text);
  check('no supabase host leaked', !SECRETS.some((s) => r.text.includes(s)), r.text);
  check('no "getaddrinfo"/DNS internals leaked', !r.text.includes('getaddrinfo'), r.text);
  check('driver message not forwarded', !r.text.includes('fetch failed'), r.text);

  // The handler stores the stack as an ARRAY of trimmed lines, so a naive
  // /\n\s+at\s/ regex never matches and would pass in both modes for the wrong
  // reason. Assert on the field, and assert the two modes differ as documented.
  const stack = r.json?.error?.details?.stack;

  if (isProd) {
    check('production: no stack field at all', stack === undefined,
      JSON.stringify(stack)?.slice(0, 200));
    check('production: message is genericised',
      r.json?.error?.message === 'Internal server error', r.json?.error?.message);
    check('production: internal operation name not disclosed',
      !r.text.includes('searchProducts'), r.text);
    check('production: no local filesystem path disclosed',
      !r.text.includes('file:///') && !r.text.includes('OneDrive'), r.text);
  } else {
    check('development: stack IS returned, as the handler documents',
      Array.isArray(stack) && stack.length > 0, JSON.stringify(stack)?.slice(0, 120));
    check('development: real message retained for debugging',
      r.json?.error?.message.includes('searchProducts'), r.json?.error?.message);
    check('development: error code still DATABASE_ERROR',
      r.json?.error?.code === 'DATABASE_ERROR', r.json?.error?.code);
  }
}

console.log('\n=== 9. Payments layer with no Razorpay keys ===');
{
  // The claim this layer makes is that it is ADDITIVE: a deployment with no
  // Razorpay credentials must behave exactly as it did before the layer existed.
  // Everything above already showed the rest of the API still works on placeholder
  // credentials; this section shows the payment routes decline cleanly rather than
  // crashing, hanging, or 500ing on a missing secret.
  const someUuid = '11111111-2222-4333-8444-555555555555';

  for (const [method, path] of [
    ['POST', `/api/orders/${someUuid}/payment-link`],
    ['GET', `/api/orders/${someUuid}/payment`],
    ['POST', `/api/orders/${someUuid}/payment/refresh`],
  ]) {
    const r = await req(method, path, {
      ...(method === 'POST'
        ? { body: { approved: true, approvalReason: 'smoke test authorisation' } }
        : {}),
    });
    check(`${method} ${path.replace(someUuid, ':id')} -> 501`, r.status === 501,
      `got ${r.status}`);
    check('code PAYMENT_NOT_CONFIGURED', r.json?.error?.code === 'PAYMENT_NOT_CONFIGURED',
      JSON.stringify(r.json));
    // 501 is a 5xx, so errorHandler suppresses the message in production - and that
    // is the behaviour we want on both sides. In development an operator sees which
    // variables to set; in production a stranger learns only that the capability is
    // absent, and the variable names stay in the boot log where they belong.
    if (process.env.NODE_ENV === 'production') {
      check('production: message suppressed', r.json?.error?.message === 'Internal server error',
        JSON.stringify(r.json));
      check('production: variable names withheld', !/RAZORPAY_/.test(r.text),
        r.text.slice(0, 200));
    } else {
      check('development: names the missing variables', /RAZORPAY_KEY_ID/.test(r.text),
        r.text.slice(0, 200));
    }
    // Unconditional: nothing here could contain a key value, since none is
    // configured. Asserted anyway - it costs nothing and this is the response most
    // likely to grow a helpful "your key looks like..." message later.
    check('does not echo a key value', !/rzp_(test|live)_/.test(r.text), r.text.slice(0, 200));
  }

  // A webhook arriving at an unconfigured server must NOT be acknowledged. A 2xx
  // would tell Razorpay the delivery was handled and it would never be resent; 501
  // keeps it queued at the provider until keys are configured.
  const w = await req('POST', '/api/webhooks/razorpay', { body: { event: 'payment_link.paid' } });
  check('webhook -> 501 when unconfigured', w.status === 501, `got ${w.status}`);
  check('webhook is not acknowledged', w.json?.data?.received === undefined,
    JSON.stringify(w.json));
  check('webhook code PAYMENT_NOT_CONFIGURED',
    w.json?.error?.code === 'PAYMENT_NOT_CONFIGURED', JSON.stringify(w.json));
}

console.log('\n=== 10. Nothing anywhere leaked a credential ===');
{
  const offenders = bodies.filter((b) => SECRETS.some((s) => b.text.includes(s)));
  check(`0 of ${bodies.length} responses contained a credential`, offenders.length === 0,
    offenders.map((o) => o.path).join(', '));
  const keyish = bodies.filter((b) => /service_role|SUPABASE_/.test(b.text));
  check('no response mentions SUPABASE_ / service_role', keyish.length === 0,
    keyish.map((o) => `${o.path}: ${o.text.slice(0, 100)}`).join(' | '));

  // Filesystem paths are only acceptable in the development stack affordance.
  if (process.env.NODE_ENV === 'production') {
    const pathy = bodies.filter((b) => /file:\/\/\/|OneDrive|node_modules/.test(b.text));
    check('production: no response discloses a filesystem path', pathy.length === 0,
      pathy.map((o) => o.path).join(', '));
  }
}

server.close();
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT (${process.env.NODE_ENV}): ${pass} passed, ${fail} failed`);
console.log('='.repeat(60));
process.exit(fail === 0 ? 0 : 1);
