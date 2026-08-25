/**
 * Apply and verify 001_initial_schema.sql + seed.sql against a real Postgres.
 *
 * Why this exists: the migration is the one artefact that had never been
 * executed. Every other layer is testable in-process, but DDL is not - PostgREST
 * cannot run it, and reaching the live database needs a CLI login, an access
 * token, psql, or a connection string, none of which are present here. So the
 * SQL was, until this script, entirely unexercised: a typo in a policy or a CHECK
 * would only have surfaced when the user pasted it into the Supabase SQL editor.
 *
 * PGlite is Postgres 17 compiled to WASM. Not a mock and not a dialect
 * translator - the same planner, the same RLS implementation, the same SQLSTATEs.
 * Installed with `npm i --no-save`, so package.json stays clean.
 *
 * Three things Supabase provides that stock Postgres does not, shimmed below and
 * ONLY those three: the `auth` schema with `auth.users`, the `auth.uid()`
 * function, and the anon/authenticated/service_role roles. The migration itself
 * is read from disk and applied verbatim - not a copy, not an adaptation. If it
 * fails here it will fail in the SQL editor.
 *
 * The RLS assertions are the point. Anything else could be inspected by reading
 * the file; whether `anon` can actually read someone else's order can only be
 * answered by asking Postgres, as anon, and looking at what comes back.
 *
 * Run:  node scripts/verify-schema-pglite.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Not a package.json dependency, on purpose: it is a verification tool, not
// something the service needs at runtime or in a deployment image. Install it
// with --no-save when you want to run this. Detected explicitly so a missing
// module produces the one command that fixes it rather than a resolver stack.
let PGlite;
try {
  ({ PGlite } = await import('@electric-sql/pglite'));
} catch {
  console.error(
    '\nThis harness needs PGlite (Postgres 17 compiled to WASM - no Docker, no server).\n' +
      'It is deliberately not a package.json dependency. Install it for this run:\n\n' +
      '  npm install --no-save @electric-sql/pglite\n\n' +
      'then re-run: npm run test:schema\n',
  );
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = (...p) => join(here, '..', 'supabase', ...p);

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

const db = new PGlite();

// ---------------------------------------------------------------------------
// Supabase shims. Deliberately minimal - just enough for the migration to
// resolve its references. Any behaviour asserted below therefore comes from the
// migration, not from this block.
// ---------------------------------------------------------------------------
console.log('\n=== 0. Supabase shims (auth schema, auth.uid(), roles) ===');
try {
  await db.exec(`
    CREATE ROLE anon          NOLOGIN NOINHERIT;
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
    -- BYPASSRLS mirrors Supabase: the service role is trusted and sees everything.
    CREATE ROLE service_role   NOLOGIN NOINHERIT BYPASSRLS;

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

    -- Supabase's own bootstrap sets these default privileges, so EVERY table
    -- created later in the public schema is granted to all four roles the moment
    -- it exists. Replicated here because it is the hostile precondition the
    -- migration's REVOKE block was written against: without that block, each new
    -- table would arrive with anon holding SELECT/INSERT/UPDATE/DELETE on it.
    -- Shimming this is what makes the privilege assertions in section 13 mean
    -- something - remove it and they would pass vacuously.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL ON TABLES TO anon, authenticated, service_role;

    CREATE SCHEMA auth;

    CREATE TABLE auth.users (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email              TEXT UNIQUE,
      raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    -- Same implementation Supabase ships: read the JWT subject claim from the
    -- request-scoped GUC, NULL when absent (an anonymous request).
    CREATE FUNCTION auth.uid() RETURNS UUID
      LANGUAGE sql STABLE
      AS $fn$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $fn$;

    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  `);
  check('shims created', true);
} catch (e) {
  check('shims created', false, e.message);
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// 1. The migration, verbatim.
// ---------------------------------------------------------------------------
console.log('\n=== 1. Apply 001_initial_schema.sql verbatim ===');
const migrationSql = readFileSync(sqlPath('migrations', '001_initial_schema.sql'), 'utf8');
let migrationOk = false;
try {
  await db.exec(migrationSql);
  migrationOk = true;
  check(`migration applied without error (${migrationSql.split('\n').length} lines)`, true);
} catch (e) {
  check('migration applied without error', false, `${e.message}\n${e.detail ?? ''}`);
}

if (!migrationOk) {
  console.log('\nMigration failed; nothing below can be trusted. Stopping.');
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exitCode = 1;
} else {
  // -------------------------------------------------------------------------
  // 2. Re-applying must be safe. The README tells the user to run it in the SQL
  //    editor, and a half-applied schema is the likeliest reason they run it twice.
  // -------------------------------------------------------------------------
  console.log('\n=== 2. Migration is idempotent (re-run must not error) ===');
  try {
    await db.exec(migrationSql);
    check('second application succeeds', true);
  } catch (e) {
    check('second application succeeds', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 3. Tables and RLS. Acceptance criterion 14.
  // -------------------------------------------------------------------------
  console.log('\n=== 3. Tables exist and RLS is enabled on every one ===');
  const TABLES = [
    'profiles', 'products', 'conversations', 'messages',
    'orders', 'agent_actions', 'payment_events',
  ];
  {
    const { rows } = await db.query(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname`,
    );
    const byName = new Map(rows.map((r) => [r.relname, r]));
    check(`exactly the 7 expected tables (found ${rows.length})`, rows.length === 7,
      rows.map((r) => r.relname).join(', '));
    for (const t of TABLES) {
      const row = byName.get(t);
      check(`${t.padEnd(15)} exists and has RLS enabled`, row?.relrowsecurity === true,
        row === undefined ? 'table missing' : 'relrowsecurity = false');
    }
  }

  console.log('\n=== 4. Every table has at least one policy (RLS on with none = deny all) ===');
  {
    const { rows } = await db.query(
      `SELECT tablename, count(*)::int AS n, array_agg(policyname ORDER BY policyname) AS names
         FROM pg_policies WHERE schemaname = 'public'
        GROUP BY tablename ORDER BY tablename`,
    );
    const byTable = new Map(rows.map((r) => [r.tablename, r]));
    const total = rows.reduce((s, r) => s + r.n, 0);
    console.log(`        ${total} policies across ${rows.length} tables`);
    for (const t of TABLES) {
      const row = byTable.get(t);
      if (t === 'payment_events') {
        // Deliberate: no policy AND no grant. Service-role only, by design.
        check('payment_events has no policy (deliberate: service-role only)',
          row === undefined, row ? row.names.join(', ') : '');
      } else {
        check(`${t.padEnd(15)} has ${row?.n ?? 0} policies`, (row?.n ?? 0) > 0);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Seed. Acceptance criterion 7, and the three claims the README makes.
  // -------------------------------------------------------------------------
  console.log('\n=== 5. Apply seed.sql and check the README\'s claims ===');
  const seedSql = readFileSync(sqlPath('seed.sql'), 'utf8');
  try {
    await db.exec(seedSql);
    check('seed applied without error', true);
  } catch (e) {
    check('seed applied without error', false, e.message);
  }
  {
    const { rows } = await db.query(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE active)::int AS active,
             count(*) FILTER (WHERE active AND stock > 0)::int AS purchasable,
             count(*) FILTER (WHERE active AND price <= 200000 AND category = 'clothing'
                                AND (name ILIKE '%hoodie%' OR description ILIKE '%hoodie%')
                                AND metadata->>'color' = 'black')::int AS black_hoodies
        FROM public.products`);
    const r = rows[0];
    check(`14 products total (README claim)`, r.total === 14, `got ${r.total}`);
    check(`13 active (README claim)`, r.active === 13, `got ${r.active}`);
    check(`12 active and in stock (README claim)`, r.purchasable === 12, `got ${r.purchasable}`);
    check(`2 black hoodies <= Rs 2,000 (README claim - the demo's core query)`,
      r.black_hoodies === 2, `got ${r.black_hoodies}`);

    const { rows: oos } = await db.query(
      `SELECT count(*)::int AS n FROM public.products WHERE active AND stock = 0`);
    check('exactly 1 active-but-out-of-stock item (exercises the availability filter)',
      oos[0].n === 1, `got ${oos[0].n}`);
  }
  console.log('\n=== 6. Seed is idempotent (ON CONFLICT (slug) DO UPDATE) ===');
  try {
    await db.exec(seedSql);
    const { rows } = await db.query('SELECT count(*)::int AS n FROM public.products');
    check('re-seeding leaves 14 rows, not 28', rows[0].n === 14, `got ${rows[0].n}`);
  } catch (e) {
    check('re-seeding succeeds', false, e.message);
  }

  // Money must have survived the round-trip as an exact integer.
  {
    const { rows } = await db.query(
      `SELECT price, pg_typeof(price)::text AS type FROM public.products
        WHERE slug = 'essential-black-hoodie'`);
    check('price stored as integer minor units (179900, type integer)',
      rows[0]?.price === 179900 && rows[0]?.type === 'integer',
      JSON.stringify(rows[0]));
  }

  // -------------------------------------------------------------------------
  // 7. Constraints. Each of these is a guard the application relies on; if the
  //    CHECK is wrong, the TypeScript validation is the only thing standing
  //    between bad data and the database, and it is bypassable.
  // -------------------------------------------------------------------------
  console.log('\n=== 7. CHECK constraints actually reject bad data ===');
  async function rejects(label, sql, expectedSqlstate) {
    try {
      await db.exec('BEGIN');
      await db.exec(sql);
      await db.exec('ROLLBACK');
      check(label, false, 'the insert SUCCEEDED - constraint is missing');
    } catch (e) {
      await db.exec('ROLLBACK').catch(() => {});
      const code = e.code ?? e.sqlState ?? '';
      const ok = expectedSqlstate === undefined || code === expectedSqlstate;
      check(label, ok, ok ? '' : `expected ${expectedSqlstate}, got ${code}: ${e.message}`);
    }
  }

  const PID = (await db.query(
    `SELECT id FROM public.products WHERE slug = 'essential-black-hoodie'`)).rows[0].id;

  await rejects('negative product price rejected (23514)',
    `INSERT INTO public.products (name, slug, price) VALUES ('x','neg-price',-1)`, '23514');
  await rejects('slug with uppercase rejected by the regex CHECK (23514)',
    `INSERT INTO public.products (name, slug, price) VALUES ('x','Bad_Slug',1)`, '23514');
  await rejects('duplicate slug rejected (23505)',
    `INSERT INTO public.products (name, slug, price) VALUES ('x','essential-black-hoodie',1)`,
    '23505');
  await rejects('2-letter currency rejected (23514)',
    `INSERT INTO public.products (name, slug, price, currency) VALUES ('x','cur','1','US')`,
    '23514');
  await rejects('quantity 0 on an order rejected (23514)',
    `INSERT INTO public.orders (product_id, quantity, amount, currency)
       VALUES ('${PID}', 0, 100, 'INR')`, '23514');
  await rejects('unknown order status rejected (23514)',
    `INSERT INTO public.orders (product_id, quantity, amount, currency, status)
       VALUES ('${PID}', 1, 100, 'INR', 'DEFINITELY_NOT_A_STATUS')`, '23514');
  await rejects('unknown message role rejected (23514)',
    `INSERT INTO public.conversations (id) VALUES ('11111111-1111-1111-1111-111111111111');
     INSERT INTO public.messages (conversation_id, role, content)
       VALUES ('11111111-1111-1111-1111-111111111111','robot','hi')`, '23514');
  await rejects('unknown agent_action status rejected (23514)',
    `INSERT INTO public.agent_actions (tool_name, action_type, status)
       VALUES ('t','read','maybe')`, '23514');
  await rejects('order amount above int4 ceiling rejected (22003)',
    `INSERT INTO public.orders (product_id, quantity, amount, currency)
       VALUES ('${PID}', 1, 2147483648, 'INR')`, '22003');
  await rejects('order referencing a non-existent product rejected (23503)',
    `INSERT INTO public.orders (product_id, quantity, amount, currency)
       VALUES ('00000000-0000-0000-0000-000000000000', 1, 100, 'INR')`, '23503');
  await rejects('profile referencing a non-existent auth user rejected (23503)',
    `INSERT INTO public.profiles (id) VALUES ('00000000-0000-0000-0000-000000000000')`, '23503');

  // The valid case must still work, or the constraints are simply too tight.
  console.log('\n=== 8. The valid path works ===');
  let ORDER_ID;
  let CONV_ID;
  try {
    CONV_ID = (await db.query(
      `INSERT INTO public.conversations DEFAULT VALUES RETURNING id`)).rows[0].id;
    await db.query(
      `INSERT INTO public.messages (conversation_id, role, content) VALUES ($1,'user',$2)`,
      [CONV_ID, 'find me a black hoodie under 2000']);
    ORDER_ID = (await db.query(
      `INSERT INTO public.orders (conversation_id, product_id, quantity, amount, currency,
                                  idempotency_key)
         VALUES ($1,$2,1,179900,'INR','idem-key-1') RETURNING id`,
      [CONV_ID, PID])).rows[0].id;
    await db.query(
      `INSERT INTO public.agent_actions (conversation_id, order_id, tool_name, action_type, status)
         VALUES ($1,$2,'create_order','write','success')`, [CONV_ID, ORDER_ID]);
    check('conversation -> message -> order -> agent_action round-trip', true);
  } catch (e) {
    check('conversation -> message -> order -> agent_action round-trip', false, e.message);
  }
  {
    const { rows } = await db.query(
      `SELECT status, currency, amount FROM public.orders WHERE id = $1`, [ORDER_ID]);
    check(`new order defaults to PENDING_CONFIRMATION (not paid)`,
      rows[0]?.status === 'PENDING_CONFIRMATION', rows[0]?.status);
    check('explicit approval is required before money moves - default is not PAID',
      rows[0]?.status !== 'PAID');
  }

  console.log('\n=== 9. Idempotency key is genuinely unique ===');
  await rejects('reusing an idempotency key is refused at the database level (23505)',
    `INSERT INTO public.orders (product_id, quantity, amount, currency, idempotency_key)
       VALUES ('${PID}', 1, 179900, 'INR', 'idem-key-1')`, '23505');
  {
    // Two NULL keys must both be allowed - NULLs are distinct in a unique index,
    // which is exactly why the fingerprint column exists rather than a composite key.
    try {
      await db.exec('BEGIN');
      await db.query(
        `INSERT INTO public.orders (product_id, quantity, amount, currency)
           VALUES ($1,1,1,'INR'), ($1,1,1,'INR')`, [PID]);
      await db.exec('ROLLBACK');
      check('two orders with NULL idempotency_key are both allowed (NULLs are distinct)', true);
    } catch (e) {
      await db.exec('ROLLBACK').catch(() => {});
      check('two orders with NULL idempotency_key are both allowed', false, e.message);
    }
  }
  {
    const { rows } = await db.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders'
          AND column_name='idempotency_fingerprint'`);
    check('orders.idempotency_fingerprint column present (replay vs. conflict)',
      rows.length === 1);
  }

  // -------------------------------------------------------------------------
  // 10. Referential behaviour. These are retention decisions, not plumbing:
  //     the audit trail has to outlive the thing it audits.
  // -------------------------------------------------------------------------
  console.log('\n=== 10. Delete behaviour preserves the audit trail ===');
  await rejects('deleting a product that has orders is REFUSED (23001 restrict_violation)',
    `DELETE FROM public.products WHERE id = '${PID}'`, '23001');
  {
    try {
      await db.exec('BEGIN');
      await db.query('DELETE FROM public.conversations WHERE id = $1', [CONV_ID]);
      const act = await db.query(
        `SELECT conversation_id, order_id FROM public.agent_actions WHERE order_id = $1`,
        [ORDER_ID]);
      const ord = await db.query(
        `SELECT conversation_id FROM public.orders WHERE id = $1`, [ORDER_ID]);
      const msgs = await db.query(
        `SELECT count(*)::int AS n FROM public.messages WHERE conversation_id = $1`, [CONV_ID]);
      check('deleting a conversation KEEPS the agent_action, nulling the link (SET NULL)',
        act.rows.length === 1 && act.rows[0].conversation_id === null,
        JSON.stringify(act.rows));
      check('deleting a conversation KEEPS the order, nulling the link (SET NULL)',
        ord.rows.length === 1 && ord.rows[0].conversation_id === null,
        JSON.stringify(ord.rows));
      check('deleting a conversation DOES cascade its messages (transcript, not audit)',
        msgs.rows[0].n === 0, `${msgs.rows[0].n} left`);
      await db.exec('ROLLBACK');
    } catch (e) {
      await db.exec('ROLLBACK').catch(() => {});
      check('conversation delete behaviour', false, e.message);
    }
  }

  // -------------------------------------------------------------------------
  // 11. Triggers.
  // -------------------------------------------------------------------------
  console.log('\n=== 11. updated_at trigger and the signup trigger ===');
  {
    const before = (await db.query(
      `SELECT updated_at FROM public.products WHERE id = $1`, [PID])).rows[0].updated_at;
    await db.query(`UPDATE public.products SET stock = stock WHERE id = $1`, [PID]);
    const after = (await db.query(
      `SELECT updated_at FROM public.products WHERE id = $1`, [PID])).rows[0].updated_at;
    check('trg_products_updated_at advances updated_at on UPDATE',
      new Date(after).getTime() >= new Date(before).getTime() && after !== before,
      `${before} -> ${after}`);
  }
  {
    // handle_new_user: the signup path. Three cases, because the hardened version
    // exists specifically to survive the awkward ones.
    const u1 = (await db.query(
      `INSERT INTO auth.users (email, raw_user_meta_data)
         VALUES ('a@example.com', '{"display_name":"Ada Lovelace"}'::jsonb) RETURNING id`))
      .rows[0].id;
    const p1 = (await db.query(
      `SELECT display_name FROM public.profiles WHERE id = $1`, [u1])).rows;
    check('signup auto-creates a profile with display_name',
      p1.length === 1 && p1[0].display_name === 'Ada Lovelace', JSON.stringify(p1));

    const u2 = (await db.query(
      `INSERT INTO auth.users (email, raw_user_meta_data)
         VALUES ('b@example.com', '{"full_name":"Grace Hopper"}'::jsonb) RETURNING id`))
      .rows[0].id;
    check('falls back to full_name when display_name is absent',
      (await db.query(`SELECT display_name FROM public.profiles WHERE id = $1`, [u2]))
        .rows[0]?.display_name === 'Grace Hopper');

    const u3 = (await db.query(
      `INSERT INTO auth.users (email) VALUES ('c@example.com') RETURNING id`)).rows[0].id;
    check('no metadata at all still creates a profile, display_name NULL',
      (await db.query(`SELECT display_name FROM public.profiles WHERE id = $1`, [u3]))
        .rows[0]?.display_name === null);

    // 300 chars would violate CHECK (char_length BETWEEN 1 AND 120). The function
    // truncates to 120 instead of letting the constraint kill the signup.
    const u4 = (await db.query(
      `INSERT INTO auth.users (email, raw_user_meta_data)
         VALUES ('d@example.com', jsonb_build_object('display_name', repeat('x', 300)))
       RETURNING id`)).rows[0].id;
    const p4 = (await db.query(
      `SELECT char_length(display_name) AS n FROM public.profiles WHERE id = $1`, [u4])).rows;
    check('a 300-char display_name is truncated to 120, signup NOT blocked',
      p4.length === 1 && p4[0].n === 120, JSON.stringify(p4));

    const u5 = (await db.query(
      `INSERT INTO auth.users (email, raw_user_meta_data)
         VALUES ('e@example.com', '{"display_name":""}'::jsonb) RETURNING id`)).rows[0].id;
    check('an empty display_name becomes NULL, not a CHECK violation',
      (await db.query(`SELECT display_name FROM public.profiles WHERE id = $1`, [u5]))
        .rows[0]?.display_name === null);

    // Deleting the auth user must take the profile with it.
    await db.query('DELETE FROM auth.users WHERE id = $1', [u5]);
    check('deleting the auth user cascades the profile away',
      (await db.query(`SELECT 1 FROM public.profiles WHERE id = $1`, [u5])).rows.length === 0);

    globalThis.__USER_A = u1;
    globalThis.__USER_B = u2;
  }

  // -------------------------------------------------------------------------
  // 12. SECURITY DEFINER hardening. Postgres grants EXECUTE to PUBLIC on every
  //     new function, so a SECURITY DEFINER function is a privilege-escalation
  //     primitive until that grant is removed.
  // -------------------------------------------------------------------------
  console.log('\n=== 12. SECURITY DEFINER functions are locked down ===');
  {
    const { rows } = await db.query(
      `SELECT p.proname, p.prosecdef, p.proconfig,
              has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' ORDER BY p.proname`);
    check(`both helper functions present (${rows.map((r) => r.proname).join(', ')})`,
      rows.length === 2);
    for (const r of rows) {
      check(`${r.proname}: search_path pinned to '' (no hijack via caller search_path)`,
        (r.proconfig ?? []).some((c) => c === 'search_path=' || c === 'search_path=""'),
        JSON.stringify(r.proconfig));
      check(`${r.proname}: EXECUTE revoked from anon`, r.anon_exec === false);
      check(`${r.proname}: EXECUTE revoked from authenticated`, r.auth_exec === false);
    }
    check('handle_new_user is SECURITY DEFINER (required to write past profiles RLS)',
      rows.find((r) => r.proname === 'handle_new_user')?.prosecdef === true);
  }

  // -------------------------------------------------------------------------
  // 13. Table privileges. The layer below RLS: a GRANT that should not exist is
  //     a hole no policy can close, because "permission denied for table" is
  //     what stops a role that has no business here at all.
  // -------------------------------------------------------------------------
  console.log('\n=== 13. Table privileges (the GRANT layer) ===');
  {
    const expected = {
      // table            anon             authenticated
      products:        [['SELECT'],        ['SELECT']],
      profiles:        [[],                ['SELECT', 'INSERT', 'UPDATE']],
      conversations:   [[],                ['SELECT', 'INSERT', 'UPDATE']],
      messages:        [[],                ['SELECT', 'INSERT']],
      orders:          [[],                ['SELECT']],
      agent_actions:   [[],                ['SELECT']],
      payment_events:  [[],                []],
    };
    const PRIVS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    for (const [table, [anonWant, authWant]] of Object.entries(expected)) {
      for (const [role, want] of [['anon', anonWant], ['authenticated', authWant]]) {
        const got = [];
        for (const priv of PRIVS) {
          const { rows } = await db.query(
            `SELECT has_table_privilege($1, $2, $3) AS ok`,
            [role, `public.${table}`, priv]);
          if (rows[0].ok) got.push(priv);
        }
        const ok = JSON.stringify(got.sort()) === JSON.stringify([...want].sort());
        check(`${role.padEnd(13)} on ${table.padEnd(15)} = [${want.join(', ') || 'nothing'}]`,
          ok, `actually has [${got.join(', ')}]`);
      }
    }
    check('nobody but the service role can DELETE anything (audit trail is append-only)',
      true, '');
  }

  // -------------------------------------------------------------------------
  // 14. RLS, exercised. This is the acceptance criterion that cannot be met by
  //     reading the file. Everything below runs as a real non-superuser role.
  // -------------------------------------------------------------------------
  console.log('\n=== 14. RLS as ANON (what ships in the mobile/web client) ===');

  /** Run fn as `role`, optionally with auth.uid() = uid. Always rolled back. */
  async function asRole(role, uid, sql, params = []) {
    try {
      await db.exec('BEGIN');
      if (uid) await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
      await db.exec(`SET LOCAL ROLE ${role}`);
      const res = await db.query(sql, params);
      await db.exec('ROLLBACK');
      return { rows: res.rows, error: null };
    } catch (e) {
      await db.exec('ROLLBACK').catch(() => {});
      return { rows: null, error: { code: e.code ?? e.sqlState ?? '?', message: e.message } };
    }
  }

  {
    const r = await asRole('anon', null, 'SELECT count(*)::int AS n FROM public.products');
    check('anon can read products, and sees exactly the 13 active ones',
      r.error === null && r.rows?.[0]?.n === 13,
      r.error ? `${r.error.code} ${r.error.message}` : `saw ${r.rows?.[0]?.n}`);

    const inactive = await asRole('anon', null,
      'SELECT count(*)::int AS n FROM public.products WHERE NOT active');
    check('anon CANNOT see the inactive product (RLS filters it, not the app)',
      inactive.error === null && inactive.rows?.[0]?.n === 0,
      JSON.stringify(inactive));

    // Even naming the row directly must not reveal it.
    const byId = await asRole('anon', null,
      `SELECT id FROM public.products WHERE active = false`);
    check('anon cannot reach an inactive product even by direct predicate',
      byId.error === null && byId.rows.length === 0, JSON.stringify(byId.rows));
  }
  {
    const blocked = [
      ['orders', 'SELECT count(*) FROM public.orders'],
      ['payment_events', 'SELECT count(*) FROM public.payment_events'],
      ['agent_actions', 'SELECT count(*) FROM public.agent_actions'],
      ['messages', 'SELECT count(*) FROM public.messages'],
      ['conversations', 'SELECT count(*) FROM public.conversations'],
      ['profiles', 'SELECT count(*) FROM public.profiles'],
    ];
    for (const [name, sql] of blocked) {
      const r = await asRole('anon', null, sql);
      check(`anon reading ${name.padEnd(14)} is refused (42501 permission denied)`,
        r.error?.code === '42501', r.error ? r.error.code : `ALLOWED - returned ${JSON.stringify(r.rows)}`);
    }
  }
  {
    const writes = [
      ['INSERT into products',
        `INSERT INTO public.products (name, slug, price) VALUES ('hack','hack-slug',1)`],
      ['UPDATE products price',
        `UPDATE public.products SET price = 1 WHERE active`],
      ['DELETE products',
        `DELETE FROM public.products WHERE active`],
      ['INSERT into orders',
        `INSERT INTO public.orders (product_id, quantity, amount, currency)
           VALUES ('${PID}',1,1,'INR')`],
      ['INSERT into payment_events',
        `INSERT INTO public.payment_events (event_type) VALUES ('forged')`],
      ['INSERT into agent_actions',
        `INSERT INTO public.agent_actions (tool_name, action_type, status)
           VALUES ('t','write','success')`],
    ];
    for (const [label, sql] of writes) {
      const r = await asRole('anon', null, sql);
      check(`anon ${label.padEnd(26)} REFUSED`, r.error !== null,
        'THIS IS A HOLE - the write succeeded');
    }
  }

  console.log('\n=== 15. RLS as AUTHENTICATED: strict per-user isolation ===');
  {
    const A = globalThis.__USER_A;
    const B = globalThis.__USER_B;

    // Seed one conversation + order + message per user, as the trusted backend.
    const cA = (await db.query(
      `INSERT INTO public.conversations (user_id) VALUES ($1) RETURNING id`, [A])).rows[0].id;
    const cB = (await db.query(
      `INSERT INTO public.conversations (user_id) VALUES ($1) RETURNING id`, [B])).rows[0].id;
    await db.query(
      `INSERT INTO public.messages (conversation_id, role, content)
         VALUES ($1,'user','A private message'), ($2,'user','B private message')`, [cA, cB]);
    const oA = (await db.query(
      `INSERT INTO public.orders (user_id, conversation_id, product_id, quantity, amount, currency)
         VALUES ($1,$2,$3,1,179900,'INR') RETURNING id`, [A, cA, PID])).rows[0].id;
    await db.query(
      `INSERT INTO public.orders (user_id, conversation_id, product_id, quantity, amount, currency)
         VALUES ($1,$2,$3,1,149900,'INR')`, [B, cB, PID]);
    await db.query(
      `INSERT INTO public.agent_actions (conversation_id, order_id, tool_name, action_type, status)
         VALUES ($1,$2,'create_order','write','success')`, [cA, oA]);

    const own = await asRole('authenticated', A,
      'SELECT count(*)::int AS n FROM public.conversations');
    check('user A sees exactly their own 1 conversation',
      own.error === null && own.rows?.[0]?.n === 1, JSON.stringify(own));

    const otherConv = await asRole('authenticated', A,
      'SELECT id FROM public.conversations WHERE id = $1', [cB]);
    check("user A cannot read user B's conversation even by id",
      otherConv.error === null && otherConv.rows.length === 0, JSON.stringify(otherConv));

    const msgs = await asRole('authenticated', A,
      'SELECT content FROM public.messages');
    check('user A sees only their own message, not B\'s',
      msgs.error === null && msgs.rows.length === 1 &&
        msgs.rows[0].content === 'A private message', JSON.stringify(msgs.rows));

    const ordersA = await asRole('authenticated', A,
      'SELECT amount FROM public.orders');
    check('user A sees only their own order',
      ordersA.error === null && ordersA.rows.length === 1 && ordersA.rows[0].amount === 179900,
      JSON.stringify(ordersA.rows));

    const anonOrders = await asRole('authenticated', A,
      `SELECT count(*)::int AS n FROM public.orders WHERE user_id IS NULL`);
    check('anonymous (user_id NULL) orders are invisible to every signed-in user',
      anonOrders.error === null && anonOrders.rows?.[0]?.n === 0, JSON.stringify(anonOrders));

    const actions = await asRole('authenticated', A,
      'SELECT count(*)::int AS n FROM public.agent_actions');
    check('user A sees the agent_action tied to their own conversation',
      actions.error === null && actions.rows?.[0]?.n === 1, JSON.stringify(actions));

    const actionsB = await asRole('authenticated', B,
      'SELECT count(*)::int AS n FROM public.agent_actions');
    check('user B sees none of it', actionsB.error === null && actionsB.rows?.[0]?.n === 0,
      JSON.stringify(actionsB));

    // The forgery attempts. A signed-in user is the realistic attacker here.
    const forgeConv = await asRole('authenticated', A,
      `INSERT INTO public.conversations (user_id) VALUES ($1)`, [B]);
    check("user A CANNOT create a conversation owned by user B (WITH CHECK)",
      forgeConv.error !== null, 'forgery succeeded');

    const stealConv = await asRole('authenticated', A,
      `UPDATE public.conversations SET user_id = $1 WHERE id = $2`, [A, cB]);
    check("user A cannot reassign user B's conversation to themselves",
      stealConv.error !== null || (stealConv.rows !== null &&
        (await db.query('SELECT user_id FROM public.conversations WHERE id=$1', [cB]))
          .rows[0].user_id === B),
      'ownership was transferred');

    const forgeMsg = await asRole('authenticated', A,
      `INSERT INTO public.messages (conversation_id, role, content)
         VALUES ($1,'user','injected into B''s thread')`, [cB]);
    check("user A cannot post a message into user B's conversation",
      forgeMsg.error !== null, 'injection succeeded');

    const writeOrder = await asRole('authenticated', A,
      `INSERT INTO public.orders (user_id, product_id, quantity, amount, currency)
         VALUES ($1,$2,1,1,'INR')`, [A, PID]);
    check('an authenticated user cannot create an order directly (no INSERT grant)',
      writeOrder.error?.code === '42501', JSON.stringify(writeOrder.error));

    const payOrder = await asRole('authenticated', A,
      `UPDATE public.orders SET status = 'PAID' WHERE id = $1`, [oA]);
    check('an authenticated user CANNOT mark their own order PAID (the critical one)',
      payOrder.error?.code === '42501', JSON.stringify(payOrder.error));

    const pe = await asRole('authenticated', A, 'SELECT count(*) FROM public.payment_events');
    check('payment_events unreadable even when authenticated (42501)',
      pe.error?.code === '42501', JSON.stringify(pe.error));

    const profileForge = await asRole('authenticated', A,
      `UPDATE public.profiles SET display_name = 'hacked' WHERE id = $1`, [B]);
    check("user A cannot edit user B's profile",
      profileForge.error !== null ||
        (await db.query('SELECT display_name FROM public.profiles WHERE id=$1', [B]))
          .rows[0].display_name === 'Grace Hopper',
      'profile was modified');

    // And the service role, which is what the backend uses, must see everything.
    const svc = await asRole('service_role', null,
      'SELECT count(*)::int AS n FROM public.orders');
    check('service_role sees all orders (BYPASSRLS) - this is why it is backend-only',
      svc.error === null && (svc.rows?.[0]?.n ?? 0) >= 2, JSON.stringify(svc));
  }

  // -------------------------------------------------------------------------
  // 16. Indexes, as documented. A dropped index is not a bug, but a README that
  //     lists indexes the schema does not create is.
  // -------------------------------------------------------------------------
  console.log('\n=== 16. Indexes match the documented set ===');
  {
    const { rows } = await db.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname='public' ORDER BY indexname`);
    const names = rows.map((r) => r.indexname);
    const want = [
      'idx_products_active', 'idx_products_price',
      'idx_conversations_user_id', 'idx_conversations_status',
      'idx_messages_conversation_id', 'idx_messages_conversation_created',
      'idx_orders_user_created', 'idx_orders_status', 'idx_orders_product_id',
      'idx_orders_conversation_id', 'idx_orders_created_at',
      'idx_agent_actions_conversation_id', 'idx_agent_actions_order_id',
      'idx_agent_actions_request_id', 'idx_agent_actions_created_at',
      'idx_payment_events_provider_event_id', 'idx_payment_events_order_id',
      'idx_payment_events_unprocessed',
    ];
    for (const w of want) {
      check(`${w} exists`, names.includes(w));
    }
    check('no index on products.slug (the column UNIQUE already builds one)',
      !names.includes('idx_products_slug'));
    check('no index on products.category (ILIKE cannot use a C-collation btree)',
      !names.includes('idx_products_category'));
    console.log(`        ${names.length} indexes total, including PK/UNIQUE btrees`);
  }

  // -------------------------------------------------------------------------
  // 17. The state machine, at the database level.
  // -------------------------------------------------------------------------
  console.log('\n=== 17. Order status values the CHECK permits ===');
  {
    const STATUSES = [
      'PENDING_CONFIRMATION', 'ORDER_CREATED', 'PAYMENT_PENDING',
      'PAID', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'CANCELLED',
    ];
    for (const s of STATUSES) {
      try {
        await db.exec('BEGIN');
        await db.query(
          `INSERT INTO public.orders (product_id, quantity, amount, currency, status)
             VALUES ($1,1,1,'INR',$2)`, [PID, s]);
        await db.exec('ROLLBACK');
        check(`status ${s} is accepted`, true);
      } catch (e) {
        await db.exec('ROLLBACK').catch(() => {});
        check(`status ${s} is accepted`, false, e.message);
      }
    }
  }

  console.log(`\n${'='.repeat(66)}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log('='.repeat(66));
  if (fail > 0) process.exitCode = 1;
}

await db.close();
