#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const REPORT_PATH = path.join(process.cwd(), '.github', 'state', 'dashboard-monitor-report.json');
const SUCCESS_STATES = new Set(['draft', 'test', 'live', 'published', 'ready']);

function argValue(name, fallback = '') {
  const exact = args.indexOf(name);
  if (exact !== -1 && args[exact + 1]) return args[exact + 1];
  const prefixed = args.find(arg => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : fallback;
}

function numberArg(name, fallback) {
  const value = Number(argValue(name, String(fallback)));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const publishPath = argValue('--path');
const expectedVersion = argValue('--expect-version') || process.env.EXPECTED_APP_VERSION || '';
const attempts = Math.max(1, numberArg('--attempts', 2));
const postPublishWaitMs = numberArg('--post-publish-wait-ms', 120000);
const rateCooldownMs = numberArg('--rate-cooldown-ms', 900000);
const monitorDelayMs = numberArg('--monitor-delay-ms', 0);

if (!publishPath) {
  console.error('Usage: publish-with-athom-backoff.js --path <publish-dir> --expect-version <version>');
  process.exit(2);
}

if (!expectedVersion) {
  console.error('--expect-version or EXPECTED_APP_VERSION is required.');
  process.exit(2);
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRateLimited(text) {
  return /rate|too many requests|reduce your request/i.test(String(text || ''));
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code}`));
    });
  });
}

async function monitorBuilds() {
  if (monitorDelayMs > 0) await sleep(monitorDelayMs);
  await run(process.execPath, [
    'scripts/automation/dashboard-monitor.js',
    '--latest',
    '--json',
    '--require-builds',
  ], { env: process.env });

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const latestBuilds = Array.isArray(report.latestBuilds) ? report.latestBuilds : [];
  const expectedBuilds = latestBuilds.filter(build => String(build.version || '') === expectedVersion);
  const healthy = expectedBuilds.find(build => SUCCESS_STATES.has(String(build.state || '')));
  const failed = expectedBuilds.find(build => /failed|error|revoked/.test(String(build.state || '')));
  return {
    report,
    latest: report.latestBuild || null,
    healthy,
    failed,
    rateLimited: isRateLimited(failed?.failureDetail || failed?.stateMeta || report.currentStatus?.latestFailureDetail),
  };
}

async function waitForRateLimitToCoolDown() {
  let status;
  try {
    status = await monitorBuilds();
  } catch (error) {
    log(`Preflight monitor unavailable, continuing to publish: ${error.message}`);
    return;
  }

  const latest = status.latest;
  if (!latest || String(latest.version || '') !== expectedVersion || !isRateLimited(latest.failureDetail || latest.stateMeta)) {
    return;
  }

  const changedAt = Date.parse(latest.stateChangedAt || latest.createdAt || '');
  const ageMs = Number.isFinite(changedAt) ? Date.now() - changedAt : 0;
  const waitMs = Math.max(0, rateCooldownMs - ageMs);
  if (waitMs > 0) {
    log(`Latest v${expectedVersion} failed due Athom rate limiting; waiting ${Math.ceil(waitMs / 1000)}s before retrying publish.`);
    await sleep(waitMs);
  }
}

async function publishOnce(attempt) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  log(`Publishing attempt ${attempt}/${attempts} from ${publishPath}`);
  await run(npx, ['homey', 'app', 'publish', '--path', publishPath], {
    env: {
      ...process.env,
      HOMEY_HEADLESS: '1',
    },
  });
  log(`Publish command completed; waiting ${Math.ceil(postPublishWaitMs / 1000)}s for Athom processing.`);
  await sleep(postPublishWaitMs);
}

async function main() {
  await waitForRateLimitToCoolDown();

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await publishOnce(attempt);
      const status = await monitorBuilds();
      if (status.healthy) {
        log(`Healthy v${expectedVersion} build found: #${status.healthy.id} state=${status.healthy.state}`);
        return;
      }

      if (status.rateLimited && attempt < attempts) {
        log(`Athom rate limit detected for v${expectedVersion}; waiting ${Math.ceil(rateCooldownMs / 1000)}s before retry.`);
        await sleep(rateCooldownMs);
        continue;
      }

      const failure = status.failed || status.latest;
      throw new Error(`No healthy v${expectedVersion} draft/test build found after publish. Latest: v${failure?.version || '?'} ${failure?.state || '?'} ${failure?.failureDetail || failure?.stateMeta || ''}`);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRateLimited(error.message)) break;
      log(`Publish attempt hit rate limiting; waiting ${Math.ceil(rateCooldownMs / 1000)}s before retry.`);
      await sleep(rateCooldownMs);
    }
  }

  throw lastError || new Error(`Failed to publish v${expectedVersion}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
