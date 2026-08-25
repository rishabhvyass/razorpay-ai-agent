/**
 * Start the backend and the web client together.
 *
 * Zero dependencies, on purpose: adding `concurrently` to run two processes
 * would mean a root node_modules, a root lockfile entry and one more thing to
 * audit, to replace about forty lines of child_process.
 *
 * What it handles that `cmd1 & cmd2` does not:
 *   - interleaved output stays readable, because every line is prefixed
 *   - Ctrl-C stops both, rather than orphaning one on a port
 *   - if either process dies, the other is stopped instead of left running
 *     against a backend that is no longer there
 */

import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  { name: 'api', cwd: join(ROOT, 'backend'), colour: '\x1b[36m' },
  { name: 'web', cwd: join(ROOT, 'frontend', 'Web'), colour: '\x1b[35m' },
];

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

const children = [];
let shuttingDown = false;

/** Prefix every line so two interleaved dev servers remain legible. */
function pipe(stream, name, colour) {
  let buffered = '';

  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffered += chunk;

    const lines = buffered.split(/\r?\n/);
    // Keep the last element: it is an unterminated line, not a complete one.
    buffered = lines.pop() ?? '';

    for (const text of lines) {
      console.log(`${colour}${name.padEnd(3)}${RESET} ${DIM}|${RESET} ${text}`);
    }
  });

  stream.on('end', () => {
    if (buffered !== '') console.log(`${colour}${name.padEnd(3)}${RESET} ${DIM}|${RESET} ${buffered}`);
  });
}

function stopAll(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      // Windows has no real signals: taskkill /T is what actually reaches the
      // grandchildren (tsx and vite both fork), and kill() alone would leave
      // them holding ports 3000 and 5173.
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill(signal);
      }
    }
  }
}

console.log('');
console.log('  Checkout Concierge - starting both dev servers');
console.log(`  ${DIM}api  http://localhost:3000     web  http://localhost:5173${RESET}`);
console.log(`  ${DIM}the web dev server proxies /api and /health to the backend${RESET}`);
console.log(`  ${DIM}Ctrl-C stops both${RESET}`);
console.log('');

/**
 * The environment each child gets.
 *
 * `PORT` is deliberately removed. Two servers start here and they need different
 * ports, so a single inherited PORT cannot be right for both - and it is set far
 * more often than people remember: by CI, by preview tooling, by a line in a
 * shell profile.
 *
 * Left in place, it silently wins. `dotenv` does not override a variable that is
 * already in process.env, so an inherited PORT beats the PORT in backend/.env,
 * and the backend binds somewhere the web client's proxy is not looking. The
 * failure that produces is genuinely baffling: both servers report success, one
 * of them has quietly taken the other's port on a different address family, and
 * the browser gets whichever the resolver happens to prefer - so the page loads
 * as a stream of 404s from an API that was never meant to serve it.
 *
 * Stripping it means each app is configured by its own file and nothing else:
 * the backend by backend/.env, the web client by vite.config.ts.
 */
function childEnv() {
  const env = { ...process.env };
  delete env.PORT;
  return env;
}

/**
 * Spawn `npm run dev` in a directory, without a shell where possible.
 *
 * `shell: true` is the obvious way to make `npm` resolve to `npm.cmd` on
 * Windows, and Node 24 deprecates it (DEP0190) because with a shell the
 * arguments are concatenated rather than escaped. The arguments here are all
 * literals, so it was never an injection risk - but a launcher that prints a
 * deprecation warning on every start is a launcher people learn to ignore.
 *
 * npm sets `npm_execpath` to its own CLI entry point in the environment of any
 * script it runs, and this file is always started by `npm run dev`. So the
 * normal path runs `node <npm-cli.js> run dev` directly: no shell, no warning,
 * and the same npm that invoked us rather than whichever one is first on PATH.
 * The shell form stays as a fallback for a direct `node scripts/dev.mjs`.
 */
function spawnDev(cwd) {
  const npmCli = process.env.npm_execpath;
  const options = { cwd, env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'] };

  if (npmCli !== undefined && npmCli.endsWith('.js')) {
    return spawn(process.execPath, [npmCli, 'run', 'dev'], options);
  }

  return spawn('npm', ['run', 'dev'], { ...options, shell: true });
}

for (const { name, cwd, colour } of TARGETS) {
  const child = spawnDev(cwd);

  pipe(child.stdout, name, colour);
  pipe(child.stderr, name, colour);

  child.on('error', (error) => {
    console.error(`${colour}${name}${RESET} failed to start: ${error.message}`);
    console.error(`  Has it been installed?  npm run install:all`);
    process.exitCode = 1;
    stopAll();
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    console.log(`\n${colour}${name}${RESET} exited (${signal ?? `code ${code}`}). Stopping the other.\n`);
    process.exitCode = code === 0 ? 0 : (code ?? 1);
    stopAll();
  });

  children.push(child);
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
