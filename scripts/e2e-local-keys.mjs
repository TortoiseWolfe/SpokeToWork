#!/usr/bin/env node
/**
 * Makes throw-away keys for the local Supabase stack that CI starts.
 *
 * Why this exists: the E2E workflow used to talk to the production Supabase
 * project. It now starts its own database inside each job, and that database
 * needs a signing secret plus two signed keys (anon and service role). We make
 * them fresh from the workflow run id, so:
 *   - nothing secret is stored in the repo (see CLAUDE.md, "Secrets"),
 *   - every job in one run gets the SAME keys (the build job bakes the anon
 *     key into the site, and the test jobs must accept it),
 *   - a new run gets new keys, and the keys mean nothing outside that run.
 *
 * Usage (inside GitHub Actions):
 *   node scripts/e2e-local-keys.mjs >> "$GITHUB_ENV"
 * It prints ::add-mask:: lines to stdout for the log, and KEY=value lines to
 * the file named by GITHUB_ENV (or stdout when GITHUB_ENV is not set, which is
 * handy for a local run: eval "$(node scripts/e2e-local-keys.mjs --export)").
 */

import { createHmac, createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';

const runId = process.env.GITHUB_RUN_ID || process.env.E2E_LOCAL_RUN_ID || 'local';

// 64 hex characters: long enough for GoTrue and PostgREST (they want 32+).
const jwtSecret = createHash('sha256').update(`e2e-local-${runId}`).digest('hex');

const b64url = (input) => Buffer.from(input).toString('base64url');

function signJwt(role) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  // Fixed issue and expiry times so the same run id always gives the same key.
  const payload = b64url(
    JSON.stringify({
      role,
      iss: 'supabase',
      iat: 1700000000,
      exp: 4102444800, // 1 Jan 2100
    })
  );
  const signature = createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const anonKey = signJwt('anon');
const serviceKey = signJwt('service_role');

// Ports match docker-compose.yml's SUPABASE_API_PORT / SUPABASE_DB_PORT.
const apiPort = process.env.SUPABASE_API_PORT || '54321';

const vars = {
  SUPABASE_LOCAL_JWT_SECRET: jwtSecret,
  SUPABASE_LOCAL_ANON_KEY: anonKey,
  SUPABASE_LOCAL_SERVICE_KEY: serviceKey,
  // The roles inside the database get this password; it never leaves the runner.
  SUPABASE_LOCAL_DB_PASSWORD: createHash('sha256')
    .update(`e2e-local-db-${runId}`)
    .digest('hex'),
  SUPABASE_LOCAL_REALTIME_SECRET: createHash('sha256')
    .update(`e2e-local-realtime-${runId}`)
    .digest('hex'),
  SUPABASE_API_PORT: apiPort,
  SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT || '54322',
  API_EXTERNAL_URL: `http://localhost:${apiPort}`,
  GOTRUE_SITE_URL: 'http://localhost:3000',
  // What the built site and the tests use to reach the stack.
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${apiPort}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
};

const secretNames = [
  'SUPABASE_LOCAL_JWT_SECRET',
  'SUPABASE_LOCAL_ANON_KEY',
  'SUPABASE_LOCAL_SERVICE_KEY',
  'SUPABASE_LOCAL_DB_PASSWORD',
  'SUPABASE_LOCAL_REALTIME_SECRET',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);

if (process.argv.includes('--export')) {
  // For a local shell: print `export` lines.
  for (const [k, v] of Object.entries(vars)) console.log(`export ${k}='${v}'`);
} else if (process.env.GITHUB_ENV) {
  // Hide the values in the job log, then hand them to the later steps.
  for (const name of secretNames) console.log(`::add-mask::${vars[name]}`);
  appendFileSync(process.env.GITHUB_ENV, `${lines.join('\n')}\n`);
  console.log(`Wrote ${lines.length} local Supabase settings to GITHUB_ENV`);
} else {
  console.log(lines.join('\n'));
}
