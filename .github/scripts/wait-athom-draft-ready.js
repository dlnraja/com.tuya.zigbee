#!/usr/bin/env node
'use strict';

/**
 * Wait until the current app.json version is a usable Athom draft/test build.
 *
 * P139: do not bump/republish here. Soft-expect (default) soft-continues when
 * the expected version is still processing_failed after the wait window —
 * promote/verify decide next. Set HOMEY_DRAFT_FAIL_CLOSED=1 to hard-fail.
 *
 * WHY: a sibling failed build (or a first poll that sees processing_failed
 * while Athom is still creating the draft) used to exit 1 immediately and
 * skip draft→test promotion (9.0.588 #2909, 2026-08-18).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APP = process.env.APP_ID || 'com.dlnraja.tuya.zigbee';
// WHY(P2474): Athom often needs >10m for large Universal Tuya uploads; email
// "Build created" can sit without "testing" while processor flakes (socket hang up).
const MAX_MS = Number(process.env.HOMEY_DRAFT_WAIT_MS || 900000);
const STEP_MS = Number(process.env.HOMEY_DRAFT_POLL_MS || 20000);
// Early soft-continue when tip already failed with Athom transient + healthy Test.
const EARLY_FAIL_SOFT_MS = Number(process.env.HOMEY_DRAFT_EARLY_FAIL_MS || 180000);
// WHY(P2416): Stable 5.12.x patch trains can lag >8 while Athom flakes (P139);
// keep soft-continue viable without bump-loop republish.
const HEALTHY_TEST_PATCH_LAG = Number(process.env.HOMEY_HEALTHY_TEST_PATCH_LAG || 32);
const DRAFT_SOFT_EXPECT = process.env.HOMEY_DRAFT_SOFT_EXPECT !== '0'
  && process.env.HOMEY_DRAFT_FAIL_CLOSED !== '1';
const TRANSIENT_FAIL_RE = /socket hang up|econnreset|econnaborted|etimedout|fetch failed|timeout|502|503|504|network/i;

function parseSemver(v) {
  const m = String(v || '').replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

/** Patch distance when major.minor match; null if incomparable. */
function patchDistance(a, b) {
  const sa = parseSemver(a);
  const sb = parseSemver(b);
  if (!sa || !sb) return null;
  if (sa.major !== sb.major || sa.minor !== sb.minor) return null;
  return Math.abs(sa.patch - sb.patch);
}

function latestTestBuild(builds) {
  return (Array.isArray(builds) ? builds : [])
    .filter((b) => b.state === 'test')
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0] || null;
}

function healthyTestFallback(builds, expected) {
  const test = latestTestBuild(builds);
  if (!test) return null;
  const lag = patchDistance(test.version, expected);
  if (lag === null || lag > HEALTHY_TEST_PATCH_LAG) return null;
  return test;
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function versionOf() {
  // WHY(P2355): promote job checks out pre-bump SHA while Homey build may have
  // uploaded N+1 in the publish job — honor explicit expected version from CI.
  const fromEnv = String(
    process.env.HOMEY_EXPECTED_VERSION
      || process.env.HOMEY_APP_VERSION
      || process.env.EXPECTED_APP_VERSION
      || '',
  ).replace(/^v/i, '').trim();
  if (fromEnv) return fromEnv;
  try {
    return String(JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).version || '')
      .replace(/^v/i, '');
  } catch {
    return '';
  }
}

function normalizeBuild(b) {
  const stateMeta = b.stateMeta ?? b.failureDetail ?? b.error ?? b.reason ?? '';
  const metaText = typeof stateMeta === 'string'
    ? stateMeta
    : (stateMeta && typeof stateMeta === 'object'
      ? (stateMeta.message || stateMeta.error || JSON.stringify(stateMeta))
      : String(stateMeta || ''));
  return {
    id: b.id || b.buildId || b._id,
    version: String(b.version || b.appVersion || b.semver || '').replace(/^v/i, ''),
    state: String(b.state || b.channel || b.status || '').toLowerCase(),
    stateMeta: metaText,
    createdAt: b.createdAt || b.created_at || null,
  };
}

function isTransientAthomFailure(build) {
  if (!build || !isFailed(build.state)) return false;
  return TRANSIENT_FAIL_RE.test(String(build.stateMeta || ''));
}

function isReady(state) {
  return state === 'draft' || state === 'test' || state === '';
}

function isFailed(state) {
  return /fail|error|revoked/.test(String(state || ''));
}

function isProcessing(state) {
  return /process|upload|queued|pending|created/.test(String(state || ''));
}

/**
 * @param {Array<{version:string,state:string,id?:string|number}>} builds
 * @param {string} expected
 */
function classifyDraftWait(builds, expected) {
  const want = String(expected || '').replace(/^v/i, '');
  const mine = (Array.isArray(builds) ? builds : []).filter((b) => b.version === want);
  const ready = mine.filter((b) => isReady(b.state));
  const failed = mine.filter((b) => isFailed(b.state));
  const processing = mine.filter((b) => isProcessing(b.state) && !isFailed(b.state) && !isReady(b.state));
  const testHit = mine.find((b) => b.state === 'test') || ready.find((b) => b.state === 'test');
  return {
    mine,
    ready,
    failed,
    processing,
    testHit,
    latestMine: mine[0] || null,
  };
}

/**
 * @returns {'ready'|'keep-waiting'|'fail-closed'}
 */
function decideDraftWait(classified) {
  if (classified.ready.length) {return 'ready';}
  if (classified.processing.length) {return 'keep-waiting';}
  if (classified.failed.length && !classified.processing.length && !classified.ready.length) {
    return 'keep-waiting';
  }
  return 'keep-waiting';
}

/**
 * Final outcome after the wait window when expected version never became draft/test.
 * Soft-expect (default ON) avoids P139 fail-closed spam on Athom processing_failed.
 *
 * @returns {{action:'soft-continue'|'fail-closed', message:string, healthyVersion?:string}}
 */
function decideFinalDraftOutcome({
  expected,
  failed,
  allBuilds,
  listError,
  softExpect = true,
  healthyLag = HEALTHY_TEST_PATCH_LAG,
} = {}) {
  const want = String(expected || '').replace(/^v/i, '');
  const failState = failed?.state || 'processing_failed';
  const failId = failed?.id || '?';

  const fallback = (() => {
    const test = latestTestBuild(allBuilds);
    if (!test) return null;
    const lag = patchDistance(test.version, want);
    if (lag === null || lag > healthyLag) return null;
    return test;
  })();

  if (fallback) {
    return {
      action: 'soft-continue',
      healthyVersion: fallback.version,
      message: `wait-draft: P139 — v${want} still ${failState} (#${failId}) but Test healthy at v${fallback.version} #${fallback.id} (patch lag ${patchDistance(fallback.version, want)} ≤ ${healthyLag}); continue`,
    };
  }

  // WHY(P2301): Athom list token blips must not hard-fail after upload succeeded.
  if (listError || !allBuilds || allBuilds.length === 0) {
    return {
      action: 'soft-continue',
      message: `wait-draft: P139 soft-continue — v${want} saw ${failState} (#${failId}) but builds list unavailable; do not fail-closed`,
    };
  }

  // WHY(P2416): default soft-expect — leave promote/verify a chance; no bump-loop.
  if (softExpect) {
    const anyTest = latestTestBuild(allBuilds);
    return {
      action: 'soft-continue',
      healthyVersion: anyTest?.version,
      message: anyTest
        ? `wait-draft: P139 soft-expect — v${want} still ${failState} (#${failId}); keep soaking Test v${anyTest.version} #${anyTest.id} (do not fail-closed)`
        : `wait-draft: P139 soft-expect — v${want} still ${failState} (#${failId}); continue to promote/verify (do not fail-closed)`,
    };
  }

  return {
    action: 'fail-closed',
    message: `wait-draft: v${want} still ${failState} (#${failId}) after ${MAX_MS}ms — P139 fail-closed`,
  };
}

async function main() {
  const expected = versionOf();
  if (!process.env.HOMEY_PAT) {
    console.log('wait-draft: no HOMEY_PAT — sleeping 180s');
    await sleepMs(180000);
    return;
  }
  if (!expected) {
    console.log('wait-draft: no app.json version — sleeping 180s');
    await sleepMs(180000);
    return;
  }

  let getBuilds;
  let createClient;
  try {
    ({ createClient, getBuilds } = require('./homey-apps-api-client'));
  } catch (err) {
    console.log(`wait-draft: API client missing (${err.message}) — sleeping 180s`);
    await sleepMs(180000);
    return;
  }

  const started = Date.now();
  let client;
  try {
    client = await createClient({ log: console.log });
  } catch (err) {
    console.log(`wait-draft: client failed (${err.message}) — sleeping 180s`);
    await sleepMs(180000);
    return;
  }

  let lastFailed = null;
  while (Date.now() - started < MAX_MS) {
    const list = await getBuilds(client, APP, { limit: 20 }).catch((e) => {
      console.log(`wait-draft: list failed (${e.message})`);
      return [];
    });
    const builds = (Array.isArray(list) ? list : []).map(normalizeBuild);
    const classified = classifyDraftWait(builds, expected);
    lastFailed = classified.failed[0] || lastFailed;

    // Persist a fresh dashboard snapshot so local/CI recoveries aren't stuck on Sept-stale reports.
    try {
      const reportDir = path.join(ROOT, '.github', 'state');
      fs.mkdirSync(reportDir, { recursive: true });
      const latest = builds[0] || null;
      const report = {
        timestamp: new Date().toISOString(),
        appId: APP,
        source: 'wait-athom-draft-ready',
        expectedVersion: expected,
        totalBuilds: builds.length,
        latestBuild: latest,
        latestBuilds: builds.slice(0, 10),
      };
      fs.writeFileSync(path.join(reportDir, 'dashboard-monitor-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    } catch (e) {
      console.log(`wait-draft: dashboard snapshot soft: ${e.message}`);
    }

    if (classified.ready.length) {
      const ready = classified.ready.find((b) => b.state === 'test') || classified.ready[0];
      if (classified.failed.length) {
        console.log(`wait-draft: v${expected} ready as ${ready.state || 'draft'} #${ready.id} (ignoring sibling ${classified.failed[0].state} #${classified.failed[0].id})`);
      } else {
        console.log(`wait-draft: v${expected} ready as ${ready.state || 'draft'} #${ready.id}`);
      }
      return;
    }

    // WHY(P2474): socket hang up often lands in <30s — don't burn full 15m before soft-continue.
    const elapsed = Date.now() - started;
    const tipFail = classified.failed[0];
    if (
      DRAFT_SOFT_EXPECT
      && elapsed >= EARLY_FAIL_SOFT_MS
      && tipFail
      && isTransientAthomFailure(tipFail)
      && !classified.processing.length
      && !classified.ready.length
    ) {
      const decision = decideFinalDraftOutcome({
        expected,
        failed: tipFail,
        allBuilds: builds,
        softExpect: true,
        healthyLag: HEALTHY_TEST_PATCH_LAG,
      });
      console.log(`wait-draft: P2474 early soft-continue after ${elapsed}ms — ${tipFail.state} (${tipFail.stateMeta || 'n/a'})`);
      console.log(decision.message);
      if (process.env.GITHUB_OUTPUT) {
        if (decision.healthyVersion) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, `healthy_test_version=${decision.healthyVersion}\n`, 'utf8');
        }
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `processing_failed_degraded=true\n`, 'utf8');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `early_soft_continue=true\n`, 'utf8');
      }
      return;
    }

    const latest = classified.latestMine || builds[0];
    const failedNote = classified.failed[0]
      ? `; saw ${classified.failed[0].state} #${classified.failed[0].id}${classified.failed[0].stateMeta ? ` (${classified.failed[0].stateMeta})` : ''} — keep polling`
      : '';
    console.log(`wait-draft: v${expected} not ready yet (latest ${latest ? `${latest.version} ${latest.state}` : 'none'}${failedNote})`);
    await sleepMs(STEP_MS);
  }

  // After the window: fail-closed only if we still have no draft/test.
  let listError = null;
  const list = await getBuilds(client, APP, { limit: 20 }).catch((e) => {
    listError = e;
    console.log(`wait-draft: final list failed (${e?.message || e})`);
    return [];
  });
  const classified = classifyDraftWait((Array.isArray(list) ? list : []).map(normalizeBuild), expected);
  if (classified.ready.length) {
    const ready = classified.ready[0];
    console.log(`wait-draft: v${expected} ready as ${ready.state || 'draft'} #${ready.id} after timeout poll`);
    return;
  }
  const failed = classified.failed[0] || lastFailed;
  if (failed) {
    const allBuilds = (Array.isArray(list) ? list : []).map(normalizeBuild);
    const decision = decideFinalDraftOutcome({
      expected,
      failed,
      allBuilds,
      listError,
      softExpect: DRAFT_SOFT_EXPECT,
      healthyLag: HEALTHY_TEST_PATCH_LAG,
    });
    if (decision.action === 'soft-continue') {
      console.log(decision.message);
      if (process.env.GITHUB_OUTPUT) {
        if (decision.healthyVersion) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, `healthy_test_version=${decision.healthyVersion}\n`, 'utf8');
        }
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `processing_failed_degraded=true\n`, 'utf8');
      }
      return;
    }
    console.error(decision.message);
    process.exit(1);
  }
  console.log(`wait-draft: timed out after ${MAX_MS}ms — continue to promote/verify`);
}

module.exports = {
  classifyDraftWait,
  decideDraftWait,
  decideFinalDraftOutcome,
  normalizeBuild,
  isReady,
  isFailed,
  isTransientAthomFailure,
  parseSemver,
  patchDistance,
  healthyTestFallback,
  latestTestBuild,
  TRANSIENT_FAIL_RE,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
