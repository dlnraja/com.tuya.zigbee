#!/usr/bin/env node
/**
 * Token Sanity Check (P58.3)
 * ==========================================================================
 * Silently verifies which auth tokens are available in the env / gh CLI, and
 * reports which data sources can be reached. Designed for the "no
 * surfacturation, no human" mode: just report what works, what doesn't, and
 * what data sources are currently reachable.
 *
 * User intent (P58.3):
 *   - "importer silencieusement tout les tokens" — silent import check
 *   - "de façon shawo et silencieusement" — minimal noise, max signal
 *
 * Checks:
 *   - gh CLI authenticated (GH_TOKEN, GH_PAT, GITHUB_TOKEN)
 *   - Homey CLI authenticated (HOMEY_PAT, HOMEY_PAT_API)
 *   - Gmail configured (GMAIL_APP_PASSWORD, GMAIL_REFRESH_TOKEN)
 *   - Google AI configured (GOOGLE_API_KEY)
 *
 * Output:
 *   - JSON if --json
 *   - Concise text otherwise (silent if --silent)
 *   - Exit 0 always (informational)
 *
 * Run:  node tools/ci/token-sanity-check.js [--json] [--silent]
 */

'use strict';

const { spawnSync } = require('child_process');

const GH = process.env.GH_PATH || 'C:\\Users\\Dell\\Tools\\gh\\bin\\gh.exe';

const TOKEN_CHECKS = [
  { id: 'gh-cli', label: 'GitHub CLI (gh)', env: 'GITHUB_TOKEN', cli: () => {
    const r = spawnSync(GH, ['auth', 'status', '--show-token'], { encoding: 'utf8', timeout: 10000 });
    return r.status === 0;
  }},
  { id: 'gh-pat', label: 'GitHub PAT (GH_PAT)', env: 'GH_PAT', envCheck: 'GH_PAT' },
  { id: 'homey-pat', label: 'Homey PAT (HOMEY_PAT)', env: 'HOMEY_PAT', envCheck: 'HOMEY_PAT' },
  { id: 'homey-pat-api', label: 'Homey PAT API (HOMEY_PAT_API)', env: 'HOMEY_PAT_API', envCheck: 'HOMEY_PAT_API' },
  { id: 'gmail-app', label: 'Gmail App Password', env: 'GMAIL_APP_PASSWORD', envCheck: 'GMAIL_APP_PASSWORD' },
  { id: 'gmail-oauth', label: 'Gmail OAuth Refresh', env: 'GMAIL_REFRESH_TOKEN', envCheck: 'GMAIL_REFRESH_TOKEN' },
  { id: 'google-ai', label: 'Google AI Key', env: 'GOOGLE_API_KEY', envCheck: 'GOOGLE_API_KEY' },
  { id: 'homey-email', label: 'Homey Email (HOMEY_EMAIL)', env: 'HOMEY_EMAIL', envCheck: 'HOMEY_EMAIL' },
];

function maskToken(s) {
  if (!s) return null;
  if (s.length <= 12) return '***';
  return s.substring(0, 6) + '***' + s.substring(s.length - 4);
}

function isAvailable(check) {
  if (check.envCheck) {
    return !!process.env[check.envCheck] && process.env[check.envCheck].length > 0;
  }
  if (check.cli) {
    try { return !!check.cli(); } catch { return false; }
  }
  return false;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const jsonMode = args.has('--json');
  const silent = args.has('--silent');

  const results = TOKEN_CHECKS.map(c => {
    const avail = isAvailable(c);
    let detail = null;
    if (avail && c.envCheck) {
      detail = maskToken(process.env[c.envCheck]);
    }
    return { id: c.id, label: c.label, available: avail, sample: detail };
  });

  const available = results.filter(r => r.available).length;
  const total = results.length;

  if (jsonMode) {
    console.log(JSON.stringify({ available, total, results }, null, 2));
  } else if (!silent) {
    console.log(`=== Token Sanity Check (P58.3) ===`);
    console.log(`${available}/${total} tokens available\n`);
    for (const r of results) {
      const mark = r.available ? '✓' : '✗';
      const extra = r.sample ? ` (${r.sample})` : '';
      console.log(`  ${mark} ${r.label}${extra}`);
    }
    if (available < total) {
      const missing = results.filter(r => !r.available).map(r => r.id);
      console.log(`\nMissing: ${missing.join(', ')}`);
      console.log('Tip: set in GHA secrets (Settings → Secrets and variables → Actions)');
    }
  }
  // Exit 0 always
  process.exit(0);
}

if (require.main === module) main();
module.exports = { isAvailable, TOKEN_CHECKS };
