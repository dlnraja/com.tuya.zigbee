#!/usr/bin/env node
'use strict';
/**
 * verify-gmail-setup.js (P2226)
 * Probes Gmail access cascade: IMAP secrets → OAuth secrets → local state.
 * Cursor Gmail plugin is IDE-only (not tested here).
 */
async function main() {
  console.log('=== Gmail setup verifier (cascade) ===');
  const cascade = require('./gmail-auth-cascade');
  const summary = cascade.probeCredentials();
  console.log('L0 Cursor plugin (IDE):', summary.layers.L0_cursor_plugin.hintedOk ? 'hinted' : 'n/a in Node — agent probes MCP separately');
  console.log('L1 IMAP:', summary.layers.L1_imap_secrets.ready ? summary.layers.L1_imap_secrets.email : 'MISSING GMAIL_EMAIL/GMAIL_APP_PASSWORD');
  console.log('L2 OAuth:', summary.layers.L2_oauth_secrets.ready ? 'ready' : 'optional fallback missing');
  console.log('L3 Local:', summary.layers.L3_local_state.ready ? 'ready' : 'no prior state');

  if (!summary.layers.L1_imap_secrets.ready && !summary.layers.L2_oauth_secrets.ready) {
    console.log('Setup IMAP (preferred):');
    console.log('  1. https://myaccount.google.com/apppasswords');
    console.log('  2. gh secret set GMAIL_EMAIL');
    console.log('  3. gh secret set GMAIL_APP_PASSWORD');
    console.log('OAuth fallback secrets: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
    if (!summary.layers.L3_local_state.ready) process.exit(1);
    console.log('Continuing with L3 local-only (no live mailbox).');
  }

  const live = await cascade.probeLive(summary);
  if (live.imap?.ok) {
    console.log('OK: L1 IMAP connected, fetched', live.imap.count, 'emails');
    if (live.imap.sampleSubj) console.log('Latest:', live.imap.sampleSubj);
    process.exit(0);
  }
  if (live.oauth?.ok) {
    console.log('OK: L2 OAuth connected, fetched', live.oauth.count, 'emails (IMAP failed or skipped)');
    process.exit(0);
  }
  if (live.local?.ok) {
    console.log('OK: L3 local-reader only —', live.local.count, 'records (live auth unavailable)');
    process.exit(process.argv.includes('--strict') ? 2 : 0);
  }
  console.log('FAIL: no layer could read mail');
  if (live.imap?.error) console.log('IMAP:', live.imap.error);
  if (live.oauth?.error) console.log('OAuth:', live.oauth.error);
  process.exit(1);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
