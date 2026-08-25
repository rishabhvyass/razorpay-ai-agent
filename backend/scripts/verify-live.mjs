/**
 * Integration verification against the LIVE Supabase project.
 *
 * Covers the acceptance criteria that only a real database can answer: products
 * list and search, conversation creation, message round-trip, order round-trip,
 * agent-action round-trip, idempotency replay-vs-conflict, the transition guard,
 * and RLS as seen by the anon key.
 *
 * Runs through the repositories rather than raw SQL, so what is verified is the
 * code path the API actually uses - a schema that is right but a repository that
 * queries it wrongly still fails here, which is the point.
 *
 * THIS SCRIPT WRITES. It creates a conversation, messages, orders and agent
 * actions, then deletes every row it created, in reverse dependency order, in a
 * `finally` so a failed assertion still cleans up. Nothing seeded is modified:
 * products are only ever read. Rows are tagged with a per-run id so anything left
 * behind by a hard interrupt is identifiable.
 *
 * Run:  npm run verify:live
 *       npm run verify:live -- --dry-run    (no database; checks call targets only)
 *
 * The dry run exists because this script cannot be exercised until the migration
 * is applied, and an unexercised verifier is worth very little - a typo in a
 * function name would masquerade as a failed acceptance criterion. --dry-run
 * resolves every import and asserts every call target is callable, offline.
 *
 * Nothing here calls process.exit(). On Windows, process.exit() while an undici
 * socket from a just-completed Supabase request is still closing trips a libuv
 * assertion - `!(handle->flags & UV_HANDLE_CLOSING)` in src\win\async.c - and the
 * process dies with 127, masking the exit code that carries the diagnosis.
 * Deferring by an event-loop turn does not help; only letting the loop drain does.
 * So every path sets process.exitCode and returns. Measured cost of draining
 * naturally rather than exiting: under a second.
 */

import { randomUUID } from 'node:crypto';

const DRY_RUN = process.argv.includes('--dry-run');
const RUN = randomUUID().slice(0, 8);

// ---------------------------------------------------------------------------
// Every import hoisted, so --dry-run can prove the whole call surface resolves
// before anything touches the network.
// ---------------------------------------------------------------------------
const health = await import('../dist/services/healthService.js');
const db = await import('../dist/db/supabase.js');
const productRepo = await import('../dist/repositories/productRepo.js');
const conversationRepo = await import('../dist/repositories/conversationRepo.js');
const messageRepo = await import('../dist/repositories/messageRepo.js');
const orderRepo = await import('../dist/repositories/orderRepo.js');
const actionRepo = await import('../dist/repositories/agentActionRepo.js');
const types = await import('../dist/db/types.js');

const REQUIRED = {
  'services/healthService': [health, ['getReadiness']],
  'db/supabase': [db, ['supabaseAdmin', 'supabasePublic']],
  'repositories/productRepo': [productRepo, ['getActiveProducts', 'getProductById',
    'getProductBySlug', 'searchProducts', 'getCategories']],
  'repositories/conversationRepo': [conversationRepo, ['createConversation',
    'getConversationById', 'updateConversationStatus']],
  'repositories/messageRepo': [messageRepo, ['createMessage', 'getConversationMessages']],
  'repositories/orderRepo': [orderRepo, ['createOrderRecord', 'getOrderById',
    'updateOrderStatus', 'getConversationOrders', 'canTransition']],
  'repositories/agentActionRepo': [actionRepo, ['startAgentAction', 'completeAgentAction',
    'failAgentAction', 'recordBlockedAction', 'getConversationActions', 'getOrderActions',
    'getActionsByRequestId']],
};

const { getReadiness } = health;
const { supabaseAdmin, supabasePublic } = db;
const { getActiveProducts, getProductById, getProductBySlug, searchProducts, getCategories } =
  productRepo;
const { createConversation, getConversationById, updateConversationStatus } = conversationRepo;
const { createMessage, getConversationMessages } = messageRepo;
const { createOrderRecord, getOrderById, updateOrderStatus, getConversationOrders } = orderRepo;
const {
  startAgentAction, completeAgentAction, failAgentAction, recordBlockedAction,
  getConversationActions, getOrderActions, getActionsByRequestId,
} = actionRepo;

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `\n          -> ${detail}` : ''}`);
  }
}

/** Assert that fn rejects, and return the AppError it threw. */
async function throwsWith(name, fn, expect = {}) {
  try {
    await fn();
    check(name, false, 'it resolved instead of throwing');
    return null;
  } catch (e) {
    const okStatus = expect.status === undefined || e.statusCode === expect.status;
    const okCode = expect.code === undefined || e.code === expect.code;
    check(name, okStatus && okCode, `got ${e.statusCode} ${e.code}: ${e.message}`);
    return e;
  }
}

/**
 * Offline check that every call target this script uses actually exists, and that
 * every enum literal it passes is one the codebase defines. An invented
 * action_type would insert without complaint - the column has no CHECK - and the
 * audit trail would quietly contain a category nothing else recognises.
 */
function dryRun() {
  console.log('\n### Dry run: resolving every call target (no database contacted)\n');
  for (const [mod, [ns, names]] of Object.entries(REQUIRED)) {
    for (const n of names) {
      const v = ns[n];
      const ok = n.startsWith('supabase') ? v !== undefined : typeof v === 'function';
      check(`${mod}.${n}`, ok, v === undefined ? 'NOT EXPORTED' : `is a ${typeof v}`);
    }
  }
  for (const t of ['READ_ACTION', 'MONEY_ACTION']) {
    check(`AGENT_ACTION_TYPES includes ${t}`, types.AGENT_ACTION_TYPES.includes(t),
      types.AGENT_ACTION_TYPES.join(', '));
  }
  for (const s of ['PENDING_CONFIRMATION', 'ORDER_CREATED', 'PAYMENT_PENDING', 'PAID',
    'CANCELLED', 'PAYMENT_FAILED']) {
    check(`ORDER_STATUSES includes ${s}`, types.ORDER_STATUSES.includes(s),
      types.ORDER_STATUSES.join(', '));
  }
  for (const s of ['active', 'archived']) {
    check(`CONVERSATION_STATUSES includes ${s}`, types.CONVERSATION_STATUSES.includes(s),
      types.CONVERSATION_STATUSES.join(', '));
  }
  for (const r of ['user', 'assistant']) {
    check(`MESSAGE_ROLES includes ${r}`, types.MESSAGE_ROLES.includes(r),
      types.MESSAGE_ROLES.join(', '));
  }
}

/**
 * Refuse to run against a database that is not ready, and say exactly why. A wall
 * of failed assertions is a much worse answer to "the migration has not been
 * applied" than one sentence naming the file to run.
 *
 * Returns true when it is safe to proceed.
 */
function gate(ready) {
  if (ready.checks.database.reachable) return true;

  const why = ready.checks.database.error;
  const guidance = {
    not_migrated:
      'The schema is missing. Apply it first:\n'
      + '    Supabase dashboard -> SQL Editor -> New query -> paste and Run\n'
      + '      backend/supabase/migrations/001_initial_schema.sql\n'
      + '    then, in a second query,\n'
      + '      backend/supabase/seed.sql',
    not_seeded:
      'The schema exists but products is empty. Run backend/supabase/seed.sql\n'
      + '  in the Supabase SQL Editor.',
    permission_denied:
      'Connected, but the key was refused. Check SUPABASE_SERVICE_ROLE_KEY holds the\n'
      + '  service-role key, not the anon key.',
    timeout: 'Supabase did not answer within the probe budget. Is the project paused?',
    unreachable: 'Could not reach Supabase. Check SUPABASE_URL and network access.',
  }[why ?? ''] ?? 'Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.';

  console.error(`\nDatabase not ready (${why}).\n\n  ${guidance}\n`);
  return false;
}

async function verify(ready) {
  // Track everything created, so cleanup is exact rather than a pattern delete.
  const created = { orders: [], actions: [], messages: [], conversations: [] };

  console.log(`\n### Live verification, run ${RUN}`);
  console.log(`    database ready in ${ready.checks.database.latencyMs}ms\n`);

  try {
    // -----------------------------------------------------------------------
    console.log('=== Criteria 8 and 9: products list, fetch, search ===');
    const all = await getActiveProducts(100);
    check('getActiveProducts returns the 13 active products', all.length === 13,
      `got ${all.length}`);
    // `active` is deliberately NOT a field on PublicProduct, so `p.active !== false`
    // would pass vacuously against undefined. Name the one inactive row in the seed
    // instead - a claim that can actually fail.
    check('the inactive product (retired-canvas-tote) is absent from the list',
      !all.some((p) => p.slug === 'retired-canvas-tote'), all.map((p) => p.slug).join(', '));
    check('the internal `active` flag is not exposed in the public shape',
      all.every((p) => !('active' in p)), JSON.stringify(Object.keys(all[0] ?? {})));
    check('prices are integers in minor units',
      all.every((p) => Number.isInteger(p.price)), JSON.stringify(all[0]?.price));
    check('each product carries a formatted price for the agent to quote',
      typeof all[0]?.priceFormatted === 'string', JSON.stringify(all[0]));
    check('the out-of-stock item is listed but flagged inStock false',
      all.find((p) => p.slug === 'trail-hiker-boots')?.inStock === false,
      JSON.stringify(all.find((p) => p.slug === 'trail-hiker-boots')));

    const hoodie = await getProductBySlug('essential-black-hoodie');
    check('getProductBySlug finds the seeded hoodie at 179900',
      hoodie?.price === 179900, String(hoodie?.price));
    check('179900 renders as Rs 1,799.00 for display',
      hoodie?.priceFormatted.includes('1,799.00'), hoodie?.priceFormatted);

    const byId = await getProductById(hoodie.id);
    check('getProductById round-trips the same row', byId?.slug === hoodie.slug);
    check('getProductById returns null for an unknown id, rather than throwing',
      (await getProductById('00000000-0000-0000-0000-000000000000')) === null);

    // The demo's actual query.
    const hoodies = await searchProducts({ query: 'black hoodie', maxPrice: 200000 });
    check('"black hoodie" under Rs 2,000 returns 2 candidates - the ambiguity that'
      + ' forces the agent to ask', hoodies.length === 2,
    `got ${hoodies.length}: ${hoodies.map((h) => h.slug).join(', ')}`);
    check('they are essential-black-hoodie and midnight-zip-hoodie',
      JSON.stringify(hoodies.map((h) => h.slug).sort())
        === JSON.stringify(['essential-black-hoodie', 'midnight-zip-hoodie']),
      hoodies.map((h) => h.slug).join(', '));
    check('the Rs 2,199 grey hoodie is excluded by the price filter',
      !hoodies.some((h) => h.slug === 'oversized-grey-hoodie'));

    check('a no-match search returns [] rather than the whole catalogue',
      (await searchProducts({ query: 'zzzzz nonexistent thing' })).length === 0);
    // The bug the audit found: a non-empty query that tokenises to nothing must not
    // silently fall through to browsing everything.
    check('query "%" returns [] and does NOT leak the full catalogue',
      (await searchProducts({ query: '%' })).length === 0);
    check('the injection probe "%,name.neq.zzz" does not rewrite the filter',
      (await searchProducts({ query: '%,name.neq.zzz' })).length === 0);
    const tote = await searchProducts({ query: 'canvas tote' });
    check('the inactive product is unreachable through search',
      !tote.some((p) => p.slug === 'retired-canvas-tote'), tote.map((p) => p.slug).join(', '));

    const cats = await getCategories();
    check('getCategories returns the 4 seeded categories, sorted',
      JSON.stringify(cats) === JSON.stringify(['accessories', 'clothing', 'electronics', 'shoes']),
      JSON.stringify(cats));

    // -----------------------------------------------------------------------
    console.log('\n=== Criterion 10: conversation creation ===');
    const conv = await createConversation({});
    created.conversations.push(conv.id);
    check('createConversation returns a UUID id', /^[0-9a-f-]{36}$/.test(conv.id), conv.id);
    check('a new conversation is active', conv.status === 'active', conv.status);
    check('an anonymous conversation has userId null (chat before sign-in)',
      conv.userId === null, String(conv.userId));

    check('getConversationById round-trips it',
      (await getConversationById(conv.id))?.id === conv.id);
    check('getConversationById returns null for an unknown id',
      (await getConversationById('00000000-0000-0000-0000-000000000000')) === null);

    check('status can move active -> archived',
      (await updateConversationStatus(conv.id, 'archived')).status === 'archived');
    await updateConversationStatus(conv.id, 'active');

    // -----------------------------------------------------------------------
    console.log('\n=== Criterion 11: messages stored and retrieved in order ===');
    const m1 = await createMessage({
      conversationId: conv.id,
      role: 'user',
      content: `[run ${RUN}] find me a black hoodie under 2000`,
    });
    created.messages.push(m1.id);
    const m2 = await createMessage({
      conversationId: conv.id,
      role: 'assistant',
      content: `[run ${RUN}] I found two. Which do you prefer?`,
      metadata: { run: RUN },
    });
    created.messages.push(m2.id);

    const transcript = await getConversationMessages(conv.id);
    check('both messages are stored', transcript.length === 2, `got ${transcript.length}`);
    check('the transcript comes back in chronological order',
      transcript[0].role === 'user' && transcript[1].role === 'assistant',
      transcript.map((m) => m.role).join(','));
    check('message metadata survives the round-trip',
      transcript[1].metadata?.run === RUN, JSON.stringify(transcript[1].metadata));
    await throwsWith('a message for an unknown conversation is refused by the FK',
      () => createMessage({
        conversationId: '00000000-0000-0000-0000-000000000000', role: 'user', content: 'orphan',
      }), { status: 400 });

    // -----------------------------------------------------------------------
    console.log('\n=== Criterion 12: orders stored and retrieved ===');
    const order = await createOrderRecord({
      productId: hoodie.id, quantity: 2, conversationId: conv.id, metadata: { run: RUN },
    });
    created.orders.push(order.id);

    check('a new order starts in PENDING_CONFIRMATION - nothing irreversible yet',
      order.status === 'PENDING_CONFIRMATION', order.status);
    check('the amount is derived server-side from the catalogue (179900 x 2 = 359800)',
      order.amount === 359800, String(order.amount));
    check('the client never supplies the amount', order.amount === hoodie.price * 2);
    check('currency is copied from the product', order.currency === 'INR', order.currency);
    check('no Razorpay ids exist yet - that phase is not built',
      order.razorpayOrderId === null && order.razorpayPaymentId === null,
      JSON.stringify([order.razorpayOrderId, order.razorpayPaymentId]));
    check('the idempotency key is NOT echoed back in the public shape',
      !('idempotencyKey' in order), JSON.stringify(Object.keys(order)));

    check('getOrderById round-trips it', (await getOrderById(order.id))?.id === order.id);
    check('the order is reachable from its conversation',
      (await getConversationOrders(conv.id)).some((o) => o.id === order.id));

    await throwsWith('quantity 0 is refused before any insert',
      () => createOrderRecord({ productId: hoodie.id, quantity: 0 }), { status: 400 });
    await throwsWith('an order for an unknown product is a 404',
      () => createOrderRecord({
        productId: '00000000-0000-0000-0000-000000000000', quantity: 1,
      }), { status: 404 });
    await throwsWith('a quantity large enough to overflow INTEGER is refused',
      () => createOrderRecord({ productId: hoodie.id, quantity: 1_000_000 }), { status: 400 });

    // -----------------------------------------------------------------------
    console.log('\n=== Order state machine: the approval gate ===');
    check('PENDING_CONFIRMATION -> ORDER_CREATED (the explicit user yes)',
      (await updateOrderStatus(order.id, 'ORDER_CREATED')).status === 'ORDER_CREATED');
    await throwsWith('ORDER_CREATED -> PAID refused: payment cannot be skipped',
      () => updateOrderStatus(order.id, 'PAID'), { status: 409 });
    check('ORDER_CREATED -> PAYMENT_PENDING',
      (await updateOrderStatus(order.id, 'PAYMENT_PENDING')).status === 'PAYMENT_PENDING');

    const paid = await updateOrderStatus(order.id, 'PAID', {
      razorpayPaymentId: `pay_verify_${RUN}`,
    });
    check('PAYMENT_PENDING -> PAID, the webhook path', paid.status === 'PAID');
    check('the payment id is attached during the transition',
      paid.razorpayPaymentId === `pay_verify_${RUN}`, String(paid.razorpayPaymentId));

    await throwsWith('PAID is terminal: -> CANCELLED refused',
      () => updateOrderStatus(order.id, 'CANCELLED'), { status: 409 });
    await throwsWith('PAID is terminal: -> PAYMENT_FAILED refused',
      () => updateOrderStatus(order.id, 'PAYMENT_FAILED'), { status: 409 });
    await throwsWith('transitioning an unknown order is a 404',
      () => updateOrderStatus('00000000-0000-0000-0000-000000000000', 'PAID'), { status: 404 });

    // -----------------------------------------------------------------------
    console.log('\n=== Idempotency: replay vs. conflict ===');
    const key = `verify-${RUN}`;
    const first = await createOrderRecord({
      productId: hoodie.id, quantity: 1, conversationId: conv.id, idempotencyKey: key,
    });
    created.orders.push(first.id);

    const replay = await createOrderRecord({
      productId: hoodie.id, quantity: 1, conversationId: conv.id, idempotencyKey: key,
    });
    check('replaying the same key with the same parameters returns the SAME order',
      replay.id === first.id, `${first.id} vs ${replay.id}`);
    const { count: dupCount } = await supabaseAdmin
      .from('orders').select('id', { count: 'exact' }).eq('idempotency_key', key);
    check('and created no second row', dupCount === 1, `${dupCount} rows`);

    // The Stripe-style distinction: same key, different request is an error, not a
    // replay. Returning `first` here would hand the caller an order for a product
    // they never asked for, with a 2xx.
    const conflict = await throwsWith(
      'the same key with a DIFFERENT quantity is a 409, not a silent wrong answer',
      () => createOrderRecord({
        productId: hoodie.id, quantity: 5, conversationId: conv.id, idempotencyKey: key,
      }), { status: 409 });
    check('the conflict is specifically IDEMPOTENCY_KEY_REUSED',
      conflict?.code === 'IDEMPOTENCY_KEY_REUSED', String(conflict?.code));
    await throwsWith('the same key with a DIFFERENT product is also a 409',
      () => createOrderRecord({
        productId: hoodies.find((h) => h.id !== hoodie.id).id,
        quantity: 1,
        conversationId: conv.id,
        idempotencyKey: key,
      }), { status: 409 });

    // -----------------------------------------------------------------------
    console.log('\n=== Criterion 13: agent actions (the audit trail) ===');
    const reqId = `req-${RUN}`;
    const started = await startAgentAction({
      toolName: 'search_products',
      actionType: 'READ_ACTION',
      conversationId: conv.id,
      requestId: reqId,
      input: { query: 'black hoodie', maxPrice: 200000 },
      reason: 'User asked for a black hoodie under Rs 2,000.',
    });
    created.actions.push(started.id);
    check('startAgentAction records status "started"',
      started.status === 'started', started.status);
    check('completeAgentAction moves it to "success"',
      (await completeAgentAction(started.id, { matched: 2 })).status === 'success');

    // Logged BEFORE the action happens: if the process dies mid-call, the record of
    // the attempt survives.
    const money = await startAgentAction({
      toolName: 'create_order',
      actionType: 'MONEY_ACTION',
      conversationId: conv.id,
      orderId: order.id,
      requestId: reqId,
      reason: 'User approved: "yes, buy the Essential Black Hoodie".',
      input: {
        productId: hoodie.id,
        quantity: 2,
        // Must not survive into the stored row.
        card: { number: '4111111111111111', cvv: '123' },
      },
    });
    created.actions.push(money.id);
    await completeAgentAction(money.id, { orderId: order.id });

    const stored = await supabaseAdmin
      .from('agent_actions').select('input, reason').eq('id', money.id).single();
    const blob = JSON.stringify(stored.data);
    check('a card number in tool input is NEVER persisted',
      !blob.includes('4111111111111111'), blob);
    check('it is stored as [REDACTED], and the harmless fields survive',
      blob.includes('[REDACTED]') && blob.includes(hoodie.id), blob);
    check('the agent\'s stated reason is preserved verbatim for the audit trail',
      stored.data?.reason?.includes('User approved'), String(stored.data?.reason));

    const failedAction = await startAgentAction({
      toolName: 'create_payment_link', actionType: 'MONEY_ACTION', orderId: order.id,
    });
    created.actions.push(failedAction.id);
    const failedRow = await failAgentAction(
      failedAction.id, 'PROVIDER_TIMEOUT', 'The payment provider did not respond in time.');
    check('failAgentAction records status "failed"',
      failedRow.status === 'failed', failedRow.status);
    check('the failure carries an operator-safe code, not a raw provider string',
      failedRow.errorCode === 'PROVIDER_TIMEOUT', String(failedRow.errorCode));

    const blocked = await recordBlockedAction({
      toolName: 'create_order',
      actionType: 'MONEY_ACTION',
      conversationId: conv.id,
      errorCode: 'APPROVAL_REQUIRED',
      reasonMessage: 'No explicit user approval in the transcript.',
    });
    created.actions.push(blocked.id);
    check('a refused action is recorded as "blocked", not discarded',
      blocked.status === 'blocked', blocked.status);
    check('"blocked" stays distinct from "failed" - a guardrail firing is not an error',
      blocked.errorCode === 'APPROVAL_REQUIRED', String(blocked.errorCode));

    check('all conversation-linked actions are retrievable',
      (await getConversationActions(conv.id)).length >= 3);
    check('actions are retrievable by order id',
      (await getOrderActions(order.id)).length >= 2);
    const byReq = await getActionsByRequestId(reqId);
    check('actions are retrievable by request id, tying the audit to one HTTP call',
      byReq.length === 2, `got ${byReq.length}`);

    // -----------------------------------------------------------------------
    console.log('\n=== Criterion 14: RLS as the ANON key (what ships to clients) ===');
    const { data: pub, error: pubErr } = await supabasePublic
      .from('products').select('id, active, slug');
    check('anon CAN read products', pubErr === null && Array.isArray(pub),
      pubErr ? `${pubErr.code} ${pubErr.message}` : '');
    check('anon sees only the 13 active ones', pub?.length === 13, `saw ${pub?.length}`);
    check('no inactive product is visible to anon',
      (pub ?? []).every((p) => p.active === true)
        && !(pub ?? []).some((p) => p.slug === 'retired-canvas-tote'));

    for (const table of ['orders', 'payment_events', 'agent_actions', 'messages',
      'conversations', 'profiles']) {
      const { data, error } = await supabasePublic.from(table).select('id').limit(1);
      check(`anon reading ${table.padEnd(14)} yields nothing`,
        error !== null || (data?.length ?? 0) === 0,
        `RETURNED DATA: ${JSON.stringify(data)}`);
    }

    // The one that matters most: the order this run just created must be unreachable
    // with the key that ships inside a client bundle.
    const { data: leak } = await supabasePublic
      .from('orders').select('id, amount').eq('id', order.id);
    check('the order created above is INVISIBLE to the anon key',
      (leak?.length ?? 0) === 0, JSON.stringify(leak));

    const { error: wErr } = await supabasePublic
      .from('products').update({ price: 1 }).eq('id', hoodie.id);
    check('anon cannot rewrite a price', wErr !== null, 'THE WRITE SUCCEEDED');
    const { error: oErr } = await supabasePublic.from('orders')
      .insert({ product_id: hoodie.id, quantity: 1, amount: 1, currency: 'INR' });
    check('anon cannot forge an order', oErr !== null, 'THE INSERT SUCCEEDED');
    const { error: peErr } = await supabasePublic.from('payment_events')
      .insert({ event_type: 'forged.payment.captured', signature_verified: true });
    check('anon cannot forge a payment event (the impersonation attack)',
      peErr !== null, 'THE INSERT SUCCEEDED');

    check('the product price is unchanged after all of the above',
      (await getProductById(hoodie.id)).price === 179900);
  } catch (e) {
    fail += 1;
    failures.push('unexpected exception');
    console.log(`\n  FAIL  unexpected exception: ${e.stack ?? e.message}`);
  } finally {
    // -----------------------------------------------------------------------
    // Cleanup, in reverse dependency order. Runs even after a failure, so a broken
    // assertion does not leave rows behind in the user's project.
    // -----------------------------------------------------------------------
    console.log('\n=== Cleanup ===');
    const del = async (table, ids) => {
      if (ids.length === 0) return 0;
      const { error } = await supabaseAdmin.from(table).delete().in('id', ids);
      if (error) console.log(`  WARN  could not delete from ${table}: ${error.message}`);
      return error ? 0 : ids.length;
    };
    // agent_actions and messages first: they reference orders and conversations.
    const a = await del('agent_actions', created.actions);
    const m = await del('messages', created.messages);
    const o = await del('orders', created.orders);
    const c = await del('conversations', created.conversations);
    console.log(`  removed ${a} agent_actions, ${m} messages, ${o} orders, ${c} conversations`);

    const { count: leftover } = await supabaseAdmin
      .from('orders').select('id', { count: 'exact' }).like('idempotency_key', `verify-${RUN}%`);
    console.log(`  leftover rows tagged ${RUN}: ${leftover ?? 0}`);
    const { count: productCount } = await supabaseAdmin
      .from('products').select('id', { count: 'exact' });
    console.log(`  products untouched: ${productCount ?? '?'} (expected 14)`);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  if (DRY_RUN) {
    dryRun();
    console.log(`\n${'='.repeat(66)}`);
    console.log(`DRY RUN: ${pass} passed, ${fail} failed`);
    console.log('='.repeat(66));
    return fail === 0 ? 0 : 1;
  }

  const ready = await getReadiness();
  // 2, not 1: "could not run" is a different outcome from "ran, and something
  // failed", and anything scripting this needs to tell them apart.
  if (!gate(ready)) return 2;

  await verify(ready);

  console.log(`\n${'='.repeat(66)}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log('='.repeat(66));
  return fail === 0 ? 0 : 1;
}

process.exitCode = await main();
