#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { summarizeVersionHistory } = require('./build-history-utils');

let fetchWithRetry = null;
let privacy = null;
try {
  ({ fetchWithRetry } = require('../../.github/scripts/retry-helper'));
} catch {
  fetchWithRetry = async (url, opts) => fetch(url, opts);
}
try {
  privacy = require('../../.github/scripts/privacy-redactor');
} catch {
  privacy = {
    redact: value => String(value || ''),
    redactObject: value => value,
    assertNoLeaks: () => {},
  };
}

function readAppId() {
  if (process.env.TARGET_APP_ID) return process.env.TARGET_APP_ID;
  if (process.env.APP_ID) return process.env.APP_ID;
  try {
    const app = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    if (app.id) return app.id;
  } catch {
    // Fall through to the default app id.
  }
  return 'com.dlnraja.tuya.zigbee';
}

const APP_ID = readAppId();
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const ALERT_MODE = args.includes('--alert');
const LATEST_ONLY = args.includes('--latest');
const REQUIRE_BUILDS = args.includes('--require-builds');
const REPORT_PATH = path.join(process.cwd(), '.github', 'state', 'dashboard-monitor-report.json');

function argValue(name) {
  const exact = args.indexOf(name);
  if (exact !== -1 && args[exact + 1]) return args[exact + 1];
  const prefixed = args.find(arg => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : '';
}

const EXPECTED_VERSION = argValue('--expect-version') || process.env.EXPECTED_APP_VERSION || '';
const EXPECTED_STATE = argValue('--expect-state') || process.env.EXPECTED_BUILD_STATE || '';

const FAILED_STATES = new Set(['processing_failed', 'error', 'failed', 'revoked']);
const SUCCESS_STATES = new Set(['draft', 'test', 'live', 'published', 'ready']);

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function redacted(value) {
  return privacy.redact(String(value || ''));
}

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

function statusLabel(build) {
  if (isFailedBuild(build)) return 'failed';
  if (build.state === 'test') return 'test';
  if (build.state === 'draft') return 'draft';
  return build.state || 'unknown';
}

function summarizeBuild(build) {
  if (!build) return null;
  const id = build.id || build.buildId || build._id || null;
  return {
    id,
    version: build.version || null,
    state: build.state || build.channel || null,
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
    // Package not installed locally; try global locations below.
  }
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'homey'));
  }
  try {
    candidates.push(path.join(execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim(), 'homey'));
  } catch {
    // npm may be unavailable in very small CI images.
  }

  const root = candidates.find(candidate => candidate && fs.existsSync(path.join(candidate, 'services', 'AthomApi.js')));
  if (!root) {
    throw new Error('homey CLI modules not found. Run npm ci or npm install -g homey.');
  }
  return root;
}

async function getBuildsFromCliDelegation(errors) {
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
  const builds = normalizeBuilds(body);
  if (!builds.length) errors.push('Athom Apps API returned no builds via CLI delegation.');
  return builds;
}

async function getBuildsFromPat(errors) {
  const tokens = [process.env.HOMEY_PAT_API, process.env.HOMEY_PAT].filter(Boolean);
  if (!tokens.length) {
    errors.push('HOMEY_PAT_API/HOMEY_PAT not set.');
    return [];
  }

  const urls = [
    `https://apps-api.athom.com/api/v1/app/${APP_ID}/build`,
    `https://apps-api.athom.com/api/v1/apps/${APP_ID}/builds`,
  ];

  for (const token of tokens) {
    for (const url of urls) {
      try {
        const response = await fetchWithRetry(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }, { retries: 2, label: 'athom-builds', queue: 'athom' });
        if (!response.ok) {
          errors.push(`PAT request ${new URL(url).pathname} returned HTTP ${response.status}.`);
          continue;
        }
        const builds = normalizeBuilds(await response.json());
        if (builds.length) return builds;
        errors.push(`PAT request ${new URL(url).pathname} returned no builds.`);
      } catch (error) {
        errors.push(`PAT request failed: ${redacted(error.message)}`);
      }
    }
  }
  return [];
}

async function getBuilds(errors) {
  try {
    const builds = await getBuildsFromCliDelegation(errors);
    if (builds.length) return { builds, source: 'homey-cli-delegation' };
  } catch (error) {
    errors.push(`CLI delegation failed: ${redacted(error.message)}`);
  }

  const builds = await getBuildsFromPat(errors);
  if (builds.length) return { builds, source: 'homey-pat' };
  return { builds: [], source: 'unavailable' };
}

function sortBuilds(builds) {
  return builds.slice().sort((a, b) => {
    const aid = Number(a.id || 0);
    const bid = Number(b.id || 0);
    if (bid !== aid) return bid - aid;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

function writeReport(report) {
  const safe = privacy.redactObject(report);
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  privacy.assertNoLeaks(safe, REPORT_PATH);
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(safe, null, 2)}\n`);
  log(`Report saved to ${path.relative(process.cwd(), REPORT_PATH)}`);
}

async function main() {
  log('=== Dashboard Monitor ===');
  log(`App: ${APP_ID}`);

  const errors = [];
  const { builds, source } = await getBuilds(errors);
  const sorted = sortBuilds(builds);
  const showCount = LATEST_ONLY ? 5 : 10;
  const latestBuild = sorted[0] || null;
  const successful = sorted.filter(isSuccessfulBuild);
  const failed = sorted.filter(isFailedBuild);
  const drafts = sorted.filter(build => build.state === 'draft');
  const inTest = sorted.filter(build => build.state === 'test');
  const latestFailedBuild = sorted.find(isFailedBuild) || null;
  const latestGoodBuild = sorted.find(isSuccessfulBuild) || null;
  const latestIsFailed = latestBuild ? isFailedBuild(latestBuild) : false;
  const recentFailed = sorted.slice(0, 100).filter(isFailedBuild);
  const versionSummary = summarizeVersionHistory(sorted, { appId: APP_ID });
  const expectedBuild = EXPECTED_VERSION
    ? sorted.find(build => (
      String(build.version || '') === EXPECTED_VERSION
      && (!EXPECTED_STATE || String(build.state || '') === EXPECTED_STATE)
    ))
    : null;

  if (!sorted.length) {
    log('No builds available from Athom APIs; writing limited dashboard report.');
  } else {
    log(`Total builds: ${sorted.length}`);
    log(`Successful: ${successful.length}`);
    log(`Failed: ${failed.length}`);
    log(`Drafts: ${drafts.length}`);
    log(`In Test: ${inTest.length}`);
    log(`Latest ${showCount} builds:`);
    for (const build of sorted.slice(0, showCount)) {
      const meta = stateMeta(build);
      const metaText = meta ? ` | stateMeta=${meta.slice(0, 180)}` : '';
      const sdkText = build.sdk === undefined ? '' : ` | sdk=${build.sdk}`;
      log(`  ${statusLabel(build)} #${build.id || '?'}: v${build.version || '?'} | ${build.state || '?'}${sdkText}${metaText}`);
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    appId: APP_ID,
    source,
    totalBuilds: sorted.length,
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
    expected: EXPECTED_VERSION ? {
      version: EXPECTED_VERSION,
      state: EXPECTED_STATE || null,
      found: Boolean(expectedBuild),
      build: summarizeBuild(expectedBuild),
    } : null,
    recentWindow: 100,
    recentFailedCount: recentFailed.length,
    currentStatus: {
      latestIsFailed,
      latestState: latestBuild?.state || null,
      latestFailureDetail: latestIsFailed ? (stateMeta(latestBuild) || null) : null,
      historicalFailuresOnly: recentFailed.length > 0 && !latestIsFailed,
      limited: !sorted.length,
    },
    errors: errors.map(redacted),
    successRate: sorted.length ? `${((successful.length / sorted.length) * 100).toFixed(1)}%` : 'n/a',
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  }

  writeReport(report);

  if (ALERT_MODE && latestIsFailed) {
    log(`ALERT: latest build #${latestBuild.id} is ${latestBuild.state}`);
    log(`Latest failure detail: ${stateMeta(latestBuild) || 'no stateMeta returned by Athom API'}`);
    process.exitCode = 1;
  } else if (ALERT_MODE && REQUIRE_BUILDS && !sorted.length) {
    log('ALERT: no builds were available and --require-builds was set.');
    process.exitCode = 1;
  } else if (ALERT_MODE && recentFailed.length > 0) {
    log(`Historical failures found (${recentFailed.length}/100), but latest build is healthy.`);
  }

  if (EXPECTED_VERSION && !expectedBuild) {
    const stateText = EXPECTED_STATE ? ` in state ${EXPECTED_STATE}` : '';
    log(`ALERT: expected v${EXPECTED_VERSION}${stateText} was not found in Athom builds.`);
    process.exitCode = 1;
  }

  log('=== Monitor Complete ===');
}

main().catch(error => {
  console.error('Fatal error:', redacted(error.message));
  process.exit(1);
});
