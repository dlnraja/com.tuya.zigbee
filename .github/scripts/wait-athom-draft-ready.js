#!/usr/bin/env node
'use strict';

/**
 * Wait until the current app.json version is a usable Athom draft/test build.
 *
 * P139: do not bump/republish here. Fail-closed only after the wait window if
 * the expected version is still processing_failed AND no draft/test exists.
 *
 * WHY: a sibling failed build (or a first poll that sees processing_failed
 * while Athom is still creating the draft) used to exit 1 immediately and
 * skip draft→test promotion (9.0.588 #2909, 2026-08-18).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APP = process.env.APP_ID || 'com.dlnraja.tuya.zigbee';
const MAX_MS = Number(process.env.HOMEY_DRAFT_WAIT_MS || 240000);
const STEP_MS = Number(process.env.HOMEY_DRAFT_POLL_MS || 20000);
const HEALTHY_TEST_PATCH_LAG = Number(process.env.HOMEY_HEALTHY_TEST_PATCH_LAG || 3);

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
  try {
    return String(JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).version || '')
      .replace(/^v/i, '');
  } catch {
    return '';
  }
}

function normalizeBuild(b) {
  return {
    id: b.id || b.buildId || b._id,
    version: String(b.version || b.appVersion || b.semver || '').replace(/^v/i, ''),
    state: String(b.state || b.channel || b.status || '').toLowerCase(),
  };
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

    if (classified.ready.length) {
      const ready = classified.ready.find((b) => b.state === 'test') || classified.ready[0];
      if (classified.failed.length) {
        console.log(`wait-draft: v${expected} ready as ${ready.state || 'draft'} #${ready.id} (ignoring sibling ${classified.failed[0].state} #${classified.failed[0].id})`);
      } else {
        console.log(`wait-draft: v${expected} ready as ${ready.state || 'draft'} #${ready.id}`);
      }
      return;
    }

    const latest = classified.latestMine || builds[0];
    const failedNote = classified.failed[0]
      ? `; saw ${classified.failed[0].state} #${classified.failed[0].id} — keep polling`
      : '';
    console.log(`wait-draft: v${expected} not ready yet (latest ${latest ? `${latest.version} ${latest.state}` : 'none'}${failedNote})`);
    await sleepMs(STEP_MS);
  }

  // After the window: fail-closed only if we still have no draft/test.
  const list = await getBuilds(client, APP, { limit: 20 }).catch(() => []);
  const classified = classifyDraftWait((Array.isArray(list) ? list : []).map(normalizeBuild), expected);
  if (classified.ready.length) {
    const ready = classified.ready[0];
    console.log(`wait-draft: v${expected} ready as ${ready.state || 'draft'} #${ready.id} after timeout poll`);
    return;
  }
  const failed = classified.failed[0] || lastFailed;
  if (failed) {
    const allBuilds = (Array.isArray(list) ? list : []).map(normalizeBuild);
    const fallback = healthyTestFallback(allBuilds, expected);
    if (fallback) {
      console.log(`wait-draft: P139 — v${expected} still ${failed.state} (#${failed.id}) but Test healthy at v${fallback.version} #${fallback.id} (patch lag ${patchDistance(fallback.version, expected)} ≤ ${HEALTHY_TEST_PATCH_LAG}); continue`);
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `healthy_test_version=${fallback.version}\n`, 'utf8');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `processing_failed_degraded=true\n`, 'utf8');
      }
      return;
    }
    console.error(`wait-draft: v${expected} still ${failed.state} (#${failed.id}) after ${MAX_MS}ms — P139 fail-closed`);
    process.exit(1);
  }
  console.log(`wait-draft: timed out after ${MAX_MS}ms — continue to promote/verify`);
}

module.exports = {
  classifyDraftWait,
  decideDraftWait,
  normalizeBuild,
  isReady,
  isFailed,
  parseSemver,
  patchDistance,
  healthyTestFallback,
  latestTestBuild,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
