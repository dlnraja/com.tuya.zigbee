#!/usr/bin/env node
'use strict';

/**
 * Athom `processing_failed` self-heal probe (Publish Self-Heal workflow).
 *
 * Athom builds fail randomly server-side with state `processing_failed`
 * (proven flakiness: near-identical archives, ~3 failures / 1 success). The
 * existing self-heal only catches *stuck GHA runs*; this probe catches the
 * Athom-side terminal failures.
 *
 * Decision logic (retry=true only when ALL hold):
 *   1. The latest build is in a terminal failure state.
 *   2. That failure is older than MIN_FAILURE_AGE_MS (6h) — gives the regular
 *      publish pipelines time to recover on their own first.
 *   3. No newer build has reached an active state (test/approved/...).
 *   4. Rate limit: no retry marker younger than RETRY_WINDOW_MS (24h). The
 *      marker file is persisted by the workflow via actions/cache.
 *
 * Outputs (GITHUB_OUTPUT): retry, reason, latest_build_id, latest_state,
 * latest_version, failure_age_hours. Always exits 0 — self-heal must never
 * fail its own workflow.
 *
 * Auth: HOMEY_PAT env var. Token exchange follows the same pattern as
 * scripts/check-build.js and tmp/probe2.js, but with plain HTTPS calls
 * (POST api.athom.com/delegation/token?audience=apps, then
 * GET apps-api.athom.com/api/v1/app/{id}/build) so the workflow does not
 * need `npm ci` for the homey/homey-api modules.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = process.cwd();
const FAILED_STATES = new Set(['processing_failed', 'error', 'failed', 'revoked']);
const ACTIVE_STATES = new Set(['test', 'approved', 'published', 'building', 'processing', 'uploading', 'draft']);
const TRANSIENT_RE = /socket hang up|econnreset|econnaborted|etimedout|fetch failed|network|timeout|temporar|502|503|504/i;
const MIN_FAILURE_AGE_MS = 6 * 60 * 60 * 1000;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MARKER_PATH = process.env.SELF_HEAL_MARKER
  || path.join(ROOT, '.github', 'state', 'publish-self-heal-retry.txt');
const BUILD_LIMIT = 20;
const HTTP_TIMEOUT_MS = 30000;

function log(line) {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`, 'utf8');
  }
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${String(value).replace(/[\r\n]+/g, ' ')}\n`, 'utf8');
  }
}

function publish({ retry, reason, latest = null, ageHours = '' }) {
  setOutput('retry', retry ? 'true' : 'false');
  setOutput('reason', reason);
  setOutput('latest_build_id', latest?.id ?? '');
  setOutput('latest_state', latest?.state ?? '');
  setOutput('latest_version', latest?.version ?? '');
  setOutput('failure_age_hours', ageHours);
  log(`retry=${retry ? 'true' : 'false'} — ${reason}`);
}

function request(method, hostname, urlPath, token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname,
      path: urlPath,
      method,
      timeout: HTTP_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(body); } catch { json = body; }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('timeout', () => { req.destroy(new Error('request timeout')); });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

function normalizeToken(raw) {
  if (raw && typeof raw === 'object') {
    return raw.token || raw.access_token || raw.jwt || null;
  }
  return typeof raw === 'string' && raw.length > 10 ? raw : null;
}

function normalizeBuilds(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.builds)) return raw.builds;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function buildTime(b) {
  return Date.parse(b.stateChangedAt || b.changedAt || b.createdAt || b.created || '') || 0;
}

function buildId(b) {
  return Number(b.id ?? b.buildId ?? 0);
}

function lastRetryTooRecent() {
  try {
    const ts = Number(fs.readFileSync(MARKER_PATH, 'utf8').trim());
    if (Number.isFinite(ts) && ts > 0 && Date.now() - ts < RETRY_WINDOW_MS) {
      return Math.round((Date.now() - ts) / 360000) / 10;
    }
  } catch { /* no marker yet */ }
  return null;
}

function writeMarker() {
  try {
    fs.mkdirSync(path.dirname(MARKER_PATH), { recursive: true });
    fs.writeFileSync(MARKER_PATH, `${Date.now()}\n`, 'utf8');
  } catch (e) {
    log(`⚠️ Could not write retry marker: ${e.message}`);
  }
}

async function main() {
  log('## 🩹 Athom processing_failed self-heal probe');

  const pat = process.env.HOMEY_PAT;
  if (!pat) {
    publish({ retry: false, reason: 'HOMEY_PAT not available; Athom probe skipped.' });
    return;
  }

  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const appId = appJson.id;
  if (!appId) {
    publish({ retry: false, reason: 'app.json has no id; cannot query Athom builds.' });
    return;
  }

  // 1. Exchange PAT for an apps-audience delegation token.
  const tokenRes = await request('POST', 'api.athom.com', '/delegation/token?audience=apps', pat);
  const token = normalizeToken(tokenRes.json);
  if (!token) {
    publish({ retry: false, reason: `Delegation token request failed (HTTP ${tokenRes.status}${tokenRes.error ? `, ${tokenRes.error}` : ''}).` });
    return;
  }
  log('Delegation token obtained.');

  // 2. Fetch recent builds (endpoint pattern of scripts/check-build.js / tmp/probe2.js).
  const buildsRes = await request('GET', 'apps-api.athom.com', `/api/v1/app/${appId}/build?limit=${BUILD_LIMIT}`, token);
  const builds = normalizeBuilds(buildsRes.json)
    .filter((b) => b && typeof b === 'object')
    .sort((a, b) => buildId(b) - buildId(a));
  if (!builds.length) {
    publish({ retry: false, reason: `No builds returned by Athom API (HTTP ${buildsRes.status}).` });
    return;
  }

  const latest = builds[0];
  const state = String(latest.state || '');
  log(`Latest build #${buildId(latest)} v${latest.version || '?'} state=${state} changed=${latest.stateChangedAt || latest.createdAt || '?'}`);

  // 3. Terminal failure?
  if (!FAILED_STATES.has(state)) {
    publish({ retry: false, reason: `Latest build is "${state}", not a terminal failure.`, latest });
    return;
  }

  const failureDetail = String(
    latest.failureDetail || latest.stateMeta || latest.error || latest.errorMessage || '',
  );
  const transient = TRANSIENT_RE.test(failureDetail);

  // P139: shared App ID — if ANY recent build is already on Test, do not
  // republish (especially not Publish Stable→Test which can overwrite master).
  const healthyTest = builds.find((b) => String(b.state || '') === 'test');
  if (healthyTest) {
    publish({
      retry: false,
      reason: `Test channel already has healthy v${healthyTest.version || '?'} (#${buildId(healthyTest)}); refusing self-heal republish (shared App ID; latest failure=${state}${transient ? ', transient' : ''}).`,
      latest,
    });
    return;
  }

  // P139: socket hang up / Athom processor flakes are not fixed by more uploads.
  if (transient) {
    publish({
      retry: false,
      reason: `Latest failure is Athom-transient (${failureDetail || 'socket hang up'}); bump/republish loops do not help. Wait for Athom or a single human-triggered publish.`,
      latest,
    });
    return;
  }

  // 4. Failure older than 6h?
  const failedAt = buildTime(latest);
  if (!failedAt) {
    publish({ retry: false, reason: 'Failure timestamp unparseable; refusing blind retry.', latest });
    return;
  }
  const ageMs = Date.now() - failedAt;
  const ageHours = Math.round(ageMs / 360000) / 10;
  if (ageMs < MIN_FAILURE_AGE_MS) {
    publish({ retry: false, reason: `Failure is only ${ageHours}h old (<6h); publish pipelines may still recover.`, latest, ageHours });
    return;
  }

  // 5. Newer build already active?
  const newerActive = builds.find((b) => buildId(b) > buildId(latest) && ACTIVE_STATES.has(String(b.state || '')));
  if (newerActive) {
    publish({ retry: false, reason: `Newer build #${buildId(newerActive)} is "${newerActive.state}"; no retry needed.`, latest, ageHours });
    return;
  }

  // 6. Rate limit: max 1 retry per 24h.
  const sinceLast = lastRetryTooRecent();
  if (sinceLast !== null) {
    publish({ retry: false, reason: `Rate limited: a retry was already triggered ${sinceLast}h ago (max 1/24h).`, latest, ageHours });
    return;
  }

  writeMarker();
  publish({
    retry: true,
    reason: `Latest build #${buildId(latest)} v${latest.version || '?'} is ${state} for ${ageHours}h (>6h), no healthy Test build — single self-heal re-trigger.`,
    latest,
    ageHours,
  });
}

main().catch((e) => {
  publish({ retry: false, reason: `Probe crashed: ${e.message}` });
});
