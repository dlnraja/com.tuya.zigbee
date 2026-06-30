#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { fetchWithRetry } = require('./retry-helper');

const ROOT = path.join(__dirname, '..', '..');
const APP = process.env.APP_ID || 'com.dlnraja.tuya.zigbee';
const PAT = process.env.HOMEY_PAT;
const SUM = process.env.GITHUB_STEP_SUMMARY || null;
const CLOUD = 'https://api.athom.com';
const APPS = 'https://apps-api.athom.com/api/v1';
const REPORT_PATH = path.join(ROOT, '.github', 'state', 'dashboard-monitor-report.json');

function log(text) {
  console.log(text);
  if (SUM) {
    try {
      fs.appendFileSync(SUM, `${text}\n`);
    } catch {
      // GitHub summary is helpful, not required.
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeVersion(version) {
  return String(version || '').replace(/^v/i, '');
}

function normalizeBuilds(body) {
  const list = Array.isArray(body) ? body : (body && (
    body.items || body.data || body.builds || body.results
  )) || [];

  if (!Array.isArray(list)) return [];
  return list.filter(Boolean).map(build => ({
    ...build,
    id: build.id || build.buildId || build._id,
    version: normalizeVersion(build.version || build.appVersion || build.semver),
    state: String(build.state || build.channel || build.status || '').toLowerCase(),
  }));
}

function classifyBuilds(builds, expectedVersion) {
  const expected = normalizeVersion(expectedVersion);
  const test = builds.filter(build => build.state === 'test');
  const draft = builds.filter(build => {
    const state = build.state || '';
    return state === 'draft' || state === '' || state === 'none';
  });

  return {
    test,
    draft,
    inTest: test.some(build => build.version === expected),
    inDraft: draft.some(build => build.version === expected),
    latestTest: test.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0] || null,
    latest: builds.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0] || null,
  };
}

async function createAppsToken() {
  const headers = {
    Authorization: `Bearer ${PAT}`,
    'Content-Type': 'application/json',
  };
  const response = await fetchWithRetry(`${CLOUD}/delegation/token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ audience: 'apps' }),
  }, { retries: 2, label: 'deleg' });
  const body = await response.json().catch(() => ({}));
  return body.token || PAT;
}

async function fetchBuildsWithToken(token) {
  const urls = [
    `${APPS}/app/${APP}/build`,
    `${APPS}/apps/${APP}/builds`,
  ];
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  const errors = [];
  for (const url of urls) {
    try {
      const response = await fetchWithRetry(url, { headers }, {
        retries: 2,
        label: 'builds',
        queue: 'athom',
      });
      if (!response.ok) {
        errors.push(`${new URL(url).pathname} HTTP ${response.status}`);
        continue;
      }
      const builds = normalizeBuilds(await response.json().catch(() => null));
      if (builds.length) return { builds, errors };
      errors.push(`${new URL(url).pathname} returned no builds`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { builds: [], errors };
}

async function directVerify(expectedVersion) {
  let token = PAT;
  try {
    token = await createAppsToken();
  } catch (error) {
    log(`Direct API delegation warning: ${error.message}`);
  }

  const { builds, errors } = await fetchBuildsWithToken(token);
  if (!builds.length) {
    log(`Direct API returned no builds${errors.length ? ` (${errors.join('; ')})` : ''}`);
    return false;
  }

  const result = classifyBuilds(builds, expectedVersion);
  log(`Builds: ${builds.length} total, ${result.test.length} test, ${result.draft.length} draft`);

  if (result.inTest) {
    log(`OK: v${expectedVersion} is on test channel`);
    return true;
  }

  if (result.inDraft) {
    log(`v${expectedVersion} is still in draft`);
    return false;
  }

  const latestText = result.latest
    ? `latest v${result.latest.version || '?'} ${result.latest.state || 'unknown'} #${result.latest.id || '?'}`
    : 'latest unavailable';
  log(`v${expectedVersion} not found via direct API (${latestText})`);
  return false;
}

function readDashboardReport(expectedVersion) {
  if (!fs.existsSync(REPORT_PATH)) return false;
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const expected = report.expected || {};
  const expectedBuild = expected.build || null;
  const latest = report.latestBuild || null;
  const latestTest = report.latestTestVersion?.latestTestBuild || null;

  if (expected.found && expectedBuild?.state === 'test') {
    log(`Dashboard monitor confirms v${expectedVersion} test build #${expectedBuild.id || '?'}`);
    return true;
  }

  if (normalizeVersion(latestTest?.version) === normalizeVersion(expectedVersion)
      && latestTest?.state === 'test') {
    log(`Dashboard monitor confirms latest test v${expectedVersion} build #${latestTest.id || '?'}`);
    return true;
  }

  if (normalizeVersion(latest?.version) === normalizeVersion(expectedVersion)
      && latest?.state === 'test') {
    log(`Dashboard monitor confirms latest build v${expectedVersion} is test #${latest.id || '?'}`);
    return true;
  }

  const latestText = latest
    ? `latest v${latest.version || '?'} ${latest.state || 'unknown'} #${latest.id || '?'}`
    : 'latest unavailable';
  log(`Dashboard monitor did not confirm v${expectedVersion} in test (${latestText})`);
  return false;
}

function dashboardFallback(expectedVersion) {
  const args = [
    path.join(ROOT, 'scripts', 'automation', 'dashboard-monitor.js'),
    '--latest',
    '--expect-version',
    normalizeVersion(expectedVersion),
    '--expect-state',
    'test',
  ];

  try {
    const output = execFileSync(process.execPath, args, {
      cwd: ROOT,
      env: {
        ...process.env,
        EXPECTED_APP_VERSION: normalizeVersion(expectedVersion),
        EXPECTED_BUILD_STATE: 'test',
      },
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    output.split(/\r?\n/)
      .filter(line => /Latest 5 builds|test #|failed #|ALERT:|Monitor Complete|Total builds|In Test/.test(line))
      .forEach(line => log(line));
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    output.split(/\r?\n/)
      .filter(line => /Latest 5 builds|test #|failed #|ALERT:|No builds|Fatal|Monitor Complete|Total builds|In Test/.test(line))
      .forEach(line => log(line));
    log(`Dashboard monitor fallback exited non-zero: ${error.status || error.message}`);
  }

  try {
    return readDashboardReport(expectedVersion);
  } catch (error) {
    log(`Dashboard report read failed: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!PAT) {
    log('HOMEY_PAT not set');
    process.exit(0);
  }

  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const version = normalizeVersion(app.version);
  log('## Verify Test Version');
  log(`Expected: v${version}`);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    log(`Verification attempt ${attempt}/3`);
    if (await directVerify(version)) return;
    if (dashboardFallback(version)) return;
    if (attempt < 3) await sleep(15000);
  }

  log(`v${version} was not confirmed on the Homey test channel`);
  process.exitCode = 1;
}

main().catch(error => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
