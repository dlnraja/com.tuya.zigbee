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
const os = require('os');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

const APP_ROOT = path.resolve(argValue('--path') || process.env.HOMEY_PUBLISH_PATH || path.join(__dirname, '..'));
const APP_JSON = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8'));
const APP_ID = APP_JSON.id;
const APP_VERSION = APP_JSON.version;
const MAX_ARCHIVE_MB = Number(process.env.HOMEY_ARCHIVE_MAX_MB || 20);
const API_TIMEOUT_MS = Number(process.env.HOMEY_API_TIMEOUT_MS || 60000);
const BUILD_POLL_TIMEOUT_MS = Number(process.env.HOMEY_BUILD_POLL_TIMEOUT_MS || 240000);
const BUILD_POLL_INTERVAL_MS = Number(process.env.HOMEY_BUILD_POLL_INTERVAL_MS || 5000);
const REPO_ROOT = path.resolve(__dirname, '..');
const MODULE_PATHS = [APP_ROOT, REPO_ROOT, process.cwd()];

function resolveModule(id, extraPaths = []) {
  return require.resolve(id, { paths: [...extraPaths, ...MODULE_PATHS] });
}

const homeyPackageRoot = path.dirname(resolveModule('homey/package.json'));
function requireAthomApi() {
  const candidates = ['homey/services/AthomApi', 'homey/lib/AthomApi'];
  const errors = [];
  for (const id of candidates) {
    try {
      const mod = require(resolveModule(id));
      if (typeof mod.createDelegationToken === 'function') return mod;
      errors.push(`${id}: createDelegationToken missing`);
    } catch (error) {
      errors.push(`${id}: ${error.message}`);
    }
  }
  throw new Error(`Cannot load Homey AthomApi (${errors.join(' | ')})`);
}
const AthomApi = requireAthomApi();
const AthomAppsAPI = require(resolveModule('homey-api/lib/AthomAppsAPI', [homeyPackageRoot]));
const tar = require(resolveModule('tar-fs', [homeyPackageRoot]));
const fetch = require(resolveModule('node-fetch', [homeyPackageRoot]));

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
  const tokenObj = await AthomApi.createDelegationToken({ audience: 'apps' });
  const token = tokenObj?.token || tokenObj?.access_token || tokenObj;
  if (!token) throw new Error('Homey apps delegation token missing');
  const api = new AthomAppsAPI({ token });
  return { api, token };
}

async function listBuilds(api, token) {
  const builds = await api.getBuilds({
    $token: token,
    $timeout: API_TIMEOUT_MS,
    appId: APP_ID,
    $query: { limit: 50 },
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
      const archiveMB = sz / 1024 / 1024;
      if (archiveMB > MAX_ARCHIVE_MB) {
        err(`FATAL: archive ${c} is ${archiveMB.toFixed(2)} MB, above ${MAX_ARCHIVE_MB.toFixed(2)} MB safety limit.`);
        err('Run: npm run build && npm run prepare-publish, then inspect large files with node scripts/ci/publish-size-gate.cjs');
        process.exit(2);
      }
      log(`Using archive: ${c} (${(sz / 1024 / 1024).toFixed(2)} MB)`);
      return c;
    }
  }
  return null;
}

async function packDirectory(appPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'homey-direct-publish-'));
  const archivePath = path.join(tmpDir, `${APP_ID}.tar.gz`);
  let appSize = 0;
  let numFiles = 0;

  await pipeline(
    tar.pack(appPath, {
      dereference: true,
      map(header) {
        if (header.type === 'file') {
          numFiles += 1;
          appSize += header.size || 0;
        }
        return header;
      },
      ignore(name) {
        const rel = path.relative(appPath, name).replace(/\\/g, '/');
        if (!rel) return false;
        return rel.split('/').some(seg => seg.startsWith('.'));
      },
    }),
    zlib.createGzip(),
    fs.createWriteStream(archivePath),
  );

  const archiveMB = fs.statSync(archivePath).size / 1024 / 1024;
  log(`Packed ${numFiles} files from ${appPath} (${(appSize / 1024 / 1024).toFixed(2)} MB raw, ${archiveMB.toFixed(2)} MB gz).`);
  return archivePath;
}

async function pollBuildState(api, token, buildId, { timeoutMs = 180000, intervalMs = 5000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const b = await api.getBuild({
      $token: token,
      $timeout: API_TIMEOUT_MS,
      appId: APP_ID,
      buildId,
    });
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
    $timeout: API_TIMEOUT_MS,
    appId: APP_ID,
    buildId,
    channel,
  });
  log('Channel update result:', JSON.stringify(res));
  return res;
}

async function uploadArchive(url, method, headers, archivePath) {
  const sz = fs.statSync(archivePath).size;
  if (sz === 0) {
    throw new Error(`FATAL: archive ${archivePath} is 0 bytes — refuse to upload (would cause processing_failed).`);
  }
  const archiveMB = sz / 1024 / 1024;
  if (archiveMB > MAX_ARCHIVE_MB) {
    throw new Error(`FATAL: archive ${archivePath} is ${archiveMB.toFixed(2)} MB, above ${MAX_ARCHIVE_MB.toFixed(2)} MB safety limit.`);
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

function readReadme() {
  const readme = {};
  const englishPath = path.join(APP_ROOT, 'README.txt');
  if (fs.existsSync(englishPath)) {
    readme.en = fs.readFileSync(englishPath, 'utf8');
  }

  for (const entry of fs.readdirSync(APP_ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = /^README\.([a-z]{2})\.txt$/i.exec(entry.name);
    if (!match) continue;
    readme[match[1].toLowerCase()] = fs.readFileSync(path.join(APP_ROOT, entry.name), 'utf8');
  }

  if (!readme.en) {
    readme.en = `${APP_ID} v${APP_VERSION}`;
  }
  return readme;
}

function readEnv() {
  const envPath = path.join(APP_ROOT, 'env.json');
  if (!fs.existsSync(envPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(envPath, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid env.json: ${e.message}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const doChannel = argv.includes('--channel')
    ? argv[argv.indexOf('--channel') + 1]
    : null;
  const listOnly = argv.includes('--list');

  log(`App: ${APP_ID} v${APP_VERSION}`);
  log(`Path: ${APP_ROOT}`);
  log(`API timeout: ${API_TIMEOUT_MS}ms`);
  const { api, token } = await buildApi();

  await listBuilds(api, token);
  if (listOnly) return;

  const changelog = readChangelog();
  const readme = readReadme();
  const env = readEnv();
  log(`Changelog (en): ${changelog.en.slice(0, 80)}${changelog.en.length > 80 ? '…' : ''}`);

  log(`Creating new build for ${APP_ID}@${APP_VERSION}...`);
  // IMPORTANT: AthomAppsAPI maps each named param by its `in` (path/query/body)
  // in the spec. The CLI passes version/changelog/env/readme FLAT (not nested
  // under `body:`) — see homey CLI App.js:1415-1424. Wrapping them in `body:`
  // made the API see no named params → server returned "Invalid Version: undefined".
  const created = await api.createBuild({
    $token: token,
    $timeout: API_TIMEOUT_MS,
    appId: APP_ID,
    version: APP_VERSION,
    changelog,
    env,
    readme,
  });

  const { url, method, headers, buildId } = created;
  if (!url || !buildId) {
    err('createBuild did not return an upload URL:', JSON.stringify(created));
    process.exit(1);
  }
  log(`Created build #${buildId}. Upload target ready.`);

  const existingArchive = ensureArchive();
  const archivePath = existingArchive || await packDirectory(APP_ROOT);
  const cleanupArchive = !existingArchive && archivePath && path.basename(path.dirname(archivePath)).startsWith('homey-direct-publish-');
  try {
    await uploadArchive(url, method, headers, archivePath);
  } finally {
    if (cleanupArchive) {
      try {
        fs.rmSync(path.dirname(archivePath), { recursive: true, force: true });
      } catch (cleanupErr) {
        log(`Warning: could not clean temporary archive: ${cleanupErr.message}`);
      }
    }
  }

  log('Polling Athom until the build is processed...');
  const finalBuild = await pollBuildState(api, token, buildId, {
    timeoutMs: BUILD_POLL_TIMEOUT_MS,
    intervalMs: BUILD_POLL_INTERVAL_MS,
  });
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
