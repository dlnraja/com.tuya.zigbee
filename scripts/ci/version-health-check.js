#!/usr/bin/env node
'use strict';

/**
 * Version health check — apps-api crash/regression watcher.
 *
 * Pulls the build list from the Athom Apps API (via homey-apps-api-client,
 * which falls back to the HOMEY_REFRESH_TOKEN chain when the PAT cannot
 * delegate) and flags:
 *   - any build in state test/live with crashes > 0   (regression signal)
 *   - any recent build in state processing_failed     (publish pipeline issue)
 *
 * Exit code 1 when a flagged build is found (so scheduled workflows turn red
 * and the self-heal pipeline notices), 0 otherwise. A Markdown summary goes
 * to $GITHUB_STEP_SUMMARY when available.
 */

const fs = require('fs');

const APP_ID = process.env.HOMEY_APP_ID || 'com.dlnraja.tuya.zigbee';
const RECENT_WINDOW = Number(process.env.VERSION_HEALTH_WINDOW || 20);

async function main() {
  const client = require('../../.github/scripts/homey-apps-api-client');
  const api = await client.createClient({ log: () => {} });
  const builds = await client.getBuilds(api, APP_ID, { limit: 500 });

  const recent = builds
    .filter((b) => b && typeof b.id === 'number')
    .sort((a, b) => b.id - a.id)
    .slice(0, RECENT_WINDOW);

  // Only alert on FRESH signals — crash counters and processing_failed are
  // cumulative/sticky on old builds, so without an age window the workflow
  // would stay red forever.
  const DAY_MS = 24 * 3600 * 1000;
  const ageDays = (b) => (Date.now() - new Date(b.stateChangedAt || b.createdAt || 0).getTime()) / DAY_MS;
  const crashed = recent.filter((b) => (b.crashes || 0) > 0 && ['test', 'live'].includes(b.state) && ageDays(b) <= 14);
  const failed = recent.filter((b) => b.state === 'processing_failed' && ageDays(b) <= 7);

  const lines = [
    '## Version Health (apps-api)',
    '',
    `Window: last ${recent.length} builds of ${APP_ID}`,
    '',
    '| Build | Version | State | Crashes |',
    '|---|---|---|---|',
    ...recent.slice(0, 10).map((b) => `| #${b.id} | ${b.version} | ${b.state} | ${b.crashes || 0} |`),
    '',
  ];

  let bad = false;
  if (crashed.length > 0) {
    bad = true;
    lines.push(`❌ Builds with crashes on test/live: ${crashed.map((b) => `#${b.id} v${b.version} (${b.crashes})`).join(', ')}`);
  }
  if (failed.length > 0) {
    bad = true;
    lines.push(`❌ processing_failed builds: ${failed.map((b) => `#${b.id} v${b.version}`).join(', ')}`);
  }
  if (!bad) {lines.push('✅ No crashed or failed builds in the window.');}

  const out = lines.join('\n');
  console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
  }
  if (bad) {process.exit(1);}
}

main().catch((e) => {
  console.log(`::warning::version-health-check could not complete: ${e.message}`);
  // Auth/network failures must not turn the cron red — the report says enough.
});
