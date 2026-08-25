/**
 * Concatenate the migration and the seed into one paste-ready file.
 *
 * The Supabase SQL Editor takes one query at a time, and the two-step dance
 * ("run this, then run that, in that order") is where a first-time setup goes
 * wrong. One file, one paste, correct order enforced here rather than remembered
 * by the person pasting.
 *
 * GENERATED, and gitignored. It is not a third copy of the schema to maintain -
 * it is derived from the two real files every time this runs, so it cannot drift
 * from them. If it is stale, delete it and run this again.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MIGRATION = join(BACKEND, 'supabase', 'migrations', '001_initial_schema.sql');
const SEED = join(BACKEND, 'supabase', 'seed.sql');
const OUTPUT = join(BACKEND, 'supabase', 'setup.generated.sql');

let migration;
let seed;

try {
  migration = readFileSync(MIGRATION, 'utf8');
  seed = readFileSync(SEED, 'utf8');
} catch (error) {
  console.error(`\nCould not read the SQL sources: ${error.message}\n`);
  process.exitCode = 1;
}

if (migration !== undefined && seed !== undefined) {
  const header = [
    '-- ===========================================================================',
    '-- Checkout Concierge - complete database setup.',
    '--',
    '-- GENERATED FILE. Do not edit, and do not commit it. Regenerate with:',
    '--   cd backend && npm run db:sql',
    '--',
    '-- Sources, in this order:',
    '--   supabase/migrations/001_initial_schema.sql   schema, RLS, policies, grants',
    '--   supabase/seed.sql                            14 products',
    '--',
    '-- HOW TO APPLY',
    '--   Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.',
    '--',
    '-- Both halves are idempotent (CREATE ... IF NOT EXISTS, DROP POLICY IF EXISTS,',
    '-- ON CONFLICT DO UPDATE), so running it twice is safe and re-running it after a',
    '-- partial failure is the correct recovery.',
    '--',
    '-- The final SELECT should report: 14 products, 13 active, 2 black hoodies at or',
    '-- under 2000 rupees. If it does not, the seed did not fully apply.',
    '-- ===========================================================================',
    '',
    '',
  ].join('\n');

  const divider = [
    '',
    '',
    '-- ===========================================================================',
    '-- END OF MIGRATION. What follows is the seed data.',
    '-- ===========================================================================',
    '',
    '',
  ].join('\n');

  writeFileSync(OUTPUT, header + migration + divider + seed, 'utf8');

  const lines = (header + migration + divider + seed).split('\n').length;

  console.log('\nWrote one paste-ready file:\n');
  console.log(`  ${OUTPUT}`);
  console.log(`  ${lines} lines - the migration and the seed, in that order.\n`);
  console.log('Next:');
  console.log('  1. Open it and copy all of it.');
  console.log('  2. Supabase dashboard -> SQL Editor -> New query -> paste -> Run.');
  console.log('  3. Back here:  npm run doctor\n');
}
