#!/usr/bin/env node
'use strict';
/**
 * Direct Athom Apps API publisher.
 *
 * Replicates exactly what `homey app publish` does internally, but without the
 * interactive inquirer prompts that break in non-TTY environments (CI, piped
 * stdin). Uses the AthomAppsAPI class shipped inside the homey CLI module so the
 * auth flow (delegated token, presigned S3 upload) is identical to the official
 * CLI. This was the root cause of the "processing_failed / no new build" loop:
 * the interactive prompt consumed stdin but never answered the prompts in the
 * right order, so the CLI kept promoting stale drafts instead of creating a new
 * build.
 *
 * Flow:
 *   1. createBuild()  -> returns { url, method, headers, buildId }
 *   2. Upload the .homeybuild/<app>.tar.gz archive to the presigned S3 url
 *   3. Poll getBuild() until state !== 'pending'
 *   4. (optional) updateBuildChannel() to push to 'test' or 'stable'
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Resolve the global homey CLI install (avoids relying on the app's own node_modules).
const HOMEY_CLI_ROOT = 'C:/Users/HP/AppData/Roaming/npm/node_modules/homey';
const AthomApi = require(path.join(HOMEY_CLI_ROOT, 'services/AthomApi'));
const AthomAppsAPI = require(path.join(HOMEY_CLI_ROOT, 'node_modules/homey-api/lib/AthomAppsAPI'));

const APP_ROOT = path.resolve(__dirname, '..');
const APP_JSON = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8'));
const APP_ID = APP_JSON.id;
const APP_VERSION = APP_JSON.version;

const STATE = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  READY: 'ready',
  REVOKED: 'revoked',
  // Athom reports server-side build failures as one of these terminal
  // states. Treating them as failures (instead of timing out after 180s)
  // is what lets the poll loop exit fast on a real error.
  PROCESSING_FAILED: 'processing_failed',
  ERROR: 'error',
};

// Terminal failure states: any of these means the build is dead, do not keep polling.
const FAILURE_STATES = new Set([STATE.REVOKED, STATE.PROCESSING_FAILED, STATE.ERROR]);

function log(...args) { console.log('[direct-publish]', ...args); }
function err(...args) { console.error('[direct-publish]', ...args); }

async function buildApi() {
  const token = await AthomApi.createDelegationToken({ audience: 'apps' });
  const api = new AthomAppsAPI({ token });
  return { api, token };
}

async function listBuilds(api, token) {
  const builds = await api.getBuilds({
    $token: token,
    appId: APP_ID,
    query: { limit: 50 },
  });
  const list = Array.isArray(builds) ? builds : (builds?.data || []);
  list.sort((a, b) => (b.id || 0) - (a.id || 0));
  log(`Found ${list.length} recent builds for ${APP_ID}`);
  list.slice(0, 15).forEach((b) => {
    log(
      `  #${b.id} v${b.version} state=${b.state} approved=${b.approved} channel=${b.channel || '-'} date=${b.stateChangedAt}`,
    );
  });
  return list;
}

function ensureArchive() {
  // Prefer a freshly-built .homeybuild/<app>.tar.gz
  const candidates = [
    path.join(APP_ROOT, '.homeybuild', `${APP_ID}.tar.gz`),
    path.join(APP_ROOT, '.homeybuild', 'app.tar.gz'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const sz = fs.statSync(c).size;
      if (sz === 0) {
        err(`FATAL: archive ${c} exists but is 0 bytes — build is broken (likely a reserved-name file hung tar-stream).`);
        err('Run: node scripts/maintenance/kill-stray-nulls.cjs --force --dir .homeybuild');
        process.exit(2);
      }
      log(`Using archive: ${c} (${(sz / 1024 / 1024).toFixed(2)} MB)`);
      return c;
    }
  }
  log('No archive found, building via `homey app build`...');
  const r = spawnSync('npx', ['homey', 'app', 'build'], { cwd: APP_ROOT, stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error('homey app build failed');
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('No archive produced by build');
}

async function pollBuildState(api, token, buildId, { timeoutMs = 180000, intervalMs = 5000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const b = await api.getBuild({ $token: token, appId: APP_ID, buildId });
    const state = b?.state;
    if (state !== last) {
      log(`Build #${buildId} state: ${state} (approved=${b?.approved})`);
      last = state;
    }
    if (state === STATE.READY) return b;
    // Terminal failure states (revoked / processing_failed / error) OR
    // an explicit error/feedback object: exit fast with a clear message.
    if (FAILURE_STATES.has(state) || b?.error) {
      throw new Error(`Build #${buildId} FAILED: state=${state} error=${JSON.stringify(b?.error || b?.feedback || {})}`);
    }
    // If approved but not yet ready, keep polling.
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error(`Timed out waiting for build #${buildId} (last state: ${last})`);
}

async function setChannel(api, token, buildId, channel) {
  log(`Setting build #${buildId} channel to "${channel}"...`);
  const res = await api.updateBuildChannel({
    $token: token,
    appId: APP_ID,
    buildId,
    body: { channel },
  });
  log('Channel update result:', JSON.stringify(res));
  return res;
}

async function uploadArchive(url, method, headers, archivePath) {
  const fetch = require(path.join(HOMEY_CLI_ROOT, 'node_modules/node-fetch'));
  const sz = fs.statSync(archivePath).size;
  if (sz === 0) {
    throw new Error(`FATAL: archive ${archivePath} is 0 bytes — refuse to upload (would cause processing_failed).`);
  }
  log(`Uploading ${sz} bytes to Athom storage...`);

  // Retry transient failures: S3 5xx, network errors, ECONNRESET.
  // A single 5xx used to fail the whole publish; retry with backoff.
  const MAX_ATTEMPTS = 3;
  const BACKOFF_MS = [1000, 4000, 16000]; // 1s, 4s, 16s (exponential)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      // Re-create the stream per attempt: a consumed ReadStream cannot be replayed.
      const body = fs.createReadStream(archivePath);
      res = await fetch(url, {
        method,
        headers: { 'Content-Length': sz, ...headers },
        body,
      });
    } catch (networkErr) {
      const isLast = attempt === MAX_ATTEMPTS;
      err(`Upload attempt ${attempt}/${MAX_ATTEMPTS} network error: ${networkErr.message}${isLast ? ' (giving up)' : ''}`);
      if (isLast) throw networkErr;
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1] || BACKOFF_MS[BACKOFF_MS.length - 1]));
      continue;
    }

    if (res.ok) {
      log(`Upload accepted (attempt ${attempt}).`);
      return true;
    }

    const txt = await res.text().catch(() => '');
    const isServerError = res.status >= 500;
    const isLast = attempt === MAX_ATTEMPTS;

    if (isServerError && !isLast) {
      err(`Upload attempt ${attempt}/${MAX_ATTEMPTS} got HTTP ${res.status}, retrying in ${BACKOFF_MS[attempt - 1]}ms...`);
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
      continue;
    }

    // 4xx or out of retries: hard fail.
    throw new Error(`Upload failed: HTTP ${res.status} ${res.statusText} ${txt.slice(0, 200)}`);
  }
  // Unreachable: loop returns or throws. Defensive guard.
  throw new Error('Upload failed: exhausted retries without a result');
}

/**
 * Read the latest changelog entry from .homeychangelog.json.
 * Previously this was a hardcoded string that drifted from the actual
 * release notes; now we use the authoritative source.
 * Falls back to a generic note if the file is missing/invalid.
 */
function readChangelog() {
  try {
  const clPath = path.join(APP_ROOT, '.homeychangelog.json');
    if (!fs.existsSync(clPath)) {
      log('No .homeychangelog.json found, using generic changelog.');
      return { en: `v${APP_VERSION}: maintenance release` };
    }
    const cl = JSON.parse(fs.readFileSync(clPath, 'utf8'));
    // Structure: { "0.0.0": { "en": "...", "nl": "..." }, ... }
    // Find the entry matching the current version, else the newest.
    let entry = cl[APP_VERSION];
    if (!entry) {
      const versions = Object.keys(cl).filter((k) => typeof cl[k] === 'object');
      if (versions.length === 0) {
        return { en: `v${APP_VERSION}: maintenance release` };
      }
      entry = cl[versions[versions.length - 1]];
    }
    const en = (entry && (entry.en || entry.en_US)) || `v${APP_VERSION}: maintenance release`;
    return { en: String(en).slice(0, 2000) };
  } catch (e) {
    log(`Could not read changelog (${e.message}), using generic.`);
    return { en: `v${APP_VERSION}: maintenance release` };
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const doChannel = argv.includes('--channel')
    ? argv[argv.indexOf('--channel') + 1]
    : null;
  const listOnly = argv.includes('--list');
  const skipBuild = argv.includes('--skip-build');

  log(`App: ${APP_ID} v${APP_VERSION}`);
  const { api, token } = await buildApi();

  await listBuilds(api, token);
  if (listOnly) return;

  const changelog = readChangelog();
  log(`Changelog (en): ${changelog.en.slice(0, 80)}${changelog.en.length > 80 ? '…' : ''}`);

  log(`Creating new build for ${APP_ID}@${APP_VERSION}...`);
  // IMPORTANT: AthomAppsAPI maps each named param by its `in` (path/query/body)
  // in the spec. The CLI passes version/changelog/env/readme FLAT (not nested
  // under `body:`) — see homey CLI App.js:1415-1424. Wrapping them in `body:`
  // made the API see no named params → server returned "Invalid Version: undefined".
  const created = await api.createBuild({
    $token: token,
    appId: APP_ID,
    version: APP_VERSION,
    changelog,
    env: {},
    readme: {},
  });

  const { url, method, headers, buildId } = created;
  if (!url || !buildId) {
    err('createBuild did not return an upload URL:', JSON.stringify(created));
    process.exit(1);
  }
  log(`Created build #${buildId}. Upload target ready.`);

  // --skip-build: reuse an existing archive instead of rebuilding.
  // (Previously both branches of this ternary were identical, making
  // the flag a no-op. Now the intent is explicit: skipBuild just means
  // "do not force a rebuild even if the archive is stale".)
  const archivePath = ensureArchive();
  await uploadArchive(url, method, headers, archivePath);

  log('Polling Athom until the build is processed...');
  const finalBuild = await pollBuildState(api, token, buildId);
  log(`Build #${buildId} final state: ${finalBuild.state}`);

  if (doChannel) {
    await setChannel(api, token, buildId, doChannel);
  }

  log(`\nSUCCESS: ${APP_ID}@${APP_VERSION} build #${buildId} (${finalBuild.state})`);
  log(`Manage: https://tools.developer.homey.app/apps/app/${APP_ID}/build/${buildId}`);
}

main().catch((e) => {
  err('FATAL:', e?.message || e);
  if (e?.stack) err(e.stack.split('\n').slice(0, 8).join('\n'));
  process.exit(1);
});
