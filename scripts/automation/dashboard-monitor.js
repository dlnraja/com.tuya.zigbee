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
const FAILED_STATES = new Set(['processing_failed', 'error', 'failed']);

function stateMeta(build) {
  return build.stateMeta || build.state_meta || build.error || build.errorMessage || '';
}

function isFailedBuild(build) {
  return FAILED_STATES.has(build.state);
}

function isSuccessfulBuild(build) {
  return !isFailedBuild(build) && ['draft', 'test', 'live', 'published'].includes(build.state);
}

function statusIcon(build) {
  if (isFailedBuild(build)) return '❌';
  if (build.state === 'test') return '✅';
  if (build.state === 'draft') return '📝';
  return 'ℹ️';
}

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
    log(`❌ Cannot load Athom API: ${e.message}`);
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
  const successful = builds.filter(isSuccessfulBuild);
  const failed = builds.filter(isFailedBuild);
  const drafts = builds.filter(b => b.state === 'draft');
  const inTest = builds.filter(b => b.state === 'test');

  log(`Successful: ${successful.length}`);
  log(`Failed: ${failed.length}`);
  log(`Drafts: ${drafts.length}`);
  log(`In Test: ${inTest.length}`);

  // Latest builds
  const sorted = builds.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
  const showCount = LATEST_ONLY ? 5 : 10;

  log(`\nLatest ${showCount} builds:`);
  sorted.slice(0, showCount).forEach(b => {
    const meta = stateMeta(b);
    const metaText = meta ? ` | stateMeta=${meta}` : '';
    const sdkText = b.sdk === undefined ? '' : ` | sdk=${b.sdk}`;
    log(`  ${statusIcon(b)} #${b.id}: v${b.version} | ${b.state}${sdkText}${metaText}`);
  });

  // Check for recurring failures
  const recentFailed = sorted.slice(0, 100).filter(isFailedBuild);
  if (recentFailed.length > 3) {
    log(`\n⚠️ WARNING: ${recentFailed.length} failures in last 100 builds`);
    const latestMeta = stateMeta(recentFailed[0]);
    log(`Latest failure detail: ${latestMeta || 'no stateMeta returned by Athom API'}`);
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalBuilds: builds.length,
    successful: successful.length,
    failed: failed.length,
    drafts: drafts.length,
    inTest: inTest.length,
    latestBuild: sorted[0] ? {
      id: sorted[0].id,
      version: sorted[0].version,
      state: sorted[0].state,
      stateMeta: stateMeta(sorted[0]) || null,
      createdAt: sorted[0].createdAt || sorted[0].created_at || null,
      stateChangedAt: sorted[0].stateChangedAt || sorted[0].state_changed_at || null,
      platforms: sorted[0].platforms || null,
    } : null,
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
    log(`Latest failure detail: ${stateMeta(failed.sort((a, b) => (b.id || 0) - (a.id || 0))[0]) || 'no stateMeta returned by Athom API'}`);
  }

  log('\n═══ Monitor Complete ═══');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
