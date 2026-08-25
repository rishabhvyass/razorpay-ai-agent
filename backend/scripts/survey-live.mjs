/**
 * Read-only survey of the live Supabase project.
 *
 * Mutates nothing. Answers three questions before any integration test runs:
 * has the migration been applied, is the seed data present, and is RLS actually
 * enforced against the anon key.
 */

const { supabaseAdmin, supabasePublic } = await import('../dist/db/supabase.js');

const TABLES = [
  'profiles',
  'products',
  'conversations',
  'messages',
  'orders',
  'agent_actions',
  'payment_events',
];

console.log('\n=== Migration: do the seven tables exist? ===');
for (const table of TABLES) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`  MISSING  ${table.padEnd(16)} ${error.code ?? ''} ${error.message ?? ''}`);
  } else {
    console.log(`  ok       ${table.padEnd(16)} ${count} row(s)`);
  }
}

console.log('\n=== Seed data: the three README claims ===');
{
  const { count: total } = await supabaseAdmin
    .from('products').select('*', { count: 'exact', head: true });
  const { count: active } = await supabaseAdmin
    .from('products').select('*', { count: 'exact', head: true }).eq('active', true);
  const { count: purchasable } = await supabaseAdmin
    .from('products').select('*', { count: 'exact', head: true }).eq('active', true).gt('stock', 0);

  console.log(`  total products        ${total}   (README claims 14)`);
  console.log(`  active                ${active}   (README claims 13)`);
  console.log(`  active and in stock   ${purchasable}   (README claims 12)`);

  const { data: hoodies } = await supabaseAdmin
    .from('products')
    .select('slug, name, price, metadata')
    .eq('active', true)
    .lte('price', 200000)
    .ilike('name', '%hoodie%');
  const black = (hoodies ?? []).filter((p) => p.metadata?.color === 'black');
  console.log(`  black hoodies <= Rs 2,000: ${black.length}   (README claims 2)`);
  for (const p of black) console.log(`      ${p.slug.padEnd(26)} ${p.price}`);
}

console.log('\n=== Idempotency fingerprint column present? ===');
{
  const { error } = await supabaseAdmin
    .from('orders').select('idempotency_fingerprint').limit(1);
  console.log(error ? `  MISSING: ${error.code} ${error.message}` : '  ok  orders.idempotency_fingerprint exists');
}

console.log('\n=== RLS: what can the ANON key reach? ===');
console.log('  (this is the real proof of the security model - anon is what ships to clients)');
{
  const probes = [
    ['products (active only should be readable)', () =>
      supabasePublic.from('products').select('id', { count: 'exact', head: true }).eq('active', true)],
    ['products (inactive must NOT be readable)', () =>
      supabasePublic.from('products').select('id', { count: 'exact', head: true }).eq('active', false)],
    ['orders (must be blocked)', () =>
      supabasePublic.from('orders').select('id', { count: 'exact', head: true })],
    ['payment_events (must be blocked)', () =>
      supabasePublic.from('payment_events').select('id', { count: 'exact', head: true })],
    ['agent_actions (must be blocked)', () =>
      supabasePublic.from('agent_actions').select('id', { count: 'exact', head: true })],
    ['messages (must be blocked)', () =>
      supabasePublic.from('messages').select('id', { count: 'exact', head: true })],
    ['conversations (must be blocked)', () =>
      supabasePublic.from('conversations').select('id', { count: 'exact', head: true })],
    ['profiles (must be blocked)', () =>
      supabasePublic.from('profiles').select('id', { count: 'exact', head: true })],
  ];

  for (const [label, run] of probes) {
    const { count, error } = await run();
    const verdict = error ? `BLOCKED (${error.code ?? 'err'})` : `readable, ${count} row(s)`;
    console.log(`  ${label.padEnd(46)} ${verdict}`);
  }
}

console.log('\n=== RLS: can the ANON key WRITE? (all of these must fail) ===');
{
  const writes = [
    ['insert into products', () =>
      supabasePublic.from('products').insert({ name: 'rls probe', slug: `rls-probe-${Date.now()}`, price: 1 })],
    ['insert into orders', () =>
      supabasePublic.from('orders').insert({
        product_id: '00000000-0000-0000-0000-000000000000', quantity: 1, amount: 1, currency: 'INR' })],
    ['insert into payment_events', () =>
      supabasePublic.from('payment_events').insert({ event_type: 'rls.probe' })],
    ['update products', () =>
      supabasePublic.from('products').update({ price: 1 }).eq('active', true)],
  ];

  for (const [label, run] of writes) {
    const { error } = await run();
    console.log(`  ${label.padEnd(30)} ${error ? `REFUSED (${error.code ?? 'err'})` : '*** ALLOWED - THIS IS A HOLE ***'}`);
  }
}

console.log('');
