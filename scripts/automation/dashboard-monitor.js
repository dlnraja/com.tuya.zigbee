#!/usr/bin/env node
/**
 * dashboard-monitor.js - Monitor Homey Developer Dashboard
 *
 * Checks all builds via Athom API, identifies issues,
 * and generates a status report.
 *
 * Usage:
 *   node scripts/automation/dashboard-monitor.js              # Check all builds
 *   node scripts/automation/dashboard-monitor.js --latest     # Check only latest builds
 *   node scripts/automation/dashboard-monitor.js --json       # JSON output
 *   node scripts/automation/dashboard-monitor.js --alert      # Alert on failures
 */
'use strict';

const https = require('https');
const path = require('path');
const fs = require('fs');

const APP_ID = 'com.dlnraja.tuya.zigbee';
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const ALERT_MODE = args.includes('--alert');
const LATEST_ONLY = args.includes('--latest');

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function getBuilds() {
  const settingsPath = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey');
  try {
    const AthomApi = require(settingsPath + '/services/AthomApi');
    const { AthomAppsAPI } = require(settingsPath + '/node_modules/homey-api');
    const token = await AthomApi.createDelegationToken({ audience: 'apps' });
    const api = new AthomAppsAPI();
    const builds = await api.getBuilds({ '$token': token, appId: APP_ID });
    return Array.isArray(builds) ? builds : (builds.items || builds.data || []);
  } catch (e) {
    log('❌ Cannot load Athom API:', e.message);
    return [];
  }
}

async function main() {
  log('═══ Dashboard Monitor ═══');

  const builds = await getBuilds();
  if (!builds.length) {
    log('❌ No builds found');
    return;
  }

  log(`Total builds: ${builds.length}`);

  // Analyze builds
  const successful = builds.filter(b => b.sdk === 3 && b.state !== 'processing_failed');
  const failed = builds.filter(b => b.state === 'processing_failed');
  const drafts = builds.filter(b => b.state === 'draft');
  const inTest = builds.filter(b => b.state === 'test');

  log(`Successful: ${successful.length}`);
  log(`Failed: ${failed.length}`);
  log(`Drafts: ${drafts.length}`);
  log(`In Test: ${inTest.length}`);

  // Latest builds
  const sorted = builds.sort((a, b) => (b.id || 0) - (a.id || 0));
  const showCount = LATEST_ONLY ? 5 : 10;

  log(`\nLatest ${showCount} builds:`);
  sorted.slice(0, showCount).forEach(b => {
    const status = b.sdk === 3 ? '✅' : '❌';
    log(`  ${status} #${b.id}: v${b.version} | ${b.state} | sdk=${b.sdk}`);
  });

  // Check for recurring failures
  const recentFailed = failed.filter(b => b.id > builds.length - 100);
  if (recentFailed.length > 3) {
    log(`\n⚠️ WARNING: ${recentFailed.length} failures in last 100 builds`);
    log('Pattern: archive too large or malformed app.json');
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalBuilds: builds.length,
    successful: successful.length,
    failed: failed.length,
    drafts: drafts.length,
    inTest: inTest.length,
    latestBuild: sorted[0] ? { id: sorted[0].id, version: sorted[0].version, state: sorted[0].state } : null,
    successRate: ((successful.length / builds.length) * 100).toFixed(1) + '%',
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  }

  // Save report
  fs.mkdirSync('.github/state', { recursive: true });
  fs.writeFileSync('.github/state/dashboard-monitor-report.json', JSON.stringify(report, null, 2));
  log(`\nReport saved to .github/state/dashboard-monitor-report.json`);

  // Alert on failures
  if (ALERT_MODE && failed.length > 0) {
    log(`\n🚨 ALERT: ${failed.length} builds in processing_failed state`);
    log('Most common cause: Archive too large (>7MB) or malformed app.json');
  }

  log('\n═══ Monitor Complete ═══');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
