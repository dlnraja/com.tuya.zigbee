#!/usr/bin/env node
'use strict';
/**
 * Homey secrets health check (read-only, free, no AI).
 * Checks each Homey secret with one cheap authenticated GET, never prints values.
 * Writes data/status/homey-secrets-health.json and exits 1 if any secret is invalid.
 * HOMEY_REFRESH_TOKEN is checked/rotated by homey-token-refresh.js (run before this),
 * which exports HOMEY_ACCOUNT_TOKEN on success.
 */
const fs = require('fs');
const path = require('path');

// NOTE: apps-api /app listing is public (200 without auth) - never use it as a token probe.
const ACCOUNT = 'https://api.athom.com/user/me';

async function probe(url, token) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    if (res.status === 401 || res.status === 403) return 'invalid';
    if (res.ok) return 'valid';
    return `unknown_http_${res.status}`;
  } catch (e) { return 'unknown_network'; }
}

(async () => {
  const checks = [
        ['HOMEY_PAT_API', ACCOUNT, 'user/dashboard PAT - regenerate by hand'],
    ['HOMEY_TOKEN', ACCOUNT, 'legacy token - regenerate by hand or remove usage'],
  ];
  const out = { checked_at: new Date().toISOString(), secrets: {} };
  for (const [name, url, how] of checks) {
    const v = process.env[name];
    let status = v ? await probe(url, v) : 'missing';
    // single authenticated probe per token (no public-endpoint fallback)
    out.secrets[name] = { status, renew: how };
  }
  // HOMEY_PAT: the apps API listing is public, so a plain GET proves nothing; the real probe is
  // scripts/ci/homey-build-status.js (delegation token, same path as publishing).
  out.secrets.HOMEY_PAT = { status: process.env.HOMEY_PAT ? 'see_build_status_step' : 'missing', renew: 'apps PAT - regenerate by hand at tools.developer.homey.app' };
  out.secrets.HOMEY_REFRESH_TOKEN = {
    status: !process.env.HOMEY_REFRESH_TOKEN ? 'missing' : (process.env.HOMEY_ACCOUNT_TOKEN ? 'refreshed' : 'invalid'),
    renew: 'auto-rotated by scripts/ci/homey-token-refresh.js when GH_PAT has secrets:write; else `npx homey login`',
  };
  out.gh_pat_for_writeback = process.env.GH_PAT ? 'present' : 'missing';
  const file = path.join('data', 'status', 'homey-secrets-health.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  let bad = false;
  for (const [n, s] of Object.entries(out.secrets)) {
    console.log(`${n}: ${s.status}`);
    if (s.status === 'invalid' || (n === 'HOMEY_PAT' && s.status === 'missing')) { bad = true; console.log(`::error::${n} ${s.status} - ${s.renew}`); }
  }
  if (out.gh_pat_for_writeback === 'missing') console.log('::warning::GH_PAT missing: rotated refresh token cannot be persisted');
  process.exit(bad ? 1 : 0);
})();
