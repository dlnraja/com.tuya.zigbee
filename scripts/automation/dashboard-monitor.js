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

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { summarizeVersionHistory } = require('./build-history-utils');

function readAppId() {
  if (process.env.TARGET_APP_ID) return process.env.TARGET_APP_ID;
  if (process.env.APP_ID) return process.env.APP_ID;
  try {
    const app = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    if (app.id) return app.id;
  } catch {
    // Fall through to the historical master app id.
  }
  return 'com.dlnraja.tuya.zigbee';
}

const APP_ID = readAppId();
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const ALERT_MODE = args.includes('--alert');
const LATEST_ONLY = args.includes('--latest');

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const FAILED_STATES = new Set(['processing_failed', 'error', 'failed', 'revoked']);
const SUCCESS_STATES = new Set(['draft', 'test', 'live', 'published', 'ready']);

function normalizeText(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value !== 'object') return String(value);

  for (const key of ['message', 'error', 'reason', 'detail', 'details', 'description', 'statusText']) {
    if (value[key]) return normalizeText(value[key]);
  }

  try {
    const json = JSON.stringify(value);
    return json === '{}' ? '' : json;
  } catch {
    return String(value);
  }
}

function rawStateMeta(build) {
  return build.stateMeta || build.state_meta || build.error || build.errorMessage || build.feedback || build.message || '';
}

function stateMeta(build) {
  return normalizeText(rawStateMeta(build));
}

function isFailedBuild(build) {
  return FAILED_STATES.has(build.state);
}

function isSuccessfulBuild(build) {
  return !isFailedBuild(build) && SUCCESS_STATES.has(build.state);
}

function statusIcon(build) {
  if (isFailedBuild(build)) return '❌';
  if (build.state === 'test') return '✅';
  if (build.state === 'draft') return '📝';
  return 'ℹ️';
}

function summarizeBuild(build) {
  if (!build) return null;
  const id = build.id || build.buildId || null;
  return {
    id,
    version: build.version || null,
    state: build.state || null,
    stateMeta: rawStateMeta(build) || null,
    failureDetail: stateMeta(build) || null,
    createdAt: build.createdAt || build.created_at || null,
    stateChangedAt: build.stateChangedAt || build.state_changed_at || null,
    sdk: build.sdk ?? null,
    platforms: build.platforms || null,
    url: id ? `https://tools.developer.homey.app/apps/app/${APP_ID}/build/${id}` : null,
  };
}

function normalizeBuilds(body) {
  const list = Array.isArray(body) ? body : (body && (body.items || body.data || body.builds || body.results)) || [];
  if (!Array.isArray(list)) return [];
  return list
    .filter(Boolean)
    .map(build => ({
      ...build,
      id: build.id || build.buildId || build._id,
      state: build.state || build.channel || build.status,
      version: build.version || build.appVersion || build.semver,
    }));
}

function resolveHomeyCliRoot() {
  const candidates = [];
  try {
    candidates.push(path.dirname(require.resolve('homey/package.json', { paths: [process.cwd(), __dirname] })));
  } catch {
    // package not installed locally; try global locations below.
  }
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'homey'));
  }
  try {
    candidates.push(path.join(execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim(), 'homey'));
  } catch {
    // npm may be unavailable in very small CI images.
  }

  const root = candidates.find((candidate) => candidate && fs.existsSync(path.join(candidate, 'services', 'AthomApi.js')));
  if (!root) {
    throw new Error('homey CLI modules not found. Run npm ci or npm install -g homey.');
  }
  return root;
}

async function getBuilds() {
  try {
    const homeyRoot = resolveHomeyCliRoot();
    const AthomApi = require(path.join(homeyRoot, 'services', 'AthomApi'));
    let homeyApi = null;
    try {
      homeyApi = require(path.join(homeyRoot, 'node_modules', 'homey-api'));
    } catch {
      homeyApi = require('homey-api');
    }
    const { AthomAppsAPI } = homeyApi;
    const token = await AthomApi.createDelegationToken({ audience: 'apps' });
    const api = new AthomAppsAPI({ token });
    const body = await api.getBuilds({ '$token': token, appId: APP_ID, query: { limit: 1000 } });
    return normalizeBuilds(body);
  } catch (e) {
    log(`❌ Cannot load Athom API for ${APP_ID}: ${e.message}`);
    return [];
  }
}

async function main() {
  log('═══ Dashboard Monitor ═══');
  log(`App: ${APP_ID}`);

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
    const metaText = meta ? ` | stateMeta=${meta.slice(0, 180)}` : '';
    const sdkText = b.sdk === undefined ? '' : ` | sdk=${b.sdk}`;
    log(`  ${statusIcon(b)} #${b.id}: v${b.version} | ${b.state}${sdkText}${metaText}`);
  });

  // Check for recurring failures
  const recentFailed = sorted.slice(0, 100).filter(isFailedBuild);
  const latestBuild = sorted[0] || null;
  const latestFailedBuild = sorted.find(isFailedBuild) || null;
  const latestGoodBuild = sorted.find(isSuccessfulBuild) || null;
  const latestIsFailed = latestBuild ? isFailedBuild(latestBuild) : false;
  const versionSummary = summarizeVersionHistory(sorted, { appId: APP_ID });

  if (recentFailed.length > 3) {
    const prefix = latestIsFailed ? '🚨' : 'ℹ️';
    log(`\n${prefix} ${recentFailed.length} failures in last 100 builds`);
    const latestMeta = stateMeta(recentFailed[0]);
    log(`Latest failure detail: ${latestMeta || 'no stateMeta returned by Athom API'}`);
    if (!latestIsFailed) {
      log('Latest build is healthy; failures are historical and should not trigger republish.');
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    appId: APP_ID,
    totalBuilds: builds.length,
    successful: successful.length,
    failed: failed.length,
    drafts: drafts.length,
    inTest: inTest.length,
    latestBuild: summarizeBuild(latestBuild),
    latestBuilds: sorted.slice(0, showCount).map(summarizeBuild),
    latestFailedBuild: summarizeBuild(latestFailedBuild),
    latestGoodBuild: summarizeBuild(latestGoodBuild),
    latestWorkingVersion: versionSummary.latestWorkingVersion,
    latestTestVersion: versionSummary.latestTestVersion,
    versionTotals: {
      totalVersions: versionSummary.totalVersions,
      workingVersions: versionSummary.workingVersionCount,
      testVersions: versionSummary.testVersionCount,
      failedOnlyVersions: versionSummary.failedOnlyVersionCount,
    },
    workingVersions: versionSummary.workingVersions,
    testVersions: versionSummary.testVersions,
    failedOnlyVersions: versionSummary.failedOnlyVersions,
    failurePatterns: versionSummary.failurePatterns,
    versionHistory: versionSummary.versionHistory,
    recentWindow: 100,
    recentFailedCount: recentFailed.length,
    currentStatus: {
      latestIsFailed,
      latestState: latestBuild?.state || null,
      latestFailureDetail: latestIsFailed ? (stateMeta(latestBuild) || null) : null,
      historicalFailuresOnly: recentFailed.length > 0 && !latestIsFailed,
    },
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
  if (ALERT_MODE && latestIsFailed) {
    log(`\n🚨 ALERT: latest build #${latestBuild.id} is ${latestBuild.state}`);
    log(`Latest failure detail: ${stateMeta(latestBuild) || 'no stateMeta returned by Athom API'}`);
    process.exitCode = 1;
  } else if (ALERT_MODE && recentFailed.length > 0) {
    log(`\nℹ️ Historical failures found (${recentFailed.length}/100), but latest build is healthy.`);
  }

  log('\n═══ Monitor Complete ═══');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
