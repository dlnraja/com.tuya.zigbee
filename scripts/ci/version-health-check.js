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

// P3025b: the healthy Test tip must be looked up across ALL builds, not only
// the display window. Root cause of the red cron since 2026-10-22 12:24 Paris:
// ten consecutive processing_failed drafts (#3667-#3676) pushed the healthy
// Test build #3655 (9.0.1574) out of the 20-build window, so tipHealthy went
// false and every draft became "stuck". The window stays for the report only.
function patchOf(v) {
  const m = String(v || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? Number(m[1]) * 1e8 + Number(m[2]) * 1e5 + Number(m[3]) : NaN;
}

function evaluate(builds, opts = {}) {
  const now = opts.now != null ? opts.now : Date.now();
  const env = opts.env || process.env;
  const windowSize = Number(env.VERSION_HEALTH_WINDOW || RECENT_WINDOW);
  const all = (builds || [])
    .filter((b) => b && typeof b.id === 'number')
    .sort((a, b) => b.id - a.id);
  const recent = all.slice(0, windowSize);

  // Only alert on FRESH signals — crash counters and processing_failed are
  // cumulative/sticky on old builds, so without an age window the workflow
  // would stay red forever.
  const DAY_MS = 24 * 3600 * 1000;
  const ageDays = (b) => (now - new Date(b.stateChangedAt || b.createdAt || 0).getTime()) / DAY_MS;
  // The real question: "is the CURRENT channel build healthy?" — judge the
  // newest build per channel (searched over ALL builds), not sticky counters
  // on superseded ones.
  const latestByChannel = {};
  for (const b of all) {
    if (['test', 'live'].includes(b.state) && !latestByChannel[b.state]) {latestByChannel[b.state] = b;}
  }
  const crashed = Object.values(latestByChannel).filter((b) => (b.crashes || 0) > 0 && ageDays(b) <= 14);
  const failed = recent.filter((b) => b.state === 'processing_failed' && ageDays(b) <= 1);

  const lines = [
    '## Version Health (apps-api)',
    '',
    `Window: last ${recent.length} builds of ${opts.appId || APP_ID}`,
    '',
    '| Build | Version | State | Crashes |',
    '|---|---|---|---|',
    ...recent.slice(0, 10).map((b) => `| #${b.id} | ${b.version} | ${b.state} | ${b.crashes || 0} |`),
    '',
  ];

  // Athom processing_failed is often transient (P139 socket hang) — soft-expect:
  // report in summary but do not fail the cron when crashes are clean.
  // Hard-fail only when:
  //   - soft-expect disabled, OR
  //   - no healthy testing tip AND a processing_failed is older than FAIL_AGE_H, OR
  //   - (P3025b) the healthy tip lags the newest failed draft by more than
  //     VERSION_HEALTH_MAX_TIP_LAG patches (default 32 = wait-draft P139 cap).
  // P2419: a newer draft can fail while an older tip stays healthy — do not red the cron.
  const softExpect = env.VERSION_HEALTH_SOFT_EXPECT !== '0';
  const failAgeH = Number(env.VERSION_HEALTH_FAIL_AGE_H || 6);
  const maxTipLag = Number(env.VERSION_HEALTH_MAX_TIP_LAG || 32);
  const newestTesting = all.find((b) => b.state === 'test' || b.state === 'testing');
  const tipHealthy = !!(newestTesting && !(Number(newestTesting.crashes) > 0));
  const tipLag = (b) => newestTesting ? patchOf(b.version) - patchOf(newestTesting.version) : NaN;
  const tipTooOld = (b) => tipHealthy && Number.isFinite(tipLag(b)) && tipLag(b) > maxTipLag;
  const stuckFailed = failed.filter((b) => {
    if (tipHealthy && !tipTooOld(b)) {return false;} // WHY: healthy tip on Test = users OK; draft PF is Athom noise
    if (!tipHealthy && newestTesting && newestTesting.id > b.id) {return false;}
    return ageDays(b) * 24 >= failAgeH;
  });

  let bad = false;
  if (crashed.length > 0) {
    bad = true;
    lines.push(`❌ Builds with crashes on test/live: ${crashed.map((b) => `#${b.id} v${b.version} (${b.crashes})`).join(', ')}`);
  }
  if (failed.length > 0) {
    const label = softExpect && stuckFailed.length === 0 ? '⚠️' : '❌';
    lines.push(`${label} processing_failed builds: ${failed.map((b) => `#${b.id} v${b.version}`).join(', ')}`);
    if (tipHealthy) {
      const lag = tipLag(failed[0]);
      const outside = !recent.includes(newestTesting) ? ' (outside the display window)' : '';
      lines.push(`ℹ️ P139/P2419 soft-expect: healthy Test tip #${newestTesting.id} v${newestTesting.version}${outside}, patch lag ${Number.isFinite(lag) ? lag : '?'} (max ${maxTipLag}) — ignoring draft processing_failed.`);
    }
    if (!softExpect || stuckFailed.length > 0) {
      bad = true;
      if (stuckFailed.length > 0) {
        const why = tipHealthy ? `healthy tip lags > ${maxTipLag} patches` : 'no healthy tip';
        lines.push(`❌ stuck processing_failed (>${failAgeH}h, ${why}): ${stuckFailed.map((b) => `#${b.id}`).join(', ')}`);
      }
    } else if (!tipHealthy) {
      lines.push('ℹ️ P139 soft-expect: Athom processing_failed ignored while age < fail window.');
    }
  }
  if (!bad) {lines.push('✅ No crashed or failed builds in the window.');}
  return { bad, lines, recent, failed, stuckFailed, crashed, newestTesting, tipHealthy };
}

async function main() {
  const client = require('../../.github/scripts/homey-apps-api-client');
  const api = await client.createClient({ log: () => {} });
  const builds = await client.getBuilds(api, APP_ID, { limit: 500 });
  const { bad, lines } = evaluate(builds);

  const out = lines.join('\n');
  console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${out  }\n`);
  }
  if (bad) {process.exit(1);}
}

module.exports = { evaluate, patchOf };

if (require.main === module) {
  main().catch((e) => {
    console.log(`::warning::version-health-check could not complete: ${e.message}`);
    // Auth/network failures must not turn the cron red — the report says enough.
  });
}
