/**
 * Logic smoke test, run against the COMPILED output in dist/.
 *
 * Not a substitute for the integration checks that need real Supabase
 * credentials - it is the layer below them. Every case here corresponds to a
 * defect found in the audit, so a regression shows up as a named failure rather
 * than as "the demo behaved oddly".
 *
 * Network is stubbed: globalThis.fetch is replaced BEFORE dist is imported, so
 * supabase-js binds to the stub. Each call records the URL it would have sent,
 * which is what lets us assert on the generated PostgREST query rather than on a
 * round-trip.
 */

// --- Placeholder credentials. Not real, never written to .env. -------------
process.env.SUPABASE_URL = 'https://placeholder-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'placeholder-anon-key-0000000000000000';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role-key-000000';
process.env.NODE_ENV = 'test';

const calls = [];
/** What the next fetch resolves to. Set per-test. */
let nextRows = [];
let nextError = null;

globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), method: init.method ?? 'GET', body: init.body });
  const payload = nextError ?? nextRows;
  return new Response(JSON.stringify(payload), {
    status: nextError ? 400 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const { searchProducts, escapeLikePattern, toSearchTokens } = await import(
  '../dist/repositories/productRepo.js'
);
const { redactSensitive } = await import('../dist/repositories/agentActionRepo.js');
const { canTransition } = await import('../dist/repositories/orderRepo.js');
const { parseMajorToMinor, lineTotalMinor, formatMinorUnits, MAX_AMOUNT_MINOR } = await import(
  '../dist/utils/money.js'
);
const { decideNextStatus, providerStateFromLink, providerStateFromPayment, decisivePayment } =
  await import('../dist/services/paymentService.js');
const { fromPostgrestError } = await import('../dist/utils/errors.js');
const { verifySignature, providerStateFromWebhook } = await import('../dist/api/webhooks.js');
const { verifyCheckoutSignature } = await import('../dist/services/checkoutService.js');
const { MINIMUM_ORDER_AMOUNT_MINOR } = await import('../dist/services/razorpayClient.js');

let pass = 0;
let fail = 0;

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

/** Run fn, return the URL of the single fetch it triggered (or null). */
async function urlOf(fn) {
  calls.length = 0;
  await fn();
  return calls.length === 0 ? null : decodeURIComponent(calls[calls.length - 1].url);
}

console.log('\n=== 1. Product search: the silent full-catalogue bug ===');
{
  // A query that is non-empty but yields no tokens must return [] without
  // querying at all. Before the fix this fell through and returned everything.
  nextRows = [{ id: 'x', name: 'Should never be reached' }];
  const url = await urlOf(() => searchProducts({ query: '%' }));
  check('query "%" issues no request at all', url === null, `sent ${url}`);

  const r1 = await searchProducts({ query: '***' });
  check('query "***" returns empty array', Array.isArray(r1) && r1.length === 0, JSON.stringify(r1));

  const r2 = await searchProducts({ query: 'a' });
  check('single-char query returns empty array', r2.length === 0, JSON.stringify(r2));

  const r3 = await searchProducts({ query: '，。' });
  check('non-Latin punctuation query returns empty', r3.length === 0, JSON.stringify(r3));
}

console.log('\n=== 2. Product search: empty vs absent query ===');
{
  nextRows = [];
  const blank = await urlOf(() => searchProducts({ query: '   ' }));
  check(
    'whitespace-only query still browses the catalogue',
    blank !== null && !blank.includes('or='),
    `url=${blank}`,
  );

  const absent = await urlOf(() => searchProducts({}));
  check('no query browses the catalogue', absent !== null && !absent.includes('or='), `url=${absent}`);
  check('browse is still limited to active rows', absent.includes('active=eq.true'), absent);
}

console.log('\n=== 3. Product search: token AND / column OR ===');
{
  nextRows = [];
  const url = await urlOf(() => searchProducts({ query: 'black hoodie' }));
  const orCount = (url.match(/or=\(/g) ?? []).length;
  check('two tokens produce two ANDed or= groups', orCount === 2, `found ${orCount} in ${url}`);
  check('token "black" searches all three columns',
    url.includes('name.ilike.%black%') &&
      url.includes('description.ilike.%black%') &&
      url.includes('category.ilike.%black%'),
    url);
  check('token "hoodie" present too', url.includes('name.ilike.%hoodie%'), url);
}

console.log('\n=== 4. LIKE escaping on the category filter ===');
{
  check('escapeLikePattern escapes %', escapeLikePattern('a%b') === 'a\\%b', escapeLikePattern('a%b'));
  check('escapeLikePattern escapes _', escapeLikePattern('a_b') === 'a\\_b', escapeLikePattern('a_b'));
  check(
    'backslash escaped first, not double-applied',
    escapeLikePattern('a\\%b') === 'a\\\\\\%b',
    escapeLikePattern('a\\%b'),
  );

  nextRows = [];
  const wild = await urlOf(() => searchProducts({ category: '%' }));
  check('category "%" reaches PostgREST escaped, not as a wildcard',
    wild.includes('category=ilike.\\%'), wild);

  const under = await urlOf(() => searchProducts({ category: 'foot_wear' }));
  check('category underscore escaped', under.includes('category=ilike.foot\\_wear'), under);

  const plain = await urlOf(() => searchProducts({ category: 'hoodies' }));
  check('ordinary category unaffected', plain.includes('category=ilike.hoodies'), plain);
}

console.log('\n=== 5. Search tokenizer hardening ===');
{
  check('injection chars stripped',
    JSON.stringify(toSearchTokens('%,name.neq.zzz')) === JSON.stringify(['name', 'neq', 'zzz']),
    JSON.stringify(toSearchTokens('%,name.neq.zzz')));
  check('token count capped at 6', toSearchTokens('aa bb cc dd ee ff gg hh').length === 6);
  check('single chars dropped',
    JSON.stringify(toSearchTokens('a bb c')) === JSON.stringify(['bb']),
    JSON.stringify(toSearchTokens('a bb c')));
}

console.log('\n=== 6. Redaction: credentials and payment instruments ===');
{
  const out = redactSensitive({
    card: { number: '4111111111111111', cvv: '123', expiry: '12/29', name: 'A Person' },
    upi: { vpa: 'someone@upi' },
    contact: '+919999999999',
    email: 'a@b.com',
    razorpay_key_secret: 'rzp_secret_xyz',
    'X-Api-Token': 'tok_123',
    Authorization: 'Bearer abc',
    nested: [{ password: 'hunter2' }],
    safe: 'keep me',
  });

  check('card.number redacted', out.card.number === '[REDACTED]', JSON.stringify(out.card));
  check('card.cvv redacted', out.card.cvv === '[REDACTED]');
  check('card.expiry redacted', out.card.expiry === '[REDACTED]');
  check('upi.vpa redacted', out.upi.vpa === '[REDACTED]');
  check('contact redacted', out.contact === '[REDACTED]');
  check('email redacted', out.email === '[REDACTED]');
  check('razorpay_key_secret redacted (substring match)', out.razorpay_key_secret === '[REDACTED]');
  check('X-Api-Token redacted (hyphen normalised)', out['X-Api-Token'] === '[REDACTED]');
  check('Authorization redacted (case-insensitive)', out.Authorization === '[REDACTED]');
  check('password inside an array redacted', out.nested[0].password === '[REDACTED]');
  check('non-sensitive value preserved', out.safe === 'keep me');
  check('non-sensitive sibling of a secret preserved', out.card.name === 'A Person');
  check('no PAN anywhere in the output',
    !JSON.stringify(out).includes('4111111111111111'), JSON.stringify(out));
}

console.log('\n=== 7. Redaction: depth guard truncates, does not leak ===');
{
  // Build 40 levels deep, with a secret at the bottom. Deeper than the cap.
  let deep = { number: '4111111111111111', secret: 'x' };
  for (let i = 0; i < 40; i += 1) deep = { level: deep };
  const out = JSON.stringify(redactSensitive(deep));
  check('truncation marker present', out.includes('[TRUNCATED]'), out.slice(0, 120));
  check('nothing below the cap is emitted', !out.includes('4111111111111111'));
  check('no secret below the cap is emitted', !out.includes('"x"'));

  // 20 levels is within the cap, so the secret must be redacted, not truncated.
  let mid = { number: '4111111111111111' };
  for (let i = 0; i < 20; i += 1) mid = { level: mid };
  const midOut = JSON.stringify(redactSensitive(mid));
  check('within the cap, key redaction still applies', midOut.includes('[REDACTED]'), midOut.slice(0, 80));
  check('within the cap, no PAN emitted', !midOut.includes('4111111111111111'));

  // Redaction must copy, not mutate the caller's live tool arguments.
  const original = { secret: 'keep-mine' };
  redactSensitive(original);
  check('caller object not mutated', original.secret === 'keep-mine', JSON.stringify(original));
}

console.log('\n=== 8. Order status transition graph ===');
{
  check('PENDING_CONFIRMATION -> ORDER_CREATED', canTransition('PENDING_CONFIRMATION', 'ORDER_CREATED'));
  check('PAYMENT_PENDING -> PAID (webhook path)', canTransition('PAYMENT_PENDING', 'PAID'));
  check('PAYMENT_FAILED -> PAYMENT_PENDING (retry)', canTransition('PAYMENT_FAILED', 'PAYMENT_PENDING'));
  check('PAID is terminal: -> PAYMENT_FAILED refused', !canTransition('PAID', 'PAYMENT_FAILED'));
  check('PAID -> CANCELLED refused', !canTransition('PAID', 'CANCELLED'));
  check('CANCELLED -> PAID refused', !canTransition('CANCELLED', 'PAID'));
  check('PAYMENT_EXPIRED is terminal', !canTransition('PAYMENT_EXPIRED', 'PAID'));
  check('no skipping straight to payment from confirmation',
    !canTransition('PENDING_CONFIRMATION', 'PAYMENT_PENDING'));
}

console.log('\n=== 9. Money: minor units, no floats ===');
{
  check('149900 INR formats', formatMinorUnits(149900, 'INR').includes('1,499.00'),
    formatMinorUnits(149900, 'INR'));
  check('JPY is zero-decimal', formatMinorUnits(1499, 'JPY').includes('1,499'),
    formatMinorUnits(1499, 'JPY'));
  // ECMA-402 accepts any well-formed 3-letter code, so 'ZZZ' formats via Intl
  // (with a U+00A0 separator) rather than hitting the catch. A MALFORMED code is
  // what exercises the fallback.
  check('unknown-but-well-formed currency still formats',
    /^ZZZ\s10\.00$/.test(formatMinorUnits(1000, 'ZZZ')),
    JSON.stringify(formatMinorUnits(1000, 'ZZZ')));
  check('malformed currency degrades instead of throwing inside the serialiser',
    formatMinorUnits(1000, 'RUPEES') === 'RUPEES 10.00',
    JSON.stringify(formatMinorUnits(1000, 'RUPEES')));

  check('parse "1499.50"', parseMajorToMinor('1499.50') === 149950);
  check('parse "19.99" exactly (the float trap)', parseMajorToMinor('19.99') === 1999);
  check('parse "₹1,499"', parseMajorToMinor('₹1,499') === 149900);
  check('parse ".5"', parseMajorToMinor('.5') === 50);

  let threw = false;
  try { parseMajorToMinor('99999999999'); } catch { threw = true; }
  check('parse rejects out-of-range amount', threw);

  threw = false;
  try { parseMajorToMinor('1.234'); } catch { threw = true; }
  check('parse rejects too many decimals for INR', threw);

  threw = false;
  try { parseMajorToMinor('abc'); } catch { threw = true; }
  check('parse rejects non-numeric', threw);

  check('lineTotalMinor multiplies as integers', lineTotalMinor(149900, 3) === 449700);

  threw = false;
  try { lineTotalMinor(149900, 1_000_000); } catch { threw = true; }
  check('lineTotalMinor refuses INTEGER overflow', threw);
  check('MAX_AMOUNT_MINOR is the Postgres int4 ceiling', MAX_AMOUNT_MINOR === 2147483647);
}

console.log('\n=== 10. SQLSTATE -> HTTP mapping ===');
{
  const m = (code) => fromPostgrestError({ code }, { operation: 'test' });
  check('22003 out-of-range is a 400, not a 500', m('22003').statusCode === 400,
    `got ${m('22003').statusCode}`);
  check('22003 carries VALIDATION_ERROR', m('22003').code === 'VALIDATION_ERROR');
  check('23505 unique violation -> 409', m('23505').statusCode === 409);
  check('23503 FK violation -> 400', m('23503').statusCode === 400);
  // 23001 restrict_violation, NOT 23503. An ON DELETE RESTRICT refusal raises its
  // own SQLSTATE; verify-schema-pglite.mjs confirmed Postgres emits 23001 when a
  // product with orders is deleted. Unmapped it would be a 500 for what is a
  // client fault.
  check('23001 restrict violation -> 409, not 500', m('23001').statusCode === 409,
    `got ${m('23001').statusCode}`);
  check('23001 carries CONFLICT', m('23001').code === 'CONFLICT', m('23001').code);
  check('22P02 bad uuid -> 400 INVALID_UUID', m('22P02').code === 'INVALID_UUID');
  check('42501 RLS denial -> 403', m('42501').statusCode === 403);
  check('PGRST116 -> 404', m('PGRST116').statusCode === 404);
  check('unclassified code -> 500 DATABASE_ERROR',
    m('XX000').statusCode === 500 && m('XX000').code === 'DATABASE_ERROR');
  check('unclassified message is generic, not the driver text',
    !m('XX000').message.includes('XX000'), m('XX000').message);
  check('notFoundCode override honoured',
    fromPostgrestError({ code: 'PGRST116' }, { operation: 't', notFoundCode: 'ORDER_NOT_FOUND' })
      .code === 'ORDER_NOT_FOUND');
}

console.log('\n=== 11. Price filters are clamped ===');
{
  nextRows = [];
  const url = await urlOf(() => searchProducts({ minPrice: -50, maxPrice: 200000 }));
  check('negative minPrice clamped to 0', url.includes('price=gte.0'), url);
  check('maxPrice passed through', url.includes('price=lte.200000'), url);

  const lim = await urlOf(() => searchProducts({ limit: 9999 }));
  check('limit clamped to 100 (offset 0..99)', calls[0].url.includes('offset=0'), lim);
}

console.log('\n=== 12. Payment outcome decisions (decideNextStatus) ===');
{
  // The decision table that stands between a provider event and a PAID order. Pure,
  // so it is testable exactly as written - which matters more here than anywhere
  // else in the codebase, because a wrong entry either loses a payment or invents one.
  const state = (over = {}) => ({
    linkStatus: null,
    paymentStatus: null,
    paymentId: null,
    razorpayOrderId: null,
    paidAmountMinor: null,
    currency: null,
    ...over,
  });

  const next = (over) => decideNextStatus(state(over)).next;

  check('link paid -> PAID', next({ linkStatus: 'paid' }) === 'PAID', String(next({ linkStatus: 'paid' })));
  check('payment captured -> PAID', next({ paymentStatus: 'captured' }) === 'PAID');
  check('link expired -> PAYMENT_EXPIRED', next({ linkStatus: 'expired' }) === 'PAYMENT_EXPIRED');
  check('link cancelled -> CANCELLED', next({ linkStatus: 'cancelled' }) === 'CANCELLED');
  check('payment failed -> PAYMENT_FAILED', next({ paymentStatus: 'failed' }) === 'PAYMENT_FAILED');

  // Everything below must decide NOTHING. Each one is a state that looks like
  // progress and is not: an authorised-but-uncaptured payment is money on hold, a
  // part-paid link is not a settled order, and a freshly created link is just a link.
  check('link created -> no change', next({ linkStatus: 'created' }) === null);
  check('payment authorized (not captured) -> no change',
    next({ paymentStatus: 'authorized' }) === null,
    String(next({ paymentStatus: 'authorized' })));
  check('partially_paid -> no change', next({ linkStatus: 'partially_paid' }) === null);
  check('empty state -> no change', next({}) === null);
  check('unknown payment status -> no change', next({ paymentStatus: 'refunded' }) === null);

  // A capture wins over a failure in the same payload. Razorpay sends a failed
  // attempt alongside the successful retry on the same link, and reading the failure
  // first would mark a paid order failed.
  check('captured beats failed in one payload',
    next({ linkStatus: 'paid', paymentStatus: 'failed' }) === 'PAID');

  // The amount that gets compared to the order total. `link.amount` is OUR figure -
  // taking it would make the mismatch guard compare a number against itself.
  const fromLink = providerStateFromLink({
    id: 'plink_test',
    status: 'paid',
    amount: 999900,
    amount_paid: 100,
    currency: 'INR',
    short_url: 'https://rzp.io/i/test',
    reference_id: 'order-uuid',
    payments: [{ payment_id: 'pay_1', status: 'captured', amount: 100 }],
  });
  check('paid amount comes from amount_paid, never link.amount',
    fromLink.paidAmountMinor === 100, String(fromLink.paidAmountMinor));
  check('captured attempt supplies the payment id', fromLink.paymentId === 'pay_1');

  const noSummary = providerStateFromLink({
    id: 'plink_test',
    status: 'paid',
    amount: 999900,
    currency: 'INR',
    short_url: 'https://rzp.io/i/test',
    payments: [{ payment_id: 'pay_2', status: 'captured', amount: 4200 }],
  });
  check('absent amount_paid falls back to the captured attempt, not link.amount',
    noSummary.paidAmountMinor === 4200, String(noSummary.paidAmountMinor));

  const noPayments = providerStateFromLink({
    id: 'plink_test',
    status: 'paid',
    amount: 999900,
    currency: 'INR',
    short_url: 'https://rzp.io/i/test',
  });
  check('no amount evidence at all yields null, not the requested amount',
    noPayments.paidAmountMinor === null, String(noPayments.paidAmountMinor));

  // Same rule on the webhook side, where the entities arrive separately.
  const fromHook = providerStateFromWebhook({
    event: 'payment_link.paid',
    payload: {
      payment_link: { entity: { id: 'plink_1', status: 'paid', amount: 999900, amount_paid: 250 } },
      payment: { entity: { id: 'pay_3', status: 'captured', amount: 250, currency: 'INR' } },
    },
  });
  check('webhook paid amount ignores the link amount too',
    fromHook.paidAmountMinor === 250, String(fromHook.paidAmountMinor));
  check('webhook link status is narrowed to the known union', fromHook.linkStatus === 'paid');

  const bogusStatus = providerStateFromWebhook({
    event: 'payment_link.paid',
    payload: { payment_link: { entity: { id: 'plink_1', status: 'settled_probably' } } },
  });
  check('unrecognised link status becomes null, which decides nothing',
    bogusStatus.linkStatus === null && decideNextStatus(bogusStatus).next === null);
}

console.log('\n=== 13. Webhook signature verification ===');
{
  const secret = 'whsec_placeholder_not_a_real_secret';
  const body = Buffer.from(JSON.stringify({ event: 'payment_link.paid', payload: {} }), 'utf8');

  // Signed the way Razorpay signs: HMAC-SHA256 over the exact bytes, hex.
  const crypto = await import('node:crypto');
  const good = crypto.createHmac('sha256', secret).update(body).digest('hex');

  check('a correctly signed body verifies', verifySignature(body, good, secret) === true);
  check('surrounding whitespace is tolerated', verifySignature(body, ` ${good}\n`, secret) === true);

  // One flipped character. The signature is the right length, so this is the case
  // timingSafeEqual actually adjudicates.
  const flipped = (good[0] === 'a' ? 'b' : 'a') + good.slice(1);
  check('one altered character fails', verifySignature(body, flipped, secret) === false);

  check('the wrong secret fails', verifySignature(body, good, 'whsec_other') === false);

  // Byte-level tampering. A body that differs by a single digit must not verify -
  // this is the amount-tamper case, at the layer that is supposed to stop it.
  const tampered = Buffer.from(
    JSON.stringify({ event: 'payment_link.paid', payload: { x: 1 } }),
    'utf8',
  );
  check('a modified body fails against the original signature',
    verifySignature(tampered, good, secret) === false);

  // Length mismatches must RETURN false, not throw: timingSafeEqual throws on
  // unequal lengths, and an exception here would answer 500 to a forgery, which
  // Razorpay would then retry on a schedule.
  let threw = null;
  try {
    check('a truncated signature fails', verifySignature(body, good.slice(0, 32), secret) === false);
    check('an over-long signature fails', verifySignature(body, good + 'ff', secret) === false);
    check('an empty signature fails', verifySignature(body, '', secret) === false);
    check('a non-hex signature of the right length fails',
      verifySignature(body, 'z'.repeat(64), secret) === false);
  } catch (error) {
    threw = error;
  }
  check('length mismatches never throw', threw === null, threw ? String(threw.message) : '');

  // Same bytes, same secret, same answer. A verifier that depended on parse order or
  // key iteration would fail this.
  check('verification is stable across calls',
    verifySignature(body, good, secret) === verifySignature(body, good, secret));
}

console.log('\n=== 14. Standard Checkout: the browser-supplied triple ===');
{
  // The secret is invented here. It has to be, because this test's whole subject is
  // whether a triple signed with the WRONG secret is rejected, and the only way to
  // demonstrate that is to hold both secrets. Neither is real, and nothing here reads
  // .env - a test that needed the live key would be untrustworthy for the opposite
  // reason: it could not tell a working verifier from an absent one.
  const crypto = await import('node:crypto');
  const secret = 'test_secret_do_not_use_0123456789';
  const orderId = 'order_QmT8xLd4pKzY1a';
  const paymentId = 'pay_QmT9AbCdEfGh2b';

  const sign = (payload, key) =>
    crypto.createHmac('sha256', key).update(payload).digest('hex');

  const good = sign(`${orderId}|${paymentId}`, secret);

  check('a correctly signed triple verifies',
    verifyCheckoutSignature(orderId, paymentId, good, secret) === true);

  // The forgery this route exists to stop. An attacker who knows both ids - they are
  // not secret, the browser is handed them - still cannot produce this hex without
  // KEY_SECRET.
  check('a forged signature is rejected',
    verifyCheckoutSignature(orderId, paymentId, sign(`${orderId}|${paymentId}`, 'wrong_secret'), secret) === false);

  // The concatenation order is part of the contract. Razorpay signs
  // `order_id|payment_id`; a verifier that accepted the reverse would accept a
  // signature the provider never issues, and one it might for some other pair.
  check('the reversed concatenation is rejected',
    verifyCheckoutSignature(orderId, paymentId, sign(`${paymentId}|${orderId}`, secret), secret) === false);

  // A signature is proof about ONE pair of ids. Replaying it against a different
  // payment - or a different order - must fail, or a single genuine payment could
  // settle every order on the system.
  check('a valid signature does not verify for another payment id',
    verifyCheckoutSignature(orderId, 'pay_OTHER0000000000', good, secret) === false);
  check('a valid signature does not verify for another order id',
    verifyCheckoutSignature('order_OTHER00000000', paymentId, good, secret) === false);

  // The pipe is a delimiter, not decoration. Without it "order_a" + "b|c" and
  // "order_ab" + "c" would hash identically, so a signature for one pair would
  // verify for the other.
  check('the delimiter is not optional',
    verifyCheckoutSignature(orderId, paymentId, sign(`${orderId}${paymentId}`, secret), secret) === false);

  // timingSafeEqual throws on unequal lengths, so every one of these would be an
  // exception rather than a rejection if the length guard were removed. An exception
  // here becomes a 500, and a 500 is not a "no".
  let threw = null;
  try {
    check('a truncated signature fails', verifyCheckoutSignature(orderId, paymentId, good.slice(0, 40), secret) === false);
    check('an over-long signature fails', verifyCheckoutSignature(orderId, paymentId, `${good}ff`, secret) === false);
    check('an empty signature fails', verifyCheckoutSignature(orderId, paymentId, '', secret) === false);
    check('a non-hex signature of the right length fails',
      verifyCheckoutSignature(orderId, paymentId, 'z'.repeat(64), secret) === false);
  } catch (error) {
    threw = error;
  }
  check('length mismatches never throw', threw === null, threw ? String(threw.message) : '');

  // Razorpay's own docs show the signature arriving as a plain hex string; a stray
  // newline from a curl-driven test should not read as a forgery.
  check('surrounding whitespace is tolerated',
    verifyCheckoutSignature(orderId, paymentId, `  ${good}\n`, secret) === true);

  // ---------------------------------------------------------------------------
  // What the signature does NOT prove. This is the part that matters.
  // ---------------------------------------------------------------------------

  // AUTHORIZED IS NOT PAID. Standard Checkout leaves a payment `authorized` unless
  // the Razorpay account auto-captures. The money is held, not taken. Reporting PAID
  // on a signed `authorized` payment would be the interface fabricating success for a
  // payment that could still expire uncaptured.
  const authorized = providerStateFromPayment({
    id: paymentId, order_id: orderId, status: 'authorized',
    amount: 249900, currency: 'INR', method: 'card', captured: false,
    error_code: null, error_description: null, created_at: 1,
  });
  check('an authorized payment reports no paid amount', authorized.paidAmountMinor === null);
  // `next: null` is the correct answer, not a fallback one: an authorised payment is
  // real news that changes no order status. Anything else here would be the pull path
  // settling an order on a hold.
  check('an authorized payment decides nothing',
    decideNextStatus(authorized).next === null, String(decideNextStatus(authorized).next));

  const captured = providerStateFromPayment({
    id: paymentId, order_id: orderId, status: 'captured',
    amount: 249900, currency: 'INR', method: 'card', captured: true,
    error_code: null, error_description: null, created_at: 1,
  });
  check('a captured payment reports the amount', captured.paidAmountMinor === 249900);
  check('a captured payment decides PAID', decideNextStatus(captured).next === 'PAID');

  const failedPayment = providerStateFromPayment({
    id: paymentId, order_id: orderId, status: 'failed',
    amount: 249900, currency: 'INR', method: 'card', captured: false,
    error_code: 'BAD_REQUEST_ERROR', error_description: 'card declined',
    created_at: 1,
  });
  const failedDecision = decideNextStatus(failedPayment);
  check('a failed payment decides PAYMENT_FAILED', failedDecision.next === 'PAYMENT_FAILED');
  // The note is what `applyProviderState` stores as the view's `failureReason`, so an
  // empty one would leave the failure card with nothing to show.
  check('a failed payment carries a written reason',
    typeof failedDecision.note === 'string' && failedDecision.note.length > 0, failedDecision.note);
  check('a failed payment reports no paid amount', failedPayment.paidAmountMinor === null);

  // The two normalisers must not borrow each other's evidence. A payment read knows
  // nothing about a link, so claiming a link status here would let a link-shaped
  // conclusion be drawn from order-shaped facts.
  check('a payment read reports no link status', captured.linkStatus === null);
  check('a payment read carries the Razorpay order id', captured.razorpayOrderId === orderId);

  // An order can accumulate several attempts. The captured one is the answer, whatever
  // order the provider returns them in - "the last one" would let a later declined
  // retry hide a payment the customer already made.
  const attempts = [
    { id: 'pay_1', order_id: orderId, status: 'failed', amount: 249900, currency: 'INR', method: 'card', captured: false, error_code: 'X', error_description: 'declined', created_at: 1 },
    { id: 'pay_2', order_id: orderId, status: 'captured', amount: 249900, currency: 'INR', method: 'card', captured: true, error_code: null, error_description: null, created_at: 2 },
    { id: 'pay_3', order_id: orderId, status: 'failed', amount: 249900, currency: 'INR', method: 'card', captured: false, error_code: 'X', error_description: 'declined', created_at: 3 },
  ];
  check('the captured attempt wins regardless of position',
    decisivePayment(attempts)?.id === 'pay_2', String(decisivePayment(attempts)?.id));
  check('no attempts means no decision', decisivePayment([]) === null);

  // Razorpay rejects an order below one rupee, so the amount guard has to agree with
  // the provider or the failure surfaces as a 502 from a request we should not have
  // sent.
  check('the minimum order amount is one rupee in paise', MINIMUM_ORDER_AMOUNT_MINOR === 100);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log('='.repeat(60));
process.exit(fail === 0 ? 0 : 1);
