/**
 * Setup doctor. Answers one question: what works right now, and what is missing?
 *
 * Runs before anything is built or installed, so it depends on nothing but Node.
 * It parses the .env files itself rather than importing the backend's config,
 * because the backend's config *exits the process* on a missing variable - which
 * is right for a server and useless for a diagnostic whose whole job is to
 * report on missing variables.
 *
 * It prints whether a value is present. It never prints a value, never prints a
 * prefix of a value, and never prints its length - a length is a real hint about
 * which key is in a slot, and this output is the kind of thing that ends up
 * pasted into a chat window.
 *
 * Nothing here calls process.exit(). On Windows, exiting while an undici socket
 * from a just-finished fetch is still closing trips a libuv assertion and the
 * process dies with 127, masking the exit code that carries the diagnosis. So
 * every path sets process.exitCode and returns.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const BACKEND_ENV = join(ROOT, 'backend', '.env');
const WEB_ENV = join(ROOT, 'frontend', 'Web', '.env');

const PROBE_TIMEOUT_MS = 8000;

/* ------------------------------------------------------------------ output -- */

// Fixed width, so the label column lines up whatever the state is. Misaligned
// output is how a reader's eye slides past the one line that mattered.
const ICON = { ok: '  ok     ', warn: '  --     ', bad: '  MISSING', info: '         ' };

let blockers = 0;
let optional = 0;

function heading(text) {
  console.log(`\n${text}`);
  console.log('-'.repeat(text.length));
}

function line(state, label, note = '') {
  console.log(`${ICON[state]}  ${label.padEnd(30)} ${note}`);
}

/* --------------------------------------------------------------- env files -- */

/**
 * Minimal .env parser: KEY=value, one per line, # comments, optional quotes.
 *
 * Deliberately not dotenv - this script must run on a bare clone before any
 * npm install has happened, and a diagnostic that needs its own dependency
 * installed cannot diagnose a broken install.
 */
function parseEnvFile(path) {
  if (!existsSync(path)) return null;

  const out = new Map();

  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    out.set(key, value);
  }

  return out;
}

/** present | empty | absent - the three states that matter, and nothing more. */
function state(envMap, key) {
  if (envMap === null || !envMap.has(key)) return 'absent';
  return envMap.get(key).trim() === '' ? 'empty' : 'present';
}

const backendEnv = parseEnvFile(BACKEND_ENV);
const webEnv = parseEnvFile(WEB_ENV);

/* -------------------------------------------------------- 1. dependencies -- */

/**
 * The root package has no dependencies of its own and is not an npm workspace,
 * so `npm install` at the root installs nothing and the two sub-packages each
 * need their own. Every root script delegates with `npm --prefix`, and a
 * delegated script whose binary was never installed fails as `sh: tsc: command
 * not found` - which npm reports as exit code 127 and nothing else. That is a
 * genuinely opaque way to be told "you skipped an install", and it is the exact
 * failure a CI provider hits when it installs from the repository root, so it is
 * worth naming here before anything else is checked.
 */
heading('1. Dependencies');

const PACKAGES = [
  { dir: 'backend', bin: 'tsc', why: 'backend build runs tsc' },
  { dir: join('frontend', 'Web'), bin: 'vite', why: 'web build runs tsc -b && vite build' },
];

let depsReady = true;
for (const pkg of PACKAGES) {
  const installed = existsSync(join(ROOT, pkg.dir, 'node_modules'));
  const hasBin = existsSync(join(ROOT, pkg.dir, 'node_modules', '.bin', pkg.bin));
  if (installed && hasBin) {
    line('ok', `${pkg.dir}/node_modules`, `installed, ${pkg.bin} present`);
  } else {
    const note = installed
      ? `installed but ${pkg.bin} is missing -> npm --prefix ${pkg.dir} install`
      : `not installed -> npm run install:all  (${pkg.why}; missing = exit 127)`;
    line('bad', `${pkg.dir}/node_modules`, note);
    depsReady = false;
    blockers += 1;
  }
}

/* ------------------------------------------------------------- 2. secrets -- */

heading('2. Environment files');

if (backendEnv === null) {
  line('bad', 'backend/.env', 'does not exist -> cp backend/.env.example backend/.env');
  blockers += 1;
} else {
  line('ok', 'backend/.env', 'found');
}

if (webEnv === null) {
  line('warn', 'frontend/Web/.env', 'missing; defaults apply (proxy to :3000, mock on)');
} else {
  line('ok', 'frontend/Web/.env', 'found');
}

const SUPABASE_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const RAZORPAY_KEYS = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];

console.log('');

let supabaseReady = true;
for (const key of SUPABASE_KEYS) {
  const s = state(backendEnv, key);
  if (s === 'present') {
    line('ok', key, 'set');
  } else {
    line('bad', key, s === 'empty' ? 'present but blank - the server will refuse to start' : 'not in the file');
    supabaseReady = false;
    blockers += 1;
  }
}

console.log('');

const razorpaySet = RAZORPAY_KEYS.filter((k) => state(backendEnv, k) === 'present');
const razorpayReady = razorpaySet.length === RAZORPAY_KEYS.length;

for (const key of RAZORPAY_KEYS) {
  const s = state(backendEnv, key);
  if (s === 'present') line('ok', key, 'set');
  else line('warn', key, 'not set');
}

if (razorpayReady) {
  const keyId = backendEnv.get('RAZORPAY_KEY_ID').trim();
  const nodeEnv = (backendEnv.get('NODE_ENV') ?? 'development').trim();

  if (nodeEnv !== 'production' && !keyId.startsWith('rzp_test_')) {
    line('bad', 'RAZORPAY_KEY_ID prefix', `must start rzp_test_ while NODE_ENV=${nodeEnv}`);
    blockers += 1;
  } else {
    line('ok', 'RAZORPAY_KEY_ID prefix', 'test-mode key, as required outside production');
  }

  if (backendEnv.get('RAZORPAY_WEBHOOK_SECRET').trim().length < 8) {
    line('bad', 'RAZORPAY_WEBHOOK_SECRET', 'shorter than 8 characters; env.ts rejects it');
    blockers += 1;
  }
} else if (razorpaySet.length > 0) {
  // The one genuinely dangerous partial state: able to take money, unable to
  // verify that it arrived. env.ts refuses to boot on it, so it is a blocker.
  line('bad', 'Razorpay (partial)', `${razorpaySet.length} of 3 set - all three or none, or the server will not boot`);
  blockers += 1;
} else {
  line('info', 'Razorpay', 'none set: payment routes will answer 501, everything else works');
  optional += 1;
}

/* ---------------------------------------------------------- 3. supabase db -- */

heading('3. Supabase project');

/**
 * One REST probe against the products table. This is the same question
 * /health/ready asks, asked without a build step, because the doctor has to work
 * on a clone that has never run tsc.
 */
async function probeSupabase(url, serviceKey) {
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/products?select=id&limit=1`;

  let response;
  try {
    response = await fetch(endpoint, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return { kind: timedOut ? 'timeout' : 'unreachable' };
  }

  if (response.status === 200) {
    const rows = await response.json().catch(() => null);
    return { kind: Array.isArray(rows) && rows.length > 0 ? 'seeded' : 'not_seeded' };
  }

  if (response.status === 401 || response.status === 403) return { kind: 'key_rejected' };

  // PostgREST reports an absent table as 404 with PGRST205, having consulted a
  // schema cache. 400/404 both occur in practice depending on project age.
  if (response.status === 404 || response.status === 400) return { kind: 'not_migrated' };

  return { kind: 'unexpected', status: response.status };
}

let dbState = 'unknown';

if (!supabaseReady) {
  line('bad', 'connection', 'skipped - Supabase variables are incomplete');
} else {
  const result = await probeSupabase(
    backendEnv.get('SUPABASE_URL').trim(),
    backendEnv.get('SUPABASE_SERVICE_ROLE_KEY').trim(),
  );
  dbState = result.kind;

  switch (result.kind) {
    case 'seeded':
      line('ok', 'connection', 'reachable');
      line('ok', 'schema', 'the 7 tables exist');
      line('ok', 'seed data', 'products present');
      break;
    case 'not_seeded':
      line('ok', 'connection', 'reachable');
      line('ok', 'schema', 'the 7 tables exist');
      line('bad', 'seed data', 'products is empty -> run backend/supabase/seed.sql');
      blockers += 1;
      break;
    case 'not_migrated':
      line('ok', 'connection', 'reachable - the URL and key are correct');
      line('bad', 'schema', 'NOT APPLIED. No tables. See "What to do next" below.');
      blockers += 1;
      break;
    case 'key_rejected':
      line('bad', 'connection', 'reached Supabase, key refused. Is that the service-role key?');
      blockers += 1;
      break;
    case 'timeout':
      line('bad', 'connection', `no answer in ${PROBE_TIMEOUT_MS}ms - is the project paused?`);
      blockers += 1;
      break;
    case 'unreachable':
      line('bad', 'connection', 'could not reach the host - check SUPABASE_URL and network');
      blockers += 1;
      break;
    default:
      line('bad', 'connection', `unexpected HTTP ${result.status}`);
      blockers += 1;
  }
}

/* ------------------------------------------------------- 4. what works now -- */

heading('4. What works right now');

const dbUp = dbState === 'seeded';
const useMock = webEnv === null || ['1', 'true', 'yes', 'on'].includes((webEnv.get('VITE_USE_MOCK') ?? 'true').trim().toLowerCase());

// Mirrors the provider precedence in backend/src/config/env.ts: any one of these
// makes agentConfig non-null, and /api/chat answers 501 without it.
const AGENT_KEYS = ['OPENAI_API_KEY', 'XAI_API_KEY', 'AGENTROUTER_API_KEY', 'OPENROUTER_API_KEY'];
const agentReady = AGENT_KEYS.some((k) => state(backendEnv, k) === 'present');

line(dbUp ? 'ok' : 'bad', 'Product catalogue', dbUp ? 'GET /api/products' : 'needs the schema + seed');
line(dbUp ? 'ok' : 'bad', 'Conversations, orders', dbUp ? 'create, read, transition' : 'needs the schema');
line(
  dbUp && razorpayReady ? 'ok' : 'bad',
  'Real Razorpay payment',
  dbUp && razorpayReady ? 'payment link -> pay -> webhook -> PAID' : 'needs the schema AND the Razorpay keys',
);
line(useMock ? 'ok' : 'warn', 'Mock checkout demo', useMock ? 'VITE_USE_MOCK=true - runs with no keys at all' : 'off (VITE_USE_MOCK is not true)');
line(
  agentReady ? 'ok' : 'warn',
  'Conversational agent',
  agentReady ? 'POST /api/chat' : 'POST /api/chat answers 501 until a provider key is set',
);

/* -------------------------------------------------------- 5. what to do next */

heading('5. What to do next');

const steps = [];

if (!depsReady) {
  steps.push('npm run install:all   (nothing below can run until this succeeds)');
}

if (backendEnv === null) {
  steps.push('cp backend/.env.example backend/.env, then fill in the Supabase values.');
}

if (supabaseReady && dbState === 'not_migrated') {
  steps.push(
    'Apply the database schema. This is the one thing blocking everything else:\n' +
      '        npm run db:sql          (writes a single paste-ready file and prints its path)\n' +
      '      then open the Supabase dashboard -> SQL Editor -> New query, paste, Run.',
  );
}

if (supabaseReady && dbState === 'not_seeded') {
  steps.push('Run backend/supabase/seed.sql in the Supabase SQL Editor.');
}

if (!razorpayReady && razorpaySet.length === 0) {
  steps.push(
    'Optional, for a real payment: Razorpay dashboard in TEST MODE -> Settings ->\n' +
      '      API Keys for the key id and secret. The webhook secret is a string you\n' +
      '      invent and then enter under Settings -> Webhooks. All three, or none.',
  );
}

if (razorpaySet.length > 0 && !razorpayReady) {
  steps.push(`Set the remaining Razorpay variables (${RAZORPAY_KEYS.filter((k) => state(backendEnv, k) !== 'present').join(', ')}) or clear all three.`);
}

if (steps.length === 0) {
  console.log('        Nothing. Run  npm run dev  and open http://localhost:5173');
} else {
  steps.forEach((step, i) => console.log(`  ${i + 1}.  ${step}`));
}

/* ------------------------------------------------------------------ verdict */

const verdict = blockers === 0 ? 'READY' : `${blockers} blocker(s)`;
console.log(`\n${'='.repeat(64)}`);
console.log(`  ${verdict}${optional > 0 ? `, ${optional} optional item(s) unset` : ''}`);
console.log(`${'='.repeat(64)}\n`);

// 0 ready, 1 something needs doing. Not an error either way - this is a report.
process.exitCode = blockers === 0 ? 0 : 1;
